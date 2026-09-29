package com.sanastours.entity;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity @Table(name="Inquiry")
public class Inquiry {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name="inquiry_id") private Integer inquiryId;
    @ManyToOne @JoinColumn(name="customer_id", referencedColumnName="customer_id", nullable=false)
    private Customer customer;
    @Column(name="travel_dates") private String travelDates;
    @Column(name="number_of_travellers") private Integer numberOfTravellers;
    @Column(name="destinations_of_interest") private String destinationsOfInterest;
    @Column(name="special_requirements") private String specialRequirements;
    @Column(name="inquiry_status") private String inquiryStatus = "Pending";
    @Column(name="created_at") private LocalDateTime createdAt = LocalDateTime.now();

    public Integer getInquiryId() { return inquiryId; }
    public void setInquiryId(Integer inquiryId) { this.inquiryId = inquiryId; }
    public Customer getCustomer() { return customer; }
    public void setCustomer(Customer customer) { this.customer = customer; }
    public String getTravelDates() { return travelDates; }
    public void setTravelDates(String travelDates) { this.travelDates = travelDates; }
    public Integer getNumberOfTravellers() { return numberOfTravellers; }
    public void setNumberOfTravellers(Integer numberOfTravellers) { this.numberOfTravellers = numberOfTravellers; }
    public String getDestinationsOfInterest() { return destinationsOfInterest; }
    public void setDestinationsOfInterest(String destinationsOfInterest) { this.destinationsOfInterest = destinationsOfInterest; }
    public String getSpecialRequirements() { return specialRequirements; }
    public void setSpecialRequirements(String specialRequirements) { this.specialRequirements = specialRequirements; }
    public String getInquiryStatus() { return inquiryStatus; }
    public void setInquiryStatus(String inquiryStatus) { this.inquiryStatus = inquiryStatus; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}