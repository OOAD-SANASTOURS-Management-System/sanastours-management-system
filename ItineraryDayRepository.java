package com.sanastours.repository;
import com.sanastours.entity.ItineraryDay;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ItineraryDayRepository extends JpaRepository<ItineraryDay, Integer> {
    List<ItineraryDay> findByItinerary_ItineraryId(Integer itineraryId);
}
