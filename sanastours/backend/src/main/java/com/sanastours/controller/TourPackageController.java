package com.sanastours.controller;

import com.sanastours.entity.TourPackage;
import com.sanastours.repository.TourPackageRepository;
import com.sanastours.util.Validation;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/packages")
public class TourPackageController {

    @Autowired
    private TourPackageRepository tourPackageRepository;

    @GetMapping
    public List<TourPackage> getAllPackages() {
        return tourPackageRepository.findAll();
    }

    /**
     * Fix 6.10: this was a bare repository save() on a client-supplied string
     * primary key, so entering an existing Package ID silently overwrote that
     * package instead of reporting a duplicate - and an empty ID was saved as a
     * row with an empty primary key.
     */
    @PostMapping
    public ResponseEntity<?> addPackage(@RequestBody TourPackage tourPackage) {
        String error = validate(tourPackage, true);
        if (error != null) return ResponseEntity.badRequest().body(error);

        String id = tourPackage.getPackageId().trim();
        if (tourPackageRepository.findById(id).isPresent()) {
            return ResponseEntity.badRequest().body(
                    "A tour package with ID " + id + " already exists. Use a different ID, or edit that package.");
        }

        tourPackage.setPackageId(id);
        tourPackage.setPackageName(tourPackage.getPackageName().trim());
        if (tourPackage.getPackageStatus() == null) tourPackage.setPackageStatus("Active");

        return ResponseEntity.ok(tourPackageRepository.save(tourPackage));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deletePackage(@PathVariable String id) {
        if (tourPackageRepository.findById(id).isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        try {
            tourPackageRepository.deleteById(id);
            return ResponseEntity.ok("Deleted");
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body("Cannot delete this package because it is currently linked to existing bookings or destinations.");
        } catch (Exception e) {
            // Fix: no longer echoes the raw exception message to the client.
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to delete the package. Please try again.");
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updatePackage(@PathVariable String id, @RequestBody TourPackage packageDetails) {
        TourPackage tourPackage = tourPackageRepository.findById(id).orElse(null);
        if (tourPackage == null) return ResponseEntity.badRequest().body("Package not found");

        String error = validate(packageDetails, false);
        if (error != null) return ResponseEntity.badRequest().body(error);

        tourPackage.setPackageName(packageDetails.getPackageName().trim());
        tourPackage.setDescription(packageDetails.getDescription());
        tourPackage.setDurationDays(packageDetails.getDurationDays());
        tourPackage.setPrice(packageDetails.getPrice());
        tourPackage.setImageUrl(packageDetails.getImageUrl());
        if (packageDetails.getPackageStatus() != null) {
            tourPackage.setPackageStatus(packageDetails.getPackageStatus());
        }

        return ResponseEntity.ok(tourPackageRepository.save(tourPackage));
    }

    /** Fix 7.8: the package form had no validation of any kind. */
    private String validate(TourPackage tourPackage, boolean requireId) {
        if (requireId) {
            if (tourPackage.getPackageId() == null || tourPackage.getPackageId().isBlank()) {
                return "Package ID is required.";
            }
            if (tourPackage.getPackageId().trim().length() > 10) {
                return "Package ID can be at most 10 characters.";
            }
        }
        if (tourPackage.getPackageName() == null || tourPackage.getPackageName().isBlank()) {
            return "Package name is required.";
        }
        if (tourPackage.getDescription() == null || tourPackage.getDescription().isBlank()) {
            return "Description is required.";
        }
        if (tourPackage.getDurationDays() == null || tourPackage.getDurationDays() < 1
                || tourPackage.getDurationDays() > 365) {
            return "Duration must be between 1 and 365 days.";
        }
        BigDecimal price = tourPackage.getPrice();
        if (price == null || !Validation.isPositive(price)) {
            return "Base price must be greater than zero.";
        }
        if (tourPackage.getPackageStatus() != null
                && !Validation.isOneOf(tourPackage.getPackageStatus(), List.of("Active", "Inactive"))) {
            return "Unknown package status: " + tourPackage.getPackageStatus();
        }
        return null;
    }
}
