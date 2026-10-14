package com.sanastours.controller;

import com.sanastours.dto.AuthRequest;
import com.sanastours.dto.AuthResponse;
import com.sanastours.dto.RegisterRequest;
import com.sanastours.entity.Customer;
import com.sanastours.entity.Driver;
import com.sanastours.entity.User;
import com.sanastours.repository.CustomerRepository;
import com.sanastours.repository.DriverRepository;
import com.sanastours.repository.UserRepository;
import com.sanastours.util.Validation;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private DriverRepository driverRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private com.sanastours.security.JwtUtil jwtUtil;

    @Autowired
    private com.sanastours.security.LoginAttemptService loginAttempts;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody AuthRequest request) {
        if (request.getUsername() == null || request.getUsername().isBlank()
                || request.getPassword() == null || request.getPassword().isEmpty()) {
            return ResponseEntity.badRequest().body("Please enter your username and password.");
        }

        String identifier = request.getUsername().trim();

        // Fix 3.11: there was no rate limiting or lockout on login at all.
        long lockedFor = loginAttempts.lockedForSeconds(identifier);
        if (lockedFor > 0) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .body("Too many failed sign-in attempts. Please try again in "
                      + ((lockedFor / 60) + 1) + " minute(s).");
        }

        Optional<User> userOpt = userRepository.findByUsername(identifier);
        if (userOpt.isEmpty()) {
            userOpt = userRepository.findByEmail(identifier);
        }

        if (userOpt.isPresent()) {
            User user = userOpt.get();

            if (!"ACTIVE".equalsIgnoreCase(user.getAccountStatus())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Account is suspended or inactive.");
            }

            if (passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
                Integer roleId = user.getUserId(); // Admin / coordinator

                if ("CUSTOMER".equals(user.getRole())) {
                    Optional<Customer> cust = customerRepository.findByUser_UserId(user.getUserId());
                    // Fix 3.5: the old code silently fell back to the user id
                    // when no profile row existed, which handed the caller
                    // another customer's or driver's id and therefore their
                    // data. Refuse the login instead.
                    if (cust.isEmpty()) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body("This account has no customer profile. Please contact support.");
                    }
                    // Fix 3.1: honour a suspended customer profile as well as a
                    // suspended login.
                    if (!"Active".equalsIgnoreCase(cust.get().getAccountStatus())) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body("Account is suspended or inactive.");
                    }
                    roleId = cust.get().getCustomerId();
                } else if ("DRIVER".equals(user.getRole())) {
                    Optional<Driver> driver = driverRepository.findByUser_UserId(user.getUserId());
                    if (driver.isEmpty()) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body("This account has no driver profile. Please contact support.");
                    }
                    roleId = driver.get().getDriverId();
                }

                loginAttempts.recordSuccess(identifier);
                String token = jwtUtil.generateToken(user.getUsername(), user.getRole(), roleId);

                return ResponseEntity.ok(new AuthResponse(token, user.getRole(), roleId, user.getUsername()));
            }
        }
        loginAttempts.recordFailure(identifier);
        return ResponseEntity.badRequest().body("Invalid username or password");
    }

    @PostMapping("/register")
    @Transactional
    public ResponseEntity<?> registerCustomer(@RequestBody RegisterRequest request) {
        // Fix 3.6: the registration endpoint had no validation whatsoever - no
        // password rule, no email check, no required fields.
        String email = request.getEmail() == null ? null : request.getEmail().trim();
        String username = request.getUsername() == null ? null : request.getUsername().trim();

        if (username == null || username.isEmpty()) {
            return ResponseEntity.badRequest().body("Username is required.");
        }
        if (email == null || email.isEmpty()) {
            return ResponseEntity.badRequest().body("Email address is required.");
        }
        if (!Validation.isEmail(email)) {
            return ResponseEntity.badRequest().body("Please enter a valid email address.");
        }
        if (request.getFirstName() == null || request.getFirstName().isBlank()
                || request.getLastName() == null || request.getLastName().isBlank()) {
            return ResponseEntity.badRequest().body("First name and last name are required.");
        }
        if (request.getPhone() != null && !request.getPhone().isBlank() && !Validation.isPhone(request.getPhone())) {
            return ResponseEntity.badRequest().body("Please enter a valid phone number.");
        }
        String passwordError = Validation.checkPassword(request.getPassword());
        if (passwordError != null) {
            return ResponseEntity.badRequest().body(passwordError);
        }

        if (userRepository.findByUsername(username).isPresent()) {
            return ResponseEntity.badRequest().body("Username is already taken.");
        }
        if (userRepository.findByEmail(email).isPresent()) {
            return ResponseEntity.badRequest().body("Email is already registered.");
        }
        // The username doubles as a login identifier, so it must not collide
        // with somebody else's email either.
        if (!username.equalsIgnoreCase(email) && userRepository.findByEmail(username).isPresent()) {
            return ResponseEntity.badRequest().body("Username is already taken.");
        }

        User newUser = new User();
        newUser.setUsername(username);
        newUser.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        newUser.setEmail(email);
        newUser.setRole("CUSTOMER");

        User savedUser = userRepository.save(newUser);

        Customer customer = new Customer();
        customer.setUser(savedUser);
        customer.setFirstName(request.getFirstName().trim());
        customer.setLastName(request.getLastName().trim());
        customer.setPhone(request.getPhone());
        customer.setAddress(request.getAddress());
        customer.setCountry(request.getCountry());

        customerRepository.save(customer);

        return ResponseEntity.ok("Registration successful! You can now log in.");
    }
}
