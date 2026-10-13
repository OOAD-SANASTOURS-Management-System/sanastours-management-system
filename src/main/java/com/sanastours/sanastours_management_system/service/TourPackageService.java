package com.sanastours.sanastours_management_system.service;

import com.sanastours.sanastours_management_system.model.TourPackage;
import com.sanastours.sanastours_management_system.repository.TourPackageRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class TourPackageService {

    private final TourPackageRepository tourPackageRepository;

    public TourPackageService(TourPackageRepository tourPackageRepository) {
        this.tourPackageRepository = tourPackageRepository;
    }

    // CREATE
    public TourPackage createTourPackage(TourPackage tourPackage) {
        return tourPackageRepository.save(tourPackage);
    }

    // READ ALL
    public List<TourPackage> getAllTourPackages() {
        return tourPackageRepository.findAll();
    }

    // READ BY ID
    public Optional<TourPackage> getTourPackageById(String id) {
        return tourPackageRepository.findById(id);
    }

    // UPDATE
    public TourPackage updateTourPackage(
            String id,
            TourPackage updatedPackage) {

        TourPackage existingPackage =
                tourPackageRepository.findById(id)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Tour package not found"
                                ));

        existingPackage.setPackageName(
                updatedPackage.getPackageName()
        );

        existingPackage.setDescription(
                updatedPackage.getDescription()
        );

        existingPackage.setPrice(
                updatedPackage.getPrice()
        );

        existingPackage.setDurationDays(
                updatedPackage.getDurationDays()
        );

        return tourPackageRepository.save(existingPackage);
    }

    // DELETE
    public void deleteTourPackage(String id) {
        tourPackageRepository.deleteById(id);
    }
}