package com.sanastours.controller;

import com.sanastours.dto.PaymentRequest;
import com.sanastours.entity.Booking;
import com.sanastours.entity.Payment;
import com.sanastours.repository.BookingRepository;
import com.sanastours.repository.PaymentRepository;
import com.sanastours.security.CurrentUser;
import com.sanastours.util.Validation;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    @Autowired private PaymentRepository paymentRepository;
    @Autowired private BookingRepository bookingRepository;
    @Autowired private CurrentUser currentUser;

    @GetMapping
    public ResponseEntity<?> getAllPayments() {
        if (currentUser.isCustomer()) {
            Integer custId = currentUser.roleId();
            return ResponseEntity.ok(paymentRepository.findAll().stream()
                .filter(p -> p.getBooking() != null && p.getBooking().getCustomer() != null
                        && p.getBooking().getCustomer().getCustomerId().equals(custId))
                .toList());
        }
        return ResponseEntity.ok(paymentRepository.findAll());
    }

    /**
     * Staff-recorded payment.
     *
     * Fix 4.14: this endpoint skipped every check the customer endpoint had -
     * no cancelled-booking check and no remaining-balance check - so an admin
     * could record payments far exceeding the booking total.
     */
    @PostMapping("/admin-create")
    @Transactional
    public ResponseEntity<?> adminCreatePayment(@RequestBody Payment request) {
        if (request.getBooking() == null || request.getBooking().getBookingId() == null) {
            return ResponseEntity.badRequest().body("Booking is required.");
        }
        Booking booking = bookingRepository.findById(request.getBooking().getBookingId()).orElse(null);
        if (booking == null) return ResponseEntity.badRequest().body("Booking not found.");

        String status = request.getPaymentStatus() != null ? request.getPaymentStatus() : "Paid";
        if (!Validation.isOneOf(status, Validation.PAYMENT_STATUSES)) {
            return ResponseEntity.badRequest().body("Unknown payment status: " + status);
        }

        String error = checkPayment(booking, request.getAmount(), request.getPaymentMethod(), status, null);
        if (error != null) return ResponseEntity.badRequest().body(error);

        Payment payment = new Payment();
        payment.setBooking(booking);
        payment.setAmount(request.getAmount());
        payment.setPaymentDate(request.getPaymentDate() != null ? request.getPaymentDate() : LocalDate.now());
        payment.setReferenceNumber(request.getReferenceNumber());
        payment.setNotes(request.getNotes());
        payment.setPaymentMethod(request.getPaymentMethod());
        payment.setPaymentStatus(status);

        return ResponseEntity.ok(paymentRepository.save(payment));
    }

    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<?> updatePayment(@PathVariable Integer id, @RequestBody Payment request) {
        Payment payment = paymentRepository.findById(id).orElse(null);
        if (payment == null) return ResponseEntity.badRequest().body("Payment not found");

        Booking booking = payment.getBooking();
        if (request.getBooking() != null && request.getBooking().getBookingId() != null) {
            Booking requested = bookingRepository.findById(request.getBooking().getBookingId()).orElse(null);
            if (requested == null) return ResponseEntity.badRequest().body("Booking not found.");
            booking = requested;
        }

        String status = request.getPaymentStatus() != null ? request.getPaymentStatus() : payment.getPaymentStatus();
        if (status != null && !Validation.isOneOf(status, Validation.PAYMENT_STATUSES)) {
            return ResponseEntity.badRequest().body("Unknown payment status: " + status);
        }

        String error = checkPayment(booking, request.getAmount(), request.getPaymentMethod(), status, id);
        if (error != null) return ResponseEntity.badRequest().body(error);

        payment.setBooking(booking);
        payment.setAmount(request.getAmount());
        // Fix 4.16: a blank date box used to overwrite the recorded date with
        // null; keep the stored value when nothing is supplied.
        if (request.getPaymentDate() != null) {
            payment.setPaymentDate(request.getPaymentDate());
        }
        payment.setReferenceNumber(request.getReferenceNumber());
        payment.setNotes(request.getNotes());
        if (request.getPaymentMethod() != null) {
            payment.setPaymentMethod(request.getPaymentMethod());
        }
        if (request.getPaymentStatus() != null) {
            payment.setPaymentStatus(request.getPaymentStatus());
        }

        Payment saved = paymentRepository.save(payment);
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deletePayment(@PathVariable Integer id) {
        Payment payment = paymentRepository.findById(id).orElse(null);
        if (payment == null) return ResponseEntity.notFound().build();
        paymentRepository.delete(payment);
        return ResponseEntity.ok("Deleted");
    }

    /** Customer-submitted payment. */
    @PostMapping
    @Transactional
    public ResponseEntity<?> addPayment(@RequestBody PaymentRequest request) {
        if (request.getBookingId() == null) {
            return ResponseEntity.badRequest().body("Booking is required.");
        }
        Booking booking = bookingRepository.findById(request.getBookingId()).orElse(null);
        if (booking == null) return ResponseEntity.badRequest().body("Booking not found");

        // A customer may only pay their own booking.
        if (currentUser.isCustomer()) {
            if (booking.getCustomer() == null || !currentUser.ownsCustomer(booking.getCustomer().getCustomerId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access denied.");
            }
        }

        if (request.getReferenceNumber() == null || request.getReferenceNumber().isBlank()) {
            return ResponseEntity.badRequest().body("A payment reference or receipt number is required.");
        }

        String error = checkPayment(booking, request.getAmount(), request.getPaymentMethod(), "Pending", null);
        if (error != null) return ResponseEntity.badRequest().body(error);

        Payment payment = new Payment();
        payment.setBooking(booking);
        payment.setAmount(request.getAmount());
        payment.setReferenceNumber(request.getReferenceNumber().trim());
        payment.setPaymentDate(LocalDate.now());
        payment.setPaymentStatus("Pending");
        payment.setNotes(request.getNotes());
        payment.setPaymentMethod(request.getPaymentMethod());
        return ResponseEntity.ok(paymentRepository.save(payment));
    }

    @PutMapping("/{id}/status")
    @Transactional
    public ResponseEntity<?> updatePaymentStatus(@PathVariable Integer id, @RequestBody Map<String, String> body) {
        Payment payment = paymentRepository.findById(id).orElse(null);
        if (payment == null) return ResponseEntity.badRequest().body("Payment not found");

        // Fix 4.13: this took a raw body and stripped quote characters out of
        // it, storing whatever was left with no whitelist at all.
        String status = body.get("paymentStatus");
        if (status == null || status.isBlank()) {
            return ResponseEntity.badRequest().body("paymentStatus is required.");
        }
        if (!Validation.isOneOf(status, Validation.PAYMENT_STATUSES)) {
            return ResponseEntity.badRequest().body("Unknown payment status: " + status);
        }

        payment.setPaymentStatus(status);
        return ResponseEntity.ok(paymentRepository.save(payment));
    }

    /**
     * One set of rules for every way a payment can be recorded.
     *
     * Fix 4.15: there was no check that the amount was positive, so a negative
     * payment was accepted and reduced the amount paid.
     * Fix 4.14: the balance check now applies to staff-entered payments too.
     */
    private String checkPayment(Booking booking, BigDecimal amount, String method, String status, Integer ignorePaymentId) {
        if ("Cancelled".equalsIgnoreCase(booking.getBookingStatus())) {
            return "Cannot record a payment against a cancelled booking.";
        }
        if (!Validation.isPositive(amount)) {
            return "The payment amount must be greater than zero.";
        }
        if (method != null && !method.isBlank() && !Validation.isOneOf(method, Validation.PAYMENT_METHODS)) {
            return "Unknown payment method: " + method;
        }

        // A refund or a rejected payment does not count towards the balance.
        boolean counts = !"Refunded".equalsIgnoreCase(status) && !"Rejected".equalsIgnoreCase(status);
        if (counts && booking.getTotalAmount() != null) {
            List<Payment> existing = paymentRepository.findByBooking_BookingId(booking.getBookingId());
            BigDecimal alreadyPaid = existing.stream()
                .filter(p -> ignorePaymentId == null || !ignorePaymentId.equals(p.getPaymentId()))
                .filter(p -> !"Refunded".equalsIgnoreCase(p.getPaymentStatus())
                        && !"Rejected".equalsIgnoreCase(p.getPaymentStatus()))
                .map(Payment::getAmount)
                .filter(a -> a != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal remaining = booking.getTotalAmount().subtract(alreadyPaid);
            if (amount.compareTo(remaining) > 0) {
                return "Payment amount exceeds the remaining balance of " + remaining + ".";
            }
        }
        return null;
    }
}
