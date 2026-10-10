package com.sanastours.controller;

import com.sanastours.dto.FeedbackRequest;
import com.sanastours.entity.Booking;
import com.sanastours.entity.Feedback;
import com.sanastours.repository.BookingRepository;
import com.sanastours.repository.FeedbackRepository;
import com.sanastours.security.CurrentUser;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/feedback")
public class FeedbackController {

    @Autowired
    private FeedbackRepository feedbackRepository;

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private com.sanastours.repository.TripRepository tripRepository;

    @Autowired
    private CurrentUser currentUser;

    /**
     * Fix 5.6: a customer can now read back their own feedback, so the portal
     * can show what they already submitted. Staff still see everything.
     */
    @GetMapping
    public ResponseEntity<?> getAllFeedback() {
        if (currentUser.isCustomer()) {
            Integer custId = currentUser.roleId();
            return ResponseEntity.ok(feedbackRepository.findAll().stream()
                    .filter(f -> f.getBooking() != null && f.getBooking().getCustomer() != null
                            && f.getBooking().getCustomer().getCustomerId().equals(custId))
                    .toList());
        }
        return ResponseEntity.ok(feedbackRepository.findAll());
    }

    @PostMapping
    public ResponseEntity<?> submitFeedback(@RequestBody FeedbackRequest request) {
        if (request.getBookingId() == null) {
            return ResponseEntity.badRequest().body("Booking is required.");
        }
        Booking booking = bookingRepository.findById(request.getBookingId()).orElse(null);
        if (booking == null) return ResponseEntity.badRequest().body("Booking not found");

        // A customer may only review their own booking.
        if (currentUser.isCustomer()) {
            if (booking.getCustomer() == null || !currentUser.ownsCustomer(booking.getCustomer().getCustomerId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access denied.");
            }
        }

        // Fix 5.6: feedback used to require a Trip row with status "Completed",
        // but no screen ever created a trip or set that status, so feedback
        // could never be submitted at all. The booking's own status is the
        // thing the driver's "Tour Ended" step now sets, so use that, and
        // accept a completed trip as well where one exists.
        com.sanastours.entity.Trip trip = tripRepository.findByBooking_BookingId(booking.getBookingId());
        boolean bookingCompleted = "Completed".equalsIgnoreCase(booking.getBookingStatus());
        boolean tripCompleted = trip != null && "Completed".equalsIgnoreCase(trip.getTripStatus());
        if (!bookingCompleted && !tripCompleted) {
            return ResponseEntity.badRequest().body("You can only leave feedback once your tour is completed.");
        }

        // Prevent duplicate feedback
        if (feedbackRepository.findByBooking_BookingId(booking.getBookingId()) != null) {
            return ResponseEntity.badRequest().body("Feedback already submitted for this booking.");
        }

        if (request.getRating() == null || request.getRating() < 1 || request.getRating() > 5) {
            return ResponseEntity.badRequest().body("Rating must be between 1 and 5.");
        }

        if (request.getReviewText() == null || request.getReviewText().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Review text cannot be empty.");
        }

        Feedback feedback = new Feedback();
        feedback.setBooking(booking);
        feedback.setRating(request.getRating());
        feedback.setReviewText(request.getReviewText().trim());
        feedback.setCreatedAt(LocalDateTime.now());

        feedbackRepository.save(feedback);

        return ResponseEntity.ok(feedback);
    }
}
