package com.sanastours.repository;
import com.sanastours.entity.Itinerary;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ItineraryRepository extends JpaRepository<Itinerary, Integer> {

    /**
     * A tour package has one itinerary in the UI, but nothing in the schema
     * enforces that, so older data may hold more than one. Take the earliest
     * and treat it as the package's itinerary.
     */
    Optional<Itinerary> findFirstByTourPackage_PackageIdOrderByItineraryIdAsc(String packageId);
}
