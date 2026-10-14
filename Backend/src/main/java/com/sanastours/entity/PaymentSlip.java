package com.sanastours.entity;

import jakarta.persistence.*;

/**
 * The bank slip a customer uploads to evidence a payment.
 *
 * Kept in a table of its own rather than as a column on `payment`: a @Lob on
 * the Payment entity would be loaded and serialised on every payments list,
 * so the admin Payments screen would ship every PDF it has ever been sent.
 * This way the file is only read when somebody actually opens it.
 */
@Entity
@Table(name = "payment_slip")
public class PaymentSlip {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Integer slipId;

    @OneToOne @JoinColumn(name = "payment_id", nullable = false, unique = true) private Payment payment;

    private String fileName;
    private String contentType;
    private Integer fileSize;
    private java.time.LocalDateTime uploadedAt;

    @Lob
    @Column(name = "content", columnDefinition = "LONGBLOB")
    private byte[] content;

    public Integer getSlipId() { return slipId; }
    public void setSlipId(Integer slipId) { this.slipId = slipId; }
    public Payment getPayment() { return payment; }
    public void setPayment(Payment payment) { this.payment = payment; }
    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }
    public String getContentType() { return contentType; }
    public void setContentType(String contentType) { this.contentType = contentType; }
    public Integer getFileSize() { return fileSize; }
    public void setFileSize(Integer fileSize) { this.fileSize = fileSize; }
    public java.time.LocalDateTime getUploadedAt() { return uploadedAt; }
    public void setUploadedAt(java.time.LocalDateTime uploadedAt) { this.uploadedAt = uploadedAt; }
    public byte[] getContent() { return content; }
    public void setContent(byte[] content) { this.content = content; }
}
