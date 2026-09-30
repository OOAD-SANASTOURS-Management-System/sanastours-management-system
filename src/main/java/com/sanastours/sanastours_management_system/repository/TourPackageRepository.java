package com.sanastours.sanastours_management_system.repository;

import com.sanastours.sanastours_management_system.model.TourPackage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TourPackageRepository
        extends JpaRepository<TourPackage, String> {
}