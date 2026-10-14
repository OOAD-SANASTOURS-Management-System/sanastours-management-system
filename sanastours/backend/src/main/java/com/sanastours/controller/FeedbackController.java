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

        // Feedback is the customer's own words about their own tour; the
        // office reads it but does not write it.
        if (!currentUser.isCustomer() || booking.getCustomer() == null
                || !currentUser.ownsCustomer(booking.getCustomer().getCustomerId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access denied.");
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

        String problem = checkRatingAndComment(request);
        if (problem != null) return ResponseEntity.badRequest().body(problem);

        Feedback feedback = new Feedback();
        feedback.setBooking(booking);
        feedback.setRating(request.getRating());
        feedback.setReviewText(cleanComment(request.getReviewText()));
        feedback.setCreatedAt(LocalDateTime.now());

        feedbackRepository.save(feedback);

        return ResponseEntity.ok(feedback);
    }

    /**
     * A customer changes the rating or comment on their own feedback. The
     * booking cannot be changed, and the original submission date is kept.
     */
    @PutMapping("/{id}")
    public ResponseEntity<?> updateFeedback(@PathVariable Integer id, @RequestBody FeedbackRequest request) {
        Feedback feedback = feedbackRepository.findById(id).orElse(null);
        if (feedback == null) return ResponseEntity.badRequest().body("Feedback not found.");

        Booking booking = feedback.getBooking();
        if (!currentUser.isCustomer() || booking == null || booking.getCustomer() == null
                || !currentUser.ownsCustomer(booking.getCustomer().getCustomerId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access denied.");
        }

        String problem = checkRatingAndComment(request);
        if (problem != null) return ResponseEntity.badRequest().body(problem);

        feedback.setRating(request.getRating());
        feedback.setReviewText(cleanComment(request.getReviewText()));
        return ResponseEntity.ok(feedbackRepository.save(feedback));
    }

    /** The comment is optional but capped; the rating is required, 1 to 5. */
    private static final int MAX_COMMENT_LENGTH = 500;

    private String checkRatingAndComment(FeedbackRequest request) {
        if (request.getRating() == null || request.getRating() < 1 || request.getRating() > 5) {
            return "Rating must be between 1 and 5.";
        }
        String comment = request.getReviewText();
        if (comment != null && comment.trim().length() > MAX_COMMENT_LENGTH) {
            return "Your comment must be " + MAX_COMMENT_LENGTH + " characters or fewer.";
        }
        return null;
    }

    private String cleanComment(String comment) {
        return comment == null ? "" : comment.trim();
    }
}
