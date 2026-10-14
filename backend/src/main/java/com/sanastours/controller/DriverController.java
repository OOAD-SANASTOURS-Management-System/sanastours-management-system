package com.sanastours.controller;

import com.sanastours.entity.Driver;
import com.sanastours.repository.DriverRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import com.sanastours.dto.DriverRegisterRequest;
import com.sanastours.entity.User;
import com.sanastours.repository.UserRepository;
import com.sanastours.security.CurrentUser;
import com.sanastours.util.Validation;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;

@RestController
@RequestMapping("/api/drivers")
public class DriverController {

    @Autowired
    private DriverRepository driverRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CurrentUser currentUser;

    @GetMapping
    public List<Driver> getAllDrivers() {
        return driverRepository.findAll();
    }

    @GetMapping("/me")
    public ResponseEntity<?> getMyProfile() {
        if (currentUser.isDriver()) {
            Integer driverId = currentUser.roleId();
            Driver driver = driverId == null ? null : driverRepository.findById(driverId).orElse(null);
            if (driver == null) return ResponseEntity.notFound().build();
            return ResponseEntity.ok(driver);
        }
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access denied");
    }

    @Autowired
    private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    @PostMapping
    @Transactional
    public ResponseEntity<?> addDriver(@RequestBody DriverRegisterRequest request) {
        String username = request.getUsername() == null ? null : request.getUsername().trim();
        String email = request.getEmail() == null ? null : request.getEmail().trim();

        if (username == null || username.isEmpty()) {
            return ResponseEntity.badRequest().body("Username is required.");
        }
        String passwordError = Validation.checkPassword(request.getPassword());
        if (passwordError != null) {
            return ResponseEntity.badRequest().body(passwordError);
        }

        // Fix 3.2: the Add Driver form labelled Email "(Optional)", but
        // user.email is NOT NULL UNIQUE, so saving without one threw a
        // constraint error that surfaced as an unhandled 500 - and two drivers
        // with a blank email collided with each other.
        if (email == null || email.isEmpty()) {
            return ResponseEntity.badRequest().body("Email address is required to create a driver login.");
        }
        if (!Validation.isEmail(email)) {
            return ResponseEntity.badRequest().body("Please enter a valid email address.");
        }

        String validationError = validateDriverFields(request, true);
        if (validationError != null) return ResponseEntity.badRequest().body(validationError);

        if (userRepository.findByUsername(username).isPresent()) {
            return ResponseEntity.badRequest().body("Username is already taken.");
        }
        // Fix 3.3: nic, license_number and email are all UNIQUE in the schema,
        // but only the username was checked, so duplicates surfaced as a 500.
        if (userRepository.findByEmail(email).isPresent()) {
            return ResponseEntity.badRequest().body("That email address is already registered.");
        }
        for (Driver existing : driverRepository.findAll()) {
            if (request.getNic() != null && request.getNic().equalsIgnoreCase(existing.getNic())) {
                return ResponseEntity.badRequest().body("A driver with that NIC already exists.");
            }
            if (request.getLicenseNumber() != null
                    && request.getLicenseNumber().equalsIgnoreCase(existing.getLicenseNumber())) {
                return ResponseEntity.badRequest().body("A driver with that licence number already exists.");
            }
        }

        User user = new User();
        user.setUsername(username);
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setEmail(email);
        user.setRole("DRIVER");
        User savedUser = userRepository.save(user);

        Driver driver = new Driver();
        driver.setUser(savedUser);
        applyFields(driver, request);
        driver.setDriverStatus(request.getDriverStatus() != null ? request.getDriverStatus() : "Available");

        return ResponseEntity.ok(driverRepository.save(driver));
    }

