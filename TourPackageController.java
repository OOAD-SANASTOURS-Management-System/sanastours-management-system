package com.sanastours.sanastoursbackendnew.controller;

import com.sanastours.sanastoursbackendnew.model.TourPackage;
import com.sanastours.sanastoursbackendnew.service.TourPackageService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tour-packages")
@CrossOrigin(origins = "*")
public class TourPackageController {

    private final TourPackageService tourPackageService;

    public TourPackageController(
            TourPackageService tourPackageService) {

        this.tourPackageService =
                tourPackageService;
    }

    // Create package
    @PostMapping
    public TourPackage createTourPackage(
            @RequestBody TourPackage tourPackage) {

        return tourPackageService
                .createTourPackage(tourPackage);
    }

    // Get all packages
    @GetMapping
    public List<TourPackage> getAllTourPackages() {

        return tourPackageService
                .getAllTourPackages();
    }

    // Get package by ID
    @GetMapping("/{packageId}")
    public ResponseEntity<TourPackage> getTourPackageById(
            @PathVariable String packageId) {

        return tourPackageService
                .getTourPackageById(packageId)
                .map(ResponseEntity::ok)
                .orElse(
                        ResponseEntity
                                .notFound()
                                .build());
    }

    // Get packages by status
    @GetMapping("/status/{status}")
    public List<TourPackage> getTourPackagesByStatus(
            @PathVariable
            TourPackage.PackageStatus status) {

        return tourPackageService
                .getTourPackagesByStatus(status);
    }

    // Search package by name
    @GetMapping("/search")
    public List<TourPackage> searchTourPackages(
            @RequestParam String name) {

        return tourPackageService
                .searchTourPackages(name);
    }

    // Update package
    @PutMapping("/{packageId}")
    public ResponseEntity<TourPackage> updateTourPackage(
            @PathVariable String packageId,
            @RequestBody TourPackage tourPackage) {

        try {

            TourPackage updated =
                    tourPackageService
                            .updateTourPackage(
                                    packageId,
                                    tourPackage);

            return ResponseEntity.ok(updated);

        } catch (RuntimeException e) {

            return ResponseEntity
                    .notFound()
                    .build();
        }
    }

    // Delete package
    @DeleteMapping("/{packageId}")
    public ResponseEntity<Void> deleteTourPackage(
            @PathVariable String packageId) {

        try {

            tourPackageService
                    .deleteTourPackage(packageId);

            return ResponseEntity
                    .noContent()
                    .build();

        } catch (RuntimeException e) {

            return ResponseEntity
                    .notFound()
                    .build();
        }
    }
}