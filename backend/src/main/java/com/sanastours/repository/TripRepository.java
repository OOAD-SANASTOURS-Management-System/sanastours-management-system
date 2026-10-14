package com.sanastours.repository;
import com.sanastours.entity.Trip;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TripRepository extends JpaRepository<Trip, Integer> {
    List<Trip> findByDriver_DriverId(Integer driverId);
    List<Trip> findByVehicle_VehicleId(Integer vehicleId);
    Trip findByBooking_BookingId(Integer bookingId);
}
