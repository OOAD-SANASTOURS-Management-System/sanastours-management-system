package com.sanastours.controller;

import com.sanastours.entity.Vehicle;
import com.sanastours.repository.VehicleRepository;
import com.sanastours.util.Validation;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/vehicles")
public class VehicleController {

    @Autowired
    private VehicleRepository vehicleRepository;

    @GetMapping
    public List<Vehicle> getAllVehicles() {
        return vehicleRepository.findAll();
    }

    @PostMapping
    public ResponseEntity<?> addVehicle(@RequestBody Vehicle vehicle) {
        String error = validate(vehicle);
        if (error != null) return ResponseEntity.badRequest().body(error);

        // Fix 6.11: registration_no is UNIQUE, but nothing checked for a
        // duplicate, so entering an existing registration produced an
        // unhandled 500 rather than a message.
        String duplicate = findDuplicateRegistration(vehicle.getRegistrationNo(), null);
        if (duplicate != null) return ResponseEntity.badRequest().body(duplicate);

        normalize(vehicle);
        if (vehicle.getVehicleStatus() == null) vehicle.setVehicleStatus("Available");
        return ResponseEntity.ok(vehicleRepository.save(vehicle));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteVehicle(@PathVariable Integer id) {
        if (!vehicleRepository.existsById(id)) return ResponseEntity.notFound().build();
        try {
            vehicleRepository.deleteById(id);
            return ResponseEntity.ok("Deleted");
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            // Fix 5.15: bookings reference the vehicle as well as trips.
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body("Cannot delete this vehicle because it is still assigned to bookings or trips. "
                          + "Set its status to Inactive instead.");
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateVehicle(@PathVariable Integer id, @RequestBody Vehicle details) {
        Vehicle vehicle = vehicleRepository.findById(id).orElse(null);
        if (vehicle == null) return ResponseEntity.badRequest().body("Vehicle not found");

        String error = validate(details);
        if (error != null) return ResponseEntity.badRequest().body(error);

        String duplicate = findDuplicateRegistration(details.getRegistrationNo(), id);
        if (duplicate != null) return ResponseEntity.badRequest().body(duplicate);

        vehicle.setRegistrationNo(details.getRegistrationNo().trim().toUpperCase());
        vehicle.setModel(details.getModel().trim());
        vehicle.setVehicleType(details.getVehicleType());
        vehicle.setCapacity(details.getCapacity());
        if (details.getVehicleStatus() != null) vehicle.setVehicleStatus(details.getVehicleStatus());
        vehicle.setNotes(details.getNotes());

        return ResponseEntity.ok(vehicleRepository.save(vehicle));
    }

    private void normalize(Vehicle vehicle) {
        vehicle.setRegistrationNo(vehicle.getRegistrationNo().trim().toUpperCase());
        vehicle.setModel(vehicle.getModel().trim());
    }

    private String findDuplicateRegistration(String registrationNo, Integer ignoreId) {
        String candidate = registrationNo.trim();
        for (Vehicle existing : vehicleRepository.findAll()) {
            if (ignoreId != null && existing.getVehicleId().equals(ignoreId)) continue;
            if (existing.getRegistrationNo() != null && existing.getRegistrationNo().trim().equalsIgnoreCase(candidate)) {
                return "A vehicle with registration " + candidate + " already exists.";
            }
        }
        return null;
    }

    /** Fixes 7.12 and 7.13 for vehicles, which had no validation at all. */
    private String validate(Vehicle vehicle) {
        if (vehicle.getRegistrationNo() == null || vehicle.getRegistrationNo().isBlank()) {
            return "Registration number is required.";
        }
        if (vehicle.getModel() == null || vehicle.getModel().isBlank()) {
            return "Vehicle model is required.";
        }
        if (vehicle.getCapacity() == null || vehicle.getCapacity() < 1 || vehicle.getCapacity() > 100) {
            return "Capacity must be between 1 and 100 passengers.";
        }
        if (vehicle.getVehicleType() == null || vehicle.getVehicleType().isBlank()) {
            return "Vehicle type is required.";
        }
        if (vehicle.getVehicleStatus() != null
                && !Validation.isOneOf(vehicle.getVehicleStatus(), Validation.VEHICLE_STATUSES)) {
            return "Unknown vehicle status: " + vehicle.getVehicleStatus();
        }
        return null;
    }
}
