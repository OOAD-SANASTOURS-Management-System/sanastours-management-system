package com.sanastours.entity;
import jakarta.persistence.*;
import java.time.LocalDate;

@Entity @Table(name="Booking")
public class Booking {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name="booking_id") private Integer bookingId;
    @ManyToOne @JoinColumn(name="customer_id", referencedColumnName="customer_id", nullable=false)
    private Customer customer;
    @ManyToOne @JoinColumn(name="package_id", referencedColumnName="package_id", nullable=false)
    private TourPackage tourPackage;
    @Column(name="booking_date") private LocalDate bookingDate;
    @Column(name="number_of_people") private Integer numberOfPeople;
    @Column(name="booking_status") private String bookingStatus;

    public Integer getBookingId() { return bookingId; }
    public void setBookingId(Integer bookingId) { this.bookingId = bookingId; }
    public Customer getCustomer() { return customer; }
    public void setCustomer(Customer customer) { this.customer = customer; }
    public TourPackage getTourPackage() { return tourPackage; }
    public void setTourPackage(TourPackage tourPackage) { this.tourPackage = tourPackage; }
    public LocalDate getBookingDate() { return bookingDate; }
    public void setBookingDate(LocalDate bookingDate) { this.bookingDate = bookingDate; }
    public Integer getNumberOfPeople() { return numberOfPeople; }
    public void setNumberOfPeople(Integer numberOfPeople) { this.numberOfPeople = numberOfPeople; }
    public String getBookingStatus() { return bookingStatus; }
    public void setBookingStatus(String bookingStatus) { this.bookingStatus = bookingStatus; }
}