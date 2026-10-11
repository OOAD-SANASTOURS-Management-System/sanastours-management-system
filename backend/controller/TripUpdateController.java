package com.sanastours.controller;

import com.sanastours.entity.TripUpdate;
import com.sanastours.entity.Booking;
import com.sanastours.repository.TripUpdateRepository;
import com.sanastours.repository.BookingRepository;
import com.sanastours.security.CurrentUser;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/trip-updates")
public class TripUpdateController {

    @Autowired private TripUpdateRepository tripUpdateRepository;
    @Autowired private BookingRepository bookingRepository;
    @Autowired private CurrentUser currentUser;

    /**
     * The ordered steps of a tour. Fix 5.10: progress can only be logged in
     * this order, and each step only once.
     */
    private static final List<String> STEPS = List.of(
            "Tour Started",
            "Dropped at Destination",
            "Return Journey Started",
            "Tour Ended");

    @GetMapping("/booking/{bookingId}")
    public ResponseEntity<?> getUpdatesForBooking(@PathVariable Integer bookingId) {
        Booking booking = bookingRepository.findById(bookingId).orElse(null);
        if (booking == null) return ResponseEntity.badRequest().body("Booking not found");

        // Fix 2.3: a customer or driver may only read updates for their own
        // booking; this endpoint had no rule and no check at all.
        ResponseEntity<?> denied = checkAccess(booking, false);
        if (denied != null) return denied;

        return ResponseEntity.ok(tripUpdateRepository.findByBooking_BookingIdOrderByUpdateTimeAsc(bookingId));
    }

    @GetMapping("/recent")
    public ResponseEntity<?> getRecentUpdates() {
        if (!currentUser.isStaff()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access denied.");
        }
        return ResponseEntity.ok(tripUpdateRepository.findTop10ByOrderByUpdateTimeDesc());
    }

    @PostMapping
    public ResponseEntity<?> addTripUpdate(@RequestBody TripUpdate request) {
        if (request.getBooking() == null || request.getBooking().getBookingId() == null) {
            return ResponseEntity.badRequest().body("Booking ID is required");
        }
        Booking booking = bookingRepository.findById(request.getBooking().getBookingId()).orElse(null);
        if (booking == null) return ResponseEntity.badRequest().body("Booking not found");

        // Fix 2.3: the original code had a comment reading "Security check for
        // driver could be added here" and no check, so any logged-in user could
        // post fake progress against any booking in the system.
        ResponseEntity<?> denied = checkAccess(booking, true);
        if (denied != null) return denied;

        String step = request.getStepName();
        if (step == null || !STEPS.contains(step)) {
            return ResponseEntity.badRequest().body("Unknown tour step: " + step);
        }
        if (request.getLocation() == null || request.getLocation().isBlank()) {
            return ResponseEntity.badRequest().body("Location is required.");
        }
        if ("Cancelled".equalsIgnoreCase(booking.getBookingStatus())) {
            return ResponseEntity.badRequest().body("This booking has been cancelled.");
        }

        List<TripUpdate> existing = tripUpdateRepository.findByBooking_BookingIdOrderByUpdateTimeAsc(booking.getBookingId());

        // Fix 5.10: no duplicates, and no skipping ahead.
        boolean alreadyLogged = existing.stream().anyMatch(u -> step.equals(u.getStepName()));
        if (alreadyLogged) {
            return ResponseEntity.badRequest().body("'" + step + "' has already been recorded for this tour.");
        }
        int index = STEPS.indexOf(step);
        for (int i = 0; i < index; i++) {
            String earlier = STEPS.get(i);
            if (existing.stream().noneMatch(u -> earlier.equals(u.getStepName()))) {
                return ResponseEntity.badRequest().body("Please record '" + earlier + "' first.");
            }
        }

        TripUpdate update = new TripUpdate();
        update.setBooking(booking);
        update.setStepName(step);
        update.setLocation(request.getLocation().trim());
        update.setDriverNote(request.getDriverNote());
        // Fix 5.9: honour the time the driver entered, falling back to now.
        LocalDateTime when = request.getUpdateTime() != null ? request.getUpdateTime() : LocalDateTime.now();
        if (when.isAfter(LocalDateTime.now().plusMinutes(5))) {
            return ResponseEntity.badRequest().body("The update time cannot be in the future.");
        }
        update.setUpdateTime(when);

        return ResponseEntity.ok(tripUpdateRepository.save(update));
    }

    /**
     * Returns a 403 response when the caller may not see or touch this
     * booking's updates, or null when they may.
     */
    private ResponseEntity<?> checkAccess(Booking booking, boolean writing) {
        if (currentUser.isStaff()) return null;

        if (currentUser.isDriver()) {
            if (booking.getDriver() == null || !currentUser.ownsDriver(booking.getDriver().getDriverId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("This tour is not assigned to you.");
            }
            return null;
        }

        if (!writing && currentUser.isCustomer()) {
            if (booking.getCustomer() == null || !currentUser.ownsCustomer(booking.getCustomer().getCustomerId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access denied.");
            }
            return null;
        }

        return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access denied.");
    }
}
