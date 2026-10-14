package com.sanastours.repository;
import com.sanastours.entity.PackageDestination;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PackageDestinationRepository extends JpaRepository<PackageDestination, Integer> {
}