    /**
     * Fix 3.4: this deleted the driver row but left the linked user row behind.
     * The orphaned account could still log in, and because login then fell back
     * to the user id as the role id, the ex-driver was handed another driver's
     * data. The login now goes with the profile.
     */
    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<?> deleteDriver(@PathVariable Integer id) {
        Driver driver = driverRepository.findById(id).orElse(null);
        if (driver == null) return ResponseEntity.notFound().build();

        try {
            User user = driver.getUser();
            driverRepository.delete(driver);
            driverRepository.flush();
            if (user != null) {
                userRepository.delete(user);
            }
            return ResponseEntity.ok("Deleted");
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            // Fix 5.15: bookings reference the driver too, not only trips.
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body("Cannot delete this driver because they are still assigned to bookings or trips. "
                          + "Set their status to Inactive instead.");
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateDriver(@PathVariable Integer id, @RequestBody DriverRegisterRequest details) {
        Driver driver = driverRepository.findById(id).orElse(null);
        if (driver == null) return ResponseEntity.badRequest().body("Driver not found");

        // An expired licence does not block editing the rest of the profile -
        // it is caught when the driver is assigned to a booking or a trip.
        String validationError = validateDriverFields(details, false);
        if (validationError != null) return ResponseEntity.badRequest().body(validationError);

        // Fix 3.3: keep NIC and licence number unique on edit as well.
        for (Driver existing : driverRepository.findAll()) {
            if (existing.getDriverId().equals(id)) continue;
            if (details.getNic() != null && details.getNic().equalsIgnoreCase(existing.getNic())) {
                return ResponseEntity.badRequest().body("Another driver already has that NIC.");
            }
            if (details.getLicenseNumber() != null
                    && details.getLicenseNumber().equalsIgnoreCase(existing.getLicenseNumber())) {
                return ResponseEntity.badRequest().body("Another driver already has that licence number.");
            }
        }

        applyFields(driver, details);
        if (details.getDriverStatus() != null) driver.setDriverStatus(details.getDriverStatus());

        // Note: username and password live on the User entity and are managed
        // separately; this endpoint only updates the driver profile.
        return ResponseEntity.ok(driverRepository.save(driver));
    }

    private void applyFields(Driver driver, DriverRegisterRequest request) {
        driver.setDriverName(request.getDriverName().trim());
        driver.setNic(request.getNic() == null ? null : request.getNic().trim());
        driver.setPhone(request.getPhone());
        driver.setLicenseNumber(request.getLicenseNumber().trim());
        driver.setLicenseExpiryDate(request.getLicenseExpiryDate());
        driver.setExperienceYears(request.getExperienceYears());
        driver.setNotes(request.getNotes());
    }

    /** Fixes 7.10 and 7.12, which had no checks before. */
    private String validateDriverFields(DriverRegisterRequest request, boolean requireValidLicence) {
        if (request.getDriverName() == null || request.getDriverName().isBlank()) {
            return "Driver name is required.";
        }
        if (request.getLicenseNumber() == null || request.getLicenseNumber().isBlank()) {
            return "Licence number is required.";
        }
        if (request.getNic() == null || request.getNic().isBlank()) {
            return "NIC number is required.";
        }
        if (request.getPhone() != null && !request.getPhone().isBlank() && !Validation.isPhone(request.getPhone())) {
            return "Please enter a valid phone number.";
        }
        // Fix 7.10: a licence that has already expired was accepted.
        if (request.getLicenseExpiryDate() == null) {
            return "Licence expiry date is required.";
        }
        if (requireValidLicence && request.getLicenseExpiryDate().isBefore(java.time.LocalDate.now())) {
            return "That licence expired on " + request.getLicenseExpiryDate() + ".";
        }
        if (request.getExperienceYears() != null
                && (request.getExperienceYears() < 0 || request.getExperienceYears() > 70)) {
            return "Years of experience must be between 0 and 70.";
        }
        if (request.getDriverStatus() != null
                && !Validation.isOneOf(request.getDriverStatus(), Validation.DRIVER_STATUSES)) {
            return "Unknown driver status: " + request.getDriverStatus();
        }
        return null;
    }
}
