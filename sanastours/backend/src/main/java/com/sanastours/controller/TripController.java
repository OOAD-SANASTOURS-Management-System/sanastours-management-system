package com.sanastours.controller;

import com.sanastours.dto.TripRequest;
import com.sanastours.entity.Booking;
import com.sanastours.entity.Driver;
import com.sanastours.entity.Trip;
import com.sanastours.entity.Vehicle;
import com.sanastours.repository.BookingRepository;
import com.sanastours.repository.DriverRepository;
import com.sanastours.repository.TripRepository;
import com.sanastours.repository.VehicleRepository;
import com.sanastours.service.TripService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/trips")
public class TripController {

    @Autowired
    private TripService tripService;

    @Autowired
    private TripRepository tripRepository;
    @Autowired
    private BookingRepository bookingRepository;
    @Autowired
    private VehicleRepository vehicleRepository;
    @Autowired
    private DriverRepository driverRepository;
    @Autowired
    private com.sanastours.security.CurrentUser currentUser;

    @GetMapping
    public List<Trip> getAllTrips() {
        return tripRepository.findAll();
    }

    @PostMapping("/allocate")
    public ResponseEntity<?> allocateTrip(@RequestBody TripRequest request) {
        try {
            Booking booking = bookingRepository.findById(request.getBookingId())
                    .orElseThrow(() -> new RuntimeException("Booking not found"));
            Vehicle vehicle = vehicleRepository.findById(request.getVehicleId())
                    .orElseThrow(() -> new RuntimeException("Vehicle not found"));
            Driver driver = driverRepository.findById(request.getDriverId())
                    .orElseThrow(() -> new RuntimeException("Driver not found"));

            // Fix #7a: Check if the vehicle capacity is sufficient for the booking
            if (vehicle.getCapacity() != null && booking.getNumberOfPeople() != null
                    && booking.getNumberOfPeople() > vehicle.getCapacity()) {
                return ResponseEntity.badRequest().body(
                    "Vehicle " + vehicle.getRegistrationNo() + " (capacity: " + vehicle.getCapacity() 
                    + ") cannot accommodate " + booking.getNumberOfPeople() + " passengers.");
            }

            // Proper date-based conflict checking is delegated to TripService below.

            Trip trip = new Trip();
            trip.setBooking(booking);
            trip.setVehicle(vehicle);
            trip.setDriver(driver);
            trip.setDepartureDatetime(request.getDepartureDatetime());
            trip.setReturnDatetime(request.getReturnDatetime());
            trip.setPickupLocation(request.getPickupLocation());
            trip.setDropoffLocation(request.getDropoffLocation());
            trip.setTripStatus("Allocated");

            Trip savedTrip = tripService.assignTrip(trip);
            return ResponseEntity.ok(savedTrip);
            
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/driver/{driverId}")
    public ResponseEntity<?> getDriverTrips(@PathVariable Integer driverId) {
        // A driver may only read their own trips.
        if (currentUser.isDriver() && !currentUser.ownsDriver(driverId)) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN).body("Access denied.");
        }
        return ResponseEntity.ok(tripRepository.findByDriver_DriverId(driverId));
    }

    /**
     * Fix 4.13 / 5.5: this took a raw body, stripped quote characters out of it
     * and stored whatever was left, so any string became a trip status. It now
     * takes a JSON object and checks the value against the one known list.
     */
    @PutMapping("/{tripId}/status")
    public ResponseEntity<?> updateTripStatus(@PathVariable Integer tripId, @RequestBody java.util.Map<String, String> body) {
        Trip trip = tripRepository.findById(tripId).orElse(null);
        if (trip == null) return ResponseEntity.badRequest().body("Trip not found");

        String status = body.get("tripStatus");
        if (status == null || status.isBlank()) {
            return ResponseEntity.badRequest().body("tripStatus is required.");
        }
        if (!com.sanastours.util.Validation.isOneOf(status, com.sanastours.util.Validation.TRIP_STATUSES)) {
            return ResponseEntity.badRequest().body("Unknown trip status: " + status);
        }
        if (currentUser.isDriver()) {
            if (trip.getDriver() == null || !currentUser.ownsDriver(trip.getDriver().getDriverId())) {
                return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN).body("This trip is not assigned to you.");
            }
            if (!("Ongoing".equalsIgnoreCase(status) || "Completed".equalsIgnoreCase(status))) {
                return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN)
                        .body("A driver can only start or complete a trip.");
            }
        }

        trip.setTripStatus(status);
        return ResponseEntity.ok(tripRepository.save(trip));
    }
}
