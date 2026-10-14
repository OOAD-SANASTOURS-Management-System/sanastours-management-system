package com.sanastours.controller;

import com.sanastours.dto.PaymentRequest;
import com.sanastours.entity.Booking;
import com.sanastours.entity.Payment;
import com.sanastours.entity.PaymentSlip;
import com.sanastours.repository.BookingRepository;
import com.sanastours.repository.PaymentRepository;
import com.sanastours.repository.PaymentSlipRepository;
import com.sanastours.security.CurrentUser;
import com.sanastours.util.Validation;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    @Autowired private PaymentRepository paymentRepository;
    @Autowired private BookingRepository bookingRepository;
    @Autowired private PaymentSlipRepository paymentSlipRepository;
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

        Payment saved = paymentRepository.save(payment);
        syncBookingWithPayments(booking, false);
        return ResponseEntity.ok(saved);
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

        Booking previousBooking = payment.getBooking();
        boolean wasPaid = "Paid".equalsIgnoreCase(payment.getPaymentStatus());

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
        syncBookingWithPayments(booking, wasPaid);
        // The payment was moved to a different booking: the old one may have
        // just lost its only Paid payment.
        if (previousBooking != null && !previousBooking.getBookingId().equals(booking.getBookingId())) {
            syncBookingWithPayments(previousBooking, wasPaid);
        }
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<?> deletePayment(@PathVariable Integer id) {
        Payment payment = paymentRepository.findById(id).orElse(null);
        if (payment == null) return ResponseEntity.notFound().build();
        Booking booking = payment.getBooking();
        boolean wasPaid = "Paid".equalsIgnoreCase(payment.getPaymentStatus());
        paymentRepository.delete(payment);
        paymentRepository.flush();
        syncBookingWithPayments(booking, wasPaid);
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

        // A rejection has to say why: the customer reads this reason on their
        // payment, and "Rejected" with no explanation tells them nothing.
        if ("Rejected".equalsIgnoreCase(status)) {
            String reason = body.get("rejectionReason");
            if (reason == null || reason.isBlank()) {
                return ResponseEntity.badRequest().body("Please give a reason for rejecting the payment.");
            }
            payment.setRejectionReason(reason.trim());
        } else {
            // Any other status clears a stale reason from an earlier rejection.
            payment.setRejectionReason(null);
        }

        boolean wasPaid = "Paid".equalsIgnoreCase(payment.getPaymentStatus());
        payment.setPaymentStatus(status);
        Payment saved = paymentRepository.save(payment);
        syncBookingWithPayments(saved.getBooking(), wasPaid);
        return ResponseEntity.ok(saved);
    }

    /**
     * Keeps a booking's status in step with its payments.
     *
     * A booking made from an accepted quotation is Pending. Once the office
     * marks a payment on it as Paid, the booking becomes Confirmed, and the
     * customer can open it. Only Pending moves to Confirmed here, so a
     * Cancelled, Ongoing or Completed booking is never touched.
     *
     * If the payment that confirmed the booking is later changed away from
     * Paid (rejected, refunded, deleted) and no other Paid payment remains,
     * the booking goes back to Pending. That happens only when the change
     * actually removed a Paid payment (mayRevert), so a booking the office
     * confirmed by hand, with no payment on record, is left alone.
     */
    private void syncBookingWithPayments(Booking booking, boolean mayRevert) {
        if (booking == null || booking.getBookingId() == null) return;
        String current = booking.getBookingStatus() == null ? "" : booking.getBookingStatus();
        boolean hasPaid = paymentRepository.findByBooking_BookingId(booking.getBookingId()).stream()
                .anyMatch(p -> "Paid".equalsIgnoreCase(p.getPaymentStatus()));

        if (hasPaid && "Pending".equalsIgnoreCase(current)) {
            booking.setBookingStatus("Confirmed");
            bookingRepository.save(booking);
        } else if (!hasPaid && mayRevert && "Confirmed".equalsIgnoreCase(current)) {
            booking.setBookingStatus("Pending");
            bookingRepository.save(booking);
        }
    }

    // ---------------------------------------------------------------- slips

    /** Largest slip we accept. Keep in step with spring.servlet.multipart in application.properties. */
    private static final int MAX_SLIP_BYTES = 5 * 1024 * 1024;

    /**
     * Attach the bank slip for a payment. One slip per payment: uploading
     * again replaces the previous file.
     */
    @PostMapping("/{id}/slip")
    @Transactional
    public ResponseEntity<?> uploadSlip(@PathVariable Integer id, @RequestParam("file") MultipartFile file) {
        Payment payment = paymentRepository.findById(id).orElse(null);
        if (payment == null) return ResponseEntity.badRequest().body("Payment not found.");

        ResponseEntity<?> denied = denyIfNotTheirs(payment);
        if (denied != null) return denied;

        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body("Please choose a PDF file to upload.");
        }
        if (file.getSize() > MAX_SLIP_BYTES) {
            return ResponseEntity.badRequest().body("The slip must be 5 MB or smaller.");
        }
        String name = file.getOriginalFilename() == null ? "slip.pdf" : file.getOriginalFilename();
        boolean looksLikePdf = "application/pdf".equalsIgnoreCase(file.getContentType())
                || name.toLowerCase().endsWith(".pdf");
        if (!looksLikePdf) {
            return ResponseEntity.badRequest().body("The payment slip must be a PDF.");
        }

        try {
            PaymentSlip slip = paymentSlipRepository.findByPayment_PaymentId(id).orElseGet(PaymentSlip::new);
            slip.setPayment(payment);
            // Strip any directory part: the browser sends the name the file had
            // on the customer's machine, which is theirs to choose.
            slip.setFileName(name.replaceAll(".*[/\\\\]", ""));
            slip.setContentType("application/pdf");
            slip.setFileSize((int) file.getSize());
            slip.setUploadedAt(java.time.LocalDateTime.now());
            slip.setContent(file.getBytes());
            paymentSlipRepository.save(slip);
            return ResponseEntity.ok("Slip uploaded.");
        } catch (java.io.IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Could not read the uploaded file.");
        }
    }

    /** The stored slip, for the customer who sent it and for the office. */
    @GetMapping("/{id}/slip")
    public ResponseEntity<?> downloadSlip(@PathVariable Integer id) {
        Payment payment = paymentRepository.findById(id).orElse(null);
        if (payment == null) return ResponseEntity.notFound().build();

        ResponseEntity<?> denied = denyIfNotTheirs(payment);
        if (denied != null) return denied;

        PaymentSlip slip = paymentSlipRepository.findByPayment_PaymentId(id).orElse(null);
        if (slip == null) return ResponseEntity.notFound().build();

        return ResponseEntity.ok()
                .header("Content-Type", "application/pdf")
                .header("Content-Disposition", "inline; filename=\"" + slip.getFileName() + "\"")
                .body(slip.getContent());
    }

    /**
     * The ids of payments that have a slip, so a list screen can show which
     * rows have one without fetching any files.
     */
    @GetMapping("/slips")
    public ResponseEntity<?> paymentIdsWithSlip() {
        List<Integer> ids = paymentSlipRepository.findPaymentIdsWithSlip();
        if (currentUser.isCustomer()) {
            Integer custId = currentUser.roleId();
            java.util.Set<Integer> mine = paymentRepository.findAll().stream()
                    .filter(p -> p.getBooking() != null && p.getBooking().getCustomer() != null
                            && p.getBooking().getCustomer().getCustomerId().equals(custId))
                    .map(Payment::getPaymentId)
                    .collect(java.util.stream.Collectors.toSet());
            ids = ids.stream().filter(mine::contains).toList();
        }
        return ResponseEntity.ok(ids);
    }

    /** A customer may only touch slips on their own bookings; staff may see any. */
    private ResponseEntity<?> denyIfNotTheirs(Payment payment) {
        if (currentUser.isStaff()) return null;
        if (currentUser.isCustomer()) {
            Booking booking = payment.getBooking();
            if (booking != null && booking.getCustomer() != null
                    && currentUser.ownsCustomer(booking.getCustomer().getCustomerId())) {
                return null;
            }
        }
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access denied.");
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
