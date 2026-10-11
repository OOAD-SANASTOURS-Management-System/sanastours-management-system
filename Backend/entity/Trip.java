package com.sanastours.entity;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity @Table(name="Trip")
public class Trip {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name="trip_id") private Integer tripId;
    @ManyToOne @JoinColumn(name="booking_id", referencedColumnName="booking_id", nullable=false)
    private Booking booking;
    @ManyToOne @JoinColumn(name="vehicle_id", referencedColumnName="vehicle_id", nullable=false)
    private Vehicle vehicle;
    @ManyToOne @JoinColumn(name="driver_id", referencedColumnName="driver_id", nullable=false)
    private Driver driver;
    @Column(name="departure_datetime", nullable=false) private LocalDateTime departureDatetime;
    @Column(name="return_datetime") private LocalDateTime returnDatetime;
    @Column(name="pickup_location") private String pickupLocation;
    @Column(name="dropoff_location") private String dropoffLocation;
    @Column(name="trip_status", nullable=false) private String tripStatus = "Scheduled";

    public Integer getTripId() { return tripId; }
    public void setTripId(Integer tripId) { this.tripId = tripId; }
    public Booking getBooking() { return booking; }
    public void setBooking(Booking booking) { this.booking = booking; }
    public Vehicle getVehicle() { return vehicle; }
    public void setVehicle(Vehicle vehicle) { this.vehicle = vehicle; }
    public Driver getDriver() { return driver; }
    public void setDriver(Driver driver) { this.driver = driver; }
    public LocalDateTime getDepartureDatetime() { return departureDatetime; }
    public void setDepartureDatetime(LocalDateTime departureDatetime) { this.departureDatetime = departureDatetime; }
    public LocalDateTime getReturnDatetime() { return returnDatetime; }
    public void setReturnDatetime(LocalDateTime returnDatetime) { this.returnDatetime = returnDatetime; }
    public String getPickupLocation() { return pickupLocation; }
    public void setPickupLocation(String pickupLocation) { this.pickupLocation = pickupLocation; }
    public String getDropoffLocation() { return dropoffLocation; }
    public void setDropoffLocation(String dropoffLocation) { this.dropoffLocation = dropoffLocation; }
    public String getTripStatus() { return tripStatus; }
    public void setTripStatus(String tripStatus) { this.tripStatus = tripStatus; }
}