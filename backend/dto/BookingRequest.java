package com.sanastours.dto;

public class BookingRequest {
    private Integer inquiryId;
    private String packageId;

    public Integer getInquiryId() { return inquiryId; }
    public void setInquiryId(Integer inquiryId) { this.inquiryId = inquiryId; }
    public String getPackageId() { return packageId; }
    public void setPackageId(String packageId) { this.packageId = packageId; }
}
