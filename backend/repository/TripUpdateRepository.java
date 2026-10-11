package com.sanastours.repository;

import com.sanastours.entity.TripUpdate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TripUpdateRepository extends JpaRepository<TripUpdate, Integer> {
    List<TripUpdate> findByBooking_BookingIdOrderByUpdateTimeAsc(Integer bookingId);
    List<TripUpdate> findTop10ByOrderByUpdateTimeDesc();
}
