package com.sanastours.entity;
import jakarta.persistence.*;

@Entity
@Table(name = "booking")
public class Booking {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Integer bookingId;
    @ManyToOne @JoinColumn(name = "customer_id", nullable = false) private Customer customer;
    @ManyToOne @JoinColumn(name = "quotation_id") private Quotation quotation;
    @ManyToOne @JoinColumn(name = "package_id", nullable = false) private TourPackage tourPackage;
    @ManyToOne @JoinColumn(name = "itinerary_id") private Itinerary itinerary;
    
    private java.time.LocalDate travelStartDate;
    private java.time.LocalDate travelEndDate;
    private Integer numberOfPeople;
    private java.math.BigDecimal totalAmount;
    private String notes;
    private String bookingStatus;

    @ManyToOne @JoinColumn(name = "driver_id") private Driver driver;
    @ManyToOne @JoinColumn(name = "vehicle_id") private Vehicle vehicle;
    private String initialLocation;
    private String returnDropOffLocation;

    public Driver getDriver() { return driver; }
    public void setDriver(Driver driver) { this.driver = driver; }
    public Vehicle getVehicle() { return vehicle; }
    public void setVehicle(Vehicle vehicle) { this.vehicle = vehicle; }
    public String getInitialLocation() { return initialLocation; }
    public void setInitialLocation(String initialLocation) { this.initialLocation = initialLocation; }
    public String getReturnDropOffLocation() { return returnDropOffLocation; }
    public void setReturnDropOffLocation(String returnDropOffLocation) { this.returnDropOffLocation = returnDropOffLocation; }

    public Integer getBookingId() { return bookingId; }
    public void setBookingId(Integer bookingId) { this.bookingId = bookingId; }
    public Customer getCustomer() { return customer; }
    public void setCustomer(Customer customer) { this.customer = customer; }
    public Quotation getQuotation() { return quotation; }
    public void setQuotation(Quotation quotation) { this.quotation = quotation; }
    public TourPackage getTourPackage() { return tourPackage; }
    public void setTourPackage(TourPackage tourPackage) { this.tourPackage = tourPackage; }
    public Itinerary getItinerary() { return itinerary; }
    public void setItinerary(Itinerary itinerary) { this.itinerary = itinerary; }
    public java.time.LocalDate getTravelStartDate() { return travelStartDate; }
    public void setTravelStartDate(java.time.LocalDate travelStartDate) { this.travelStartDate = travelStartDate; }
    public java.time.LocalDate getTravelEndDate() { return travelEndDate; }
    public void setTravelEndDate(java.time.LocalDate travelEndDate) { this.travelEndDate = travelEndDate; }
    public Integer getNumberOfPeople() { return numberOfPeople; }
    public void setNumberOfPeople(Integer numberOfPeople) { this.numberOfPeople = numberOfPeople; }
    public java.math.BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(java.math.BigDecimal totalAmount) { this.totalAmount = totalAmount; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public String getBookingStatus() { return bookingStatus; }
    public void setBookingStatus(String bookingStatus) { this.bookingStatus = bookingStatus; }
}
