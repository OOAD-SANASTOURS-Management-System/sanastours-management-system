package com.sanastours.entity;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity @Table(name="Feedback")
public class Feedback {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name="feedback_id") private Integer feedbackId;
    @OneToOne @JoinColumn(name="booking_id", referencedColumnName="booking_id", nullable=false, unique=true)
    private Booking booking;
    private Integer rating;
    @Column(name="review_text") private String reviewText;
    @Column(name="created_at") private LocalDateTime createdAt = LocalDateTime.now();

    public Integer getFeedbackId() { return feedbackId; }
    public void setFeedbackId(Integer feedbackId) { this.feedbackId = feedbackId; }
    public Booking getBooking() { return booking; }
    public void setBooking(Booking booking) { this.booking = booking; }
    public Integer getRating() { return rating; }
    public void setRating(Integer rating) { this.rating = rating; }
    public String getReviewText() { return reviewText; }
    public void setReviewText(String reviewText) { this.reviewText = reviewText; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}