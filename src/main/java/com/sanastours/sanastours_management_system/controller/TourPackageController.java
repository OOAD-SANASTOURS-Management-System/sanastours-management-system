package com.sanastours.sanastours_management_system.controller;

import com.sanastours.sanastours_management_system.model.TourPackage;
import com.sanastours.sanastours_management_system.service.TourPackageService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tour-packages")
@CrossOrigin(origins = "*")
public class TourPackageController {

    private final TourPackageService tourPackageService;

    public TourPackageController(TourPackageService tourPackageService) {
        this.tourPackageService = tourPackageService;
    }

    // CREATE
    @PostMapping
    public TourPackage createTourPackage(
            @RequestBody TourPackage tourPackage) {

        return tourPackageService.createTourPackage(tourPackage);
    }

    // READ ALL
    @GetMapping
    public List<TourPackage> getAllTourPackages() {
        return tourPackageService.getAllTourPackages();
    }

    // READ BY ID
    @GetMapping("/{id}")
    public ResponseEntity<TourPackage> getTourPackageById(
            @PathVariable String id) {

        return tourPackageService.getTourPackageById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // UPDATE
    @PutMapping("/{id}")
    public ResponseEntity<TourPackage> updateTourPackage(
            @PathVariable String id,
            @RequestBody TourPackage tourPackage) {

        try {

            TourPackage updated =
                    tourPackageService.updateTourPackage(
                            id,
                            tourPackage
                    );

            return ResponseEntity.ok(updated);

        } catch (RuntimeException e) {

            return ResponseEntity.notFound().build();
        }
    }

    // DELETE
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTourPackage(
            @PathVariable String id) {

        if (tourPackageService
                .getTourPackageById(id)
                .isEmpty()) {

            return ResponseEntity.notFound().build();
        }

        tourPackageService.deleteTourPackage(id);

        return ResponseEntity.noContent().build();
    }
}