package com.sanastours.entity;
import jakarta.persistence.*;

@Entity
@Table(name = "trip_update")
public class TripUpdate {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Integer updateId;
    @ManyToOne @JoinColumn(name = "booking_id", nullable = false) private Booking booking;
    
    private String stepName; // e.g., "Tour Started", "Dropped at Destination", "Return Journey Started", "Tour Ended"
    private java.time.LocalDateTime updateTime;
    private String location;
    private String driverNote;

    public Integer getUpdateId() { return updateId; }
    public void setUpdateId(Integer updateId) { this.updateId = updateId; }
    public Booking getBooking() { return booking; }
    public void setBooking(Booking booking) { this.booking = booking; }
    public String getStepName() { return stepName; }
    public void setStepName(String stepName) { this.stepName = stepName; }
    public java.time.LocalDateTime getUpdateTime() { return updateTime; }
    public void setUpdateTime(java.time.LocalDateTime updateTime) { this.updateTime = updateTime; }
    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }
    public String getDriverNote() { return driverNote; }
    public void setDriverNote(String driverNote) { this.driverNote = driverNote; }
}
