package com.sanastours.repository;
import com.sanastours.entity.Feedback;
import org.springframework.data.jpa.repository.JpaRepository;
public interface FeedbackRepository extends JpaRepository<Feedback, Integer> {
    Feedback findByBooking_BookingId(Integer bookingId);
}
