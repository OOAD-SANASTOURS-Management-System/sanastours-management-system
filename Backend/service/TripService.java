package com.sanastours.service;

import com.sanastours.entity.Trip;
import com.sanastours.repository.TripRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class TripService {

    @Autowired
    private TripRepository tripRepository;

    /**
     * Checks if a vehicle or driver is already assigned to a trip during the specified time period.
     * Requirement: Section 11 - Driver and Vehicle Allocation Requirements
     */
    public boolean hasConflict(Integer vehicleId, Integer driverId, LocalDateTime start, LocalDateTime end) {
        // Find all trips that overlap with the requested dates
        List<Trip> allTrips = tripRepository.findAll();
        
        for (Trip trip : allTrips) {
            // Check if the trip overlaps
            boolean overlaps = (start.isBefore(trip.getReturnDatetime()) && end.isAfter(trip.getDepartureDatetime()));
            
            if (overlaps) {
                // If there's a time overlap, verify if the same driver or vehicle is used
                if (trip.getVehicle().getVehicleId().equals(vehicleId) || 
                    trip.getDriver().getDriverId().equals(driverId)) {
                    return true; // Conflict found!
                }
            }
        }
        return false; // No conflicts, safe to book
    }

    public Trip assignTrip(Trip newTrip) {
        if (hasConflict(
                newTrip.getVehicle().getVehicleId(), 
                newTrip.getDriver().getDriverId(), 
                newTrip.getDepartureDatetime(), 
                newTrip.getReturnDatetime())) {
            throw new RuntimeException("Conflict: The selected Driver or Vehicle is not available during these dates.");
        }
        return tripRepository.save(newTrip);
    }
}
