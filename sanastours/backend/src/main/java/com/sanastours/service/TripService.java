package com.sanastours.service;

import com.sanastours.entity.Trip;
import com.sanastours.entity.Vehicle;
import com.sanastours.entity.Driver;
import com.sanastours.repository.TripRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class TripService {

    @Autowired
    private TripRepository tripRepository;

    /** A resource can be allocated unless it has been taken out of service. */
    private boolean isAllocatable(String status) {
        if (status == null || status.isBlank()) return false;
        return "Available".equalsIgnoreCase(status) || "Assigned".equalsIgnoreCase(status);
    }

    public void validateAvailability(Vehicle vehicle, Driver driver, LocalDateTime start, LocalDateTime end) {
        if (start == null || end == null) {
            throw new RuntimeException("Validation Error: Departure and Return dates are strictly required.");
        }
        if (!start.isBefore(end)) {
            throw new RuntimeException("Validation Error: Departure time must be before Return time.");
        }
        // Fix 5.1: the status vocabulary is Available / Assigned / Maintenance /
        // Inactive for vehicles and Available / Assigned / Inactive for drivers.
        // The old code required the driver to be "Active", a value the system
        // never writes, so every allocation failed. A driver or vehicle that is
        // already Assigned may take another trip - overlapping dates are caught
        // by the conflict check below - but Inactive or Maintenance may not.
        if (!isAllocatable(vehicle.getVehicleStatus())) {
            throw new RuntimeException("Validation Error: Selected vehicle is currently " + vehicle.getVehicleStatus());
        }
        if (!isAllocatable(driver.getDriverStatus())) {
            throw new RuntimeException("Validation Error: Selected driver is currently " + driver.getDriverStatus());
        }
        if (driver.getLicenseExpiryDate() != null && start.toLocalDate().isAfter(driver.getLicenseExpiryDate())) {
            throw new RuntimeException("Validation Error: Driver's license will expire before the trip starts.");
        }

        // Find all trips that overlap with the requested dates
        List<Trip> allTrips = tripRepository.findAll();
        
        for (Trip trip : allTrips) {
            if ("Completed".equalsIgnoreCase(trip.getTripStatus()) || "Cancelled".equalsIgnoreCase(trip.getTripStatus())) {
                continue;
            }
            if (trip.getDepartureDatetime() == null) continue;

            // Fix 5.3: an open-ended trip (no return datetime recorded) used to
            // be skipped entirely, so it never blocked a conflicting booking.
            // Treat it as running indefinitely from its departure instead.
            LocalDateTime tripEnd = trip.getReturnDatetime() != null
                    ? trip.getReturnDatetime()
                    : LocalDateTime.MAX;

            boolean overlaps = start.isBefore(tripEnd) && end.isAfter(trip.getDepartureDatetime());

            if (overlaps) {
                if (trip.getVehicle() != null && trip.getVehicle().getVehicleId().equals(vehicle.getVehicleId())) {
                    throw new RuntimeException("Conflict: Vehicle is already booked for another trip during this time.");
                }
                if (trip.getDriver() != null && trip.getDriver().getDriverId().equals(driver.getDriverId())) {
                    throw new RuntimeException("Conflict: Driver is already assigned to another trip during this time.");
                }
            }
        }
    }

    public Trip assignTrip(Trip newTrip) {
        validateAvailability(
                newTrip.getVehicle(), 
                newTrip.getDriver(), 
                newTrip.getDepartureDatetime(), 
                newTrip.getReturnDatetime());
        
        return tripRepository.save(newTrip);
    }
}
