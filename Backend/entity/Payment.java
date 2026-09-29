package com.sanastours.entity;
import jakarta.persistence.*;
import java.time.LocalDate;
import java.math.BigDecimal;

@Entity @Table(name="Payment")
public class Payment {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name="payment_id") private Integer paymentId;
    @ManyToOne @JoinColumn(name="booking_id", referencedColumnName="booking_id", nullable=false)
    private Booking booking;
    @Column(name="payment_date") private LocalDate paymentDate;
    private BigDecimal amount;
    @Column(name="payment_status") private String paymentStatus;
    @Column(name="reference_number") private String referenceNumber;

    public Integer getPaymentId() { return paymentId; }
    public void setPaymentId(Integer paymentId) { this.paymentId = paymentId; }
    public Booking getBooking() { return booking; }
    public void setBooking(Booking booking) { this.booking = booking; }
    public LocalDate getPaymentDate() { return paymentDate; }
    public void setPaymentDate(LocalDate paymentDate) { this.paymentDate = paymentDate; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public String getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; }
    public String getReferenceNumber() { return referenceNumber; }
    public void setReferenceNumber(String referenceNumber) { this.referenceNumber = referenceNumber; }
}