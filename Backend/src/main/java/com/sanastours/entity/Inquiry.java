package com.sanastours.entity;
import jakarta.persistence.*;

@Entity
@Table(name = "inquiry")
public class Inquiry {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Integer inquiryId;
    @ManyToOne @JoinColumn(name = "customer_id", nullable = false) private Customer customer;
    /** The package the customer enquired about, when they came from one. */
    @ManyToOne @JoinColumn(name = "package_id") private TourPackage tourPackage;
    private java.time.LocalDate travelStartDate;
    private java.time.LocalDate travelEndDate;
    private Integer numberOfTravellers;
    private String destinationArea;
    private String accommodationRequirement;
    private String transportationRequirement;
    private String additionalRequests;
    /** Why the office turned this inquiry down. Set only when Rejected. */
    private String rejectionReason;
    private String inquiryStatus;

    public Integer getInquiryId() { return inquiryId; }
    public void setInquiryId(Integer inquiryId) { this.inquiryId = inquiryId; }
    public Customer getCustomer() { return customer; }
    public void setCustomer(Customer customer) { this.customer = customer; }
    public TourPackage getTourPackage() { return tourPackage; }
    public void setTourPackage(TourPackage tourPackage) { this.tourPackage = tourPackage; }
    public java.time.LocalDate getTravelStartDate() { return travelStartDate; }
    public void setTravelStartDate(java.time.LocalDate travelStartDate) { this.travelStartDate = travelStartDate; }
    public java.time.LocalDate getTravelEndDate() { return travelEndDate; }
    public void setTravelEndDate(java.time.LocalDate travelEndDate) { this.travelEndDate = travelEndDate; }
    public Integer getNumberOfTravellers() { return numberOfTravellers; }
    public void setNumberOfTravellers(Integer numberOfTravellers) { this.numberOfTravellers = numberOfTravellers; }
    public String getDestinationArea() { return destinationArea; }
    public void setDestinationArea(String destinationArea) { this.destinationArea = destinationArea; }
    public String getAccommodationRequirement() { return accommodationRequirement; }
    public void setAccommodationRequirement(String accommodationRequirement) { this.accommodationRequirement = accommodationRequirement; }
    public String getTransportationRequirement() { return transportationRequirement; }
    public void setTransportationRequirement(String transportationRequirement) { this.transportationRequirement = transportationRequirement; }
    public String getAdditionalRequests() { return additionalRequests; }
    public void setAdditionalRequests(String additionalRequests) { this.additionalRequests = additionalRequests; }
    public String getRejectionReason() { return rejectionReason; }
    public void setRejectionReason(String rejectionReason) { this.rejectionReason = rejectionReason; }
    public String getInquiryStatus() { return inquiryStatus; }
    public void setInquiryStatus(String inquiryStatus) { this.inquiryStatus = inquiryStatus; }
}
