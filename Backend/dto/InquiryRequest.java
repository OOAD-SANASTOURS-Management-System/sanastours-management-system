package com.sanastours.dto;

public class InquiryRequest {
    private Integer customerId;
    private String packageId; // For reference if they inquired from a specific package page
    private String travelDates;
    private Integer numberOfTravellers;
    private String specialRequirements;

    // Getters and Setters
    public Integer getCustomerId() { return customerId; }
    public void setCustomerId(Integer customerId) { this.customerId = customerId; }
    public String getPackageId() { return packageId; }
    public void setPackageId(String packageId) { this.packageId = packageId; }
    public String getTravelDates() { return travelDates; }
    public void setTravelDates(String travelDates) { this.travelDates = travelDates; }
    public Integer getNumberOfTravellers() { return numberOfTravellers; }
    public void setNumberOfTravellers(Integer numberOfTravellers) { this.numberOfTravellers = numberOfTravellers; }
    public String getSpecialRequirements() { return specialRequirements; }
    public void setSpecialRequirements(String specialRequirements) { this.specialRequirements = specialRequirements; }
}
