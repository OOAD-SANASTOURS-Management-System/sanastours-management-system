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
@CrossOrigin(origins = "http://localhost:5173")
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
}
