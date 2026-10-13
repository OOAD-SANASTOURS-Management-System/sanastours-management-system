package com.sanastours.entity;
import jakarta.persistence.*;

@Entity
@Table(name = "quotation")
public class Quotation {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Integer quotationId;
    @ManyToOne @JoinColumn(name = "inquiry_id", nullable = false) private Inquiry inquiry;
    @ManyToOne @JoinColumn(name = "package_id") private TourPackage tourPackage;
    @ManyToOne @JoinColumn(name = "itinerary_id") private Itinerary itinerary;
    
    private java.math.BigDecimal basePrice;
    private java.math.BigDecimal additionalCharges;
    private java.math.BigDecimal discount;
    private java.math.BigDecimal totalAmount;
    private java.time.LocalDate validUntil;
    private String notes;
    /** The office's covering message to the customer, sent with the quotation. */
    private String adminMessage;
    private String quotationStatus;

    public String getAdminMessage() { return adminMessage; }
    public void setAdminMessage(String adminMessage) { this.adminMessage = adminMessage; }
    public Integer getQuotationId() { return quotationId; }
    public void setQuotationId(Integer quotationId) { this.quotationId = quotationId; }
    public Inquiry getInquiry() { return inquiry; }
    public void setInquiry(Inquiry inquiry) { this.inquiry = inquiry; }
    public TourPackage getTourPackage() { return tourPackage; }
    public void setTourPackage(TourPackage tourPackage) { this.tourPackage = tourPackage; }
    public Itinerary getItinerary() { return itinerary; }
    public void setItinerary(Itinerary itinerary) { this.itinerary = itinerary; }
    public java.math.BigDecimal getBasePrice() { return basePrice; }
    public void setBasePrice(java.math.BigDecimal basePrice) { this.basePrice = basePrice; }
    public java.math.BigDecimal getAdditionalCharges() { return additionalCharges; }
    public void setAdditionalCharges(java.math.BigDecimal additionalCharges) { this.additionalCharges = additionalCharges; }
    public java.math.BigDecimal getDiscount() { return discount; }
    public void setDiscount(java.math.BigDecimal discount) { this.discount = discount; }
    public java.math.BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(java.math.BigDecimal totalAmount) { this.totalAmount = totalAmount; }
    public java.time.LocalDate getValidUntil() { return validUntil; }
    public void setValidUntil(java.time.LocalDate validUntil) { this.validUntil = validUntil; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public String getQuotationStatus() { return quotationStatus; }
    public void setQuotationStatus(String quotationStatus) { this.quotationStatus = quotationStatus; }
}
