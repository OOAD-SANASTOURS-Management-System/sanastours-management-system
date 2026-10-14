package com.sanastours.dto;

public class BookingRequest {
    private Integer inquiryId;
    /**
     * Fix 4.1: which quotation the customer accepted. Without this the server
     * guessed ("the last row returned"), so accepting one quotation could book
     * a different one's amount.
     */
    private Integer quotationId;
    /** Kept for older callers; the package now comes from the quotation (fix 4.4). */
    private String packageId;

    public Integer getInquiryId() { return inquiryId; }
    public void setInquiryId(Integer inquiryId) { this.inquiryId = inquiryId; }
    public Integer getQuotationId() { return quotationId; }
    public void setQuotationId(Integer quotationId) { this.quotationId = quotationId; }
    public String getPackageId() { return packageId; }
    public void setPackageId(String packageId) { this.packageId = packageId; }
}
