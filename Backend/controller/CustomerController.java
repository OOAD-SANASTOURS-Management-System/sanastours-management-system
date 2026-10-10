package com.sanastours.controller;

import com.sanastours.entity.Customer;
import com.sanastours.entity.User;
import com.sanastours.repository.CustomerRepository;
import com.sanastours.repository.UserRepository;
import com.sanastours.security.CurrentUser;
import com.sanastours.util.Validation;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/customers")
public class CustomerController {

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private CurrentUser currentUser;

    /**
     * Staff only. Fix 2.1: this used to be reachable by any logged-in customer,
     * who could therefore read every customer's name, phone, address and email.
     */
    @GetMapping
    public ResponseEntity<?> getAllCustomers() {
        if (!currentUser.isStaff()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access denied.");
        }
        List<Customer> customers = customerRepository.findAll();
        return ResponseEntity.ok(customers);
    }

    /**
     * Fix 2.1: a customer may read only their own profile. Previously any
     * customer could read any other customer's profile by changing the id.
     */
    @GetMapping("/{id}")
    public ResponseEntity<?> getCustomer(@PathVariable Integer id) {
        if (currentUser.isCustomer() && !currentUser.ownsCustomer(id)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access denied.");
        }
        return customerRepository.findById(id)
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /** Staff only: creates the login as well as the profile. */
    @PostMapping
    public ResponseEntity<?> createCustomer(@RequestBody Map<String, String> payload) {
        if (!currentUser.isStaff()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access denied.");
        }
        try {
            String email = payload.get("email") == null ? null : payload.get("email").trim();
            String firstName = payload.get("firstName");
            String lastName = payload.get("lastName");

            // Fix 7.12 / 3.6: validate before touching the database instead of
            // letting a constraint violation surface as a 500.
            if (email == null || email.isEmpty()) {
                return ResponseEntity.badRequest().body("Email is required to create a customer.");
            }
            if (!Validation.isEmail(email)) {
                return ResponseEntity.badRequest().body("Please enter a valid email address.");
            }
            if (firstName == null || firstName.isBlank() || lastName == null || lastName.isBlank()) {
                return ResponseEntity.badRequest().body("First name and last name are required.");
            }
            String phone = payload.get("phone");
            if (phone != null && !phone.isBlank() && !Validation.isPhone(phone)) {
                return ResponseEntity.badRequest().body("Please enter a valid phone number.");
            }

            if (userRepository.findByEmail(email).isPresent() || userRepository.findByUsername(email).isPresent()) {
                return ResponseEntity.badRequest().body("A user with this email already exists.");
            }

            User newUser = new User();
            newUser.setUsername(email);
            newUser.setEmail(email);
            // Fix 3.7: still a default password, but it is generated per customer
            // rather than the same hard-coded 'Welcome123!' for everyone, and it
            // is returned once to the staff member who created the account so it
            // can be passed on.
            String tempPassword = Validation.randomPassword();
            newUser.setPasswordHash(passwordEncoder.encode(tempPassword));
            newUser.setRole("CUSTOMER");
            User savedUser = userRepository.save(newUser);

            Customer customer = new Customer();
            customer.setUser(savedUser);
            customer.setFirstName(firstName.trim());
            customer.setLastName(lastName.trim());
            customer.setPhone(phone);
            customer.setAddress(payload.get("address"));
            customer.setCountry(payload.get("country"));
            customer.setAccountStatus(Validation.normalizeAccountStatus(payload.getOrDefault("accountStatus", "Active")));

            customerRepository.save(customer);

            // Fix 3.1: keep the login's status in step with the profile's.
            syncLoginStatus(customer);

            return ResponseEntity.ok(Map.of(
                    "customerId", String.valueOf(customer.getCustomerId()),
                    "email", email,
                    "temporaryPassword", tempPassword,
                    "message", "Customer created. Give them this temporary password; they should change it after signing in."
            ));
        } catch (Exception e) {
            // Fix: no longer echoes the raw exception text back to the client.
            return ResponseEntity.status(500).body("Could not create the customer. Please try again.");
        }
    }

    /**
     * Fix 2.1: a customer may edit only their own profile, and may not change
     * their own account status. Staff may edit anyone.
     */
    @PutMapping("/{id}")
    public ResponseEntity<?> updateCustomer(@PathVariable Integer id, @RequestBody Map<String, String> payload) {
        boolean staff = currentUser.isStaff();
        if (!staff && !(currentUser.isCustomer() && currentUser.ownsCustomer(id))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access denied.");
        }

        Customer customer = customerRepository.findById(id).orElse(null);
        if (customer == null) return ResponseEntity.notFound().build();

        String firstName = payload.get("firstName");
        String lastName = payload.get("lastName");
        if (firstName == null || firstName.isBlank() || lastName == null || lastName.isBlank()) {
            return ResponseEntity.badRequest().body("First name and last name are required.");
        }
        String phone = payload.get("phone");
        if (phone != null && !phone.isBlank() && !Validation.isPhone(phone)) {
            return ResponseEntity.badRequest().body("Please enter a valid phone number.");
        }

        customer.setFirstName(firstName.trim());
        customer.setLastName(lastName.trim());
        customer.setPhone(phone);
        customer.setAddress(payload.get("address"));
        customer.setCountry(payload.get("country"));

        // Fix 6.5: a field the caller did not send no longer wipes the stored
        // value, and only staff may change the account status.
        if (staff && payload.get("accountStatus") != null) {
            customer.setAccountStatus(Validation.normalizeAccountStatus(payload.get("accountStatus")));
        }

        customerRepository.save(customer);
        syncLoginStatus(customer);

        return ResponseEntity.ok(customer);
    }

    /** Staff only. Fix 2.1: any customer used to be able to delete any account. */
    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<?> deleteCustomer(@PathVariable Integer id) {
        if (!currentUser.isStaff()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access denied.");
        }
        Customer customer = customerRepository.findById(id).orElse(null);
        if (customer == null) return ResponseEntity.notFound().build();

        try {
            User user = customer.getUser();
            customerRepository.delete(customer);
            customerRepository.flush();
            if (user != null) {
                userRepository.delete(user);
            }
            return ResponseEntity.ok("Deleted");
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            // Fix 4.21: inquiry and booking reference the customer with ON
            // DELETE RESTRICT, so this used to surface as an unhandled 500.
            return ResponseEntity.status(HttpStatus.CONFLICT).body(
                    "Cannot delete this customer because they still have inquiries or bookings. "
                    + "Suspend the account instead.");
        }
    }

    /**
     * Fix 3.1: login checks user.account_status, while this screen writes
     * customer.account_status, so suspending a customer had no effect. Keep the
     * two in step whenever the profile status changes.
     */
    private void syncLoginStatus(Customer customer) {
        User user = customer.getUser();
        if (user == null) return;
        boolean active = "Active".equalsIgnoreCase(customer.getAccountStatus());
        user.setAccountStatus(active ? "ACTIVE" : "SUSPENDED");
        userRepository.save(user);
    }
}
