package com.sanastours.controller;

import com.sanastours.entity.Inquiry;
import com.sanastours.entity.Quotation;
import com.sanastours.repository.BookingRepository;
import com.sanastours.repository.InquiryRepository;
import com.sanastours.repository.QuotationRepository;
import com.sanastours.repository.TourPackageRepository;
import com.sanastours.repository.ItineraryRepository;
import com.sanastours.security.CurrentUser;
import com.sanastours.util.Validation;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;

@RestController
@RequestMapping("/api/quotations")
public class QuotationController {

    @Autowired private QuotationRepository quotationRepository;
    @Autowired private InquiryRepository inquiryRepository;
    @Autowired private BookingRepository bookingRepository;
    @Autowired private TourPackageRepository tourPackageRepository;
    @Autowired private ItineraryRepository itineraryRepository;
    @Autowired private CurrentUser currentUser;

    @PostMapping("/create/{inquiryId}")
    public ResponseEntity<?> createQuotation(@PathVariable Integer inquiryId, @RequestBody Quotation request) {
        Inquiry inquiry = inquiryRepository.findById(inquiryId).orElse(null);
        if (inquiry == null) {
            return ResponseEntity.badRequest().body("Inquiry not found.");
        }

        // An inquiry is no longer moved to "Booked" on conversion, so whether
        // it has been booked is asked of the bookings. ("Booked" is still
        // checked for rows written before that change.)
        if ("Booked".equalsIgnoreCase(inquiry.getInquiryStatus())
                || bookingRepository.existsByQuotation_Inquiry_InquiryId(inquiry.getInquiryId())) {
            return ResponseEntity.badRequest().body("Cannot send a quotation for an inquiry that is already booked.");
        }
        // "Rejected" means the office turned the inquiry down, which is the
        // end of it.
        if ("Rejected".equalsIgnoreCase(inquiry.getInquiryStatus())) {
            return ResponseEntity.badRequest().body("This inquiry was rejected, so no quotation can be sent for it.");
        }

        String error = validatePricing(request, true);
        if (error != null) return ResponseEntity.badRequest().body(error);

        Quotation quotation = new Quotation();
        quotation.setInquiry(inquiry);
        applyFields(quotation, request);

        // The quotation is for whatever the customer enquired about, so when
        // the Send Quotation screen does not name a package or itinerary,
        // inherit them from the inquiry. A quotation with no package cannot be
        // converted into a booking later.
        if (quotation.getTourPackage() == null && inquiry.getTourPackage() != null) {
            quotation.setTourPackage(inquiry.getTourPackage());
        }
        if (quotation.getItinerary() == null && quotation.getTourPackage() != null) {
            quotation.setItinerary(itineraryRepository
                    .findFirstByTourPackage_PackageIdOrderByItineraryIdAsc(quotation.getTourPackage().getPackageId())
                    .orElse(null));
        }

        String status = request.getQuotationStatus() != null ? request.getQuotationStatus() : "Sent to Customer";
        if (!Validation.isOneOf(status, Validation.QUOTATION_STATUSES)) {
            return ResponseEntity.badRequest().body("Unknown quotation status: " + status);
        }
        quotation.setQuotationStatus(status);

        // Fix 4.8: sending a new quotation supersedes any earlier live one on
        // the same inquiry, so the customer is never looking at two offers
        // either of which the system would have accepted.
        if (!"Draft".equalsIgnoreCase(status)) {
            for (Quotation other : quotationRepository.findByInquiry_InquiryId(inquiry.getInquiryId())) {
                if ("Sent to Customer".equalsIgnoreCase(other.getQuotationStatus())
                        || "Draft".equalsIgnoreCase(other.getQuotationStatus())) {
                    other.setQuotationStatus("Expired");
                    quotationRepository.save(other);
                }
            }
        }

        // The inquiry status follows from the action, and is never typed in by
        // hand: sending a quotation puts the inquiry into "Quotation Sent",
        // saving a draft leaves it under review.
        inquiry.setInquiryStatus("Draft".equalsIgnoreCase(status)
                ? "Reviewing"
                : Validation.INQUIRY_QUOTATION_SENT);
        inquiryRepository.save(inquiry);

        return ResponseEntity.ok(quotationRepository.save(quotation));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateQuotation(@PathVariable Integer id, @RequestBody Quotation request) {
        Quotation quotation = quotationRepository.findById(id).orElse(null);
        if (quotation == null) {
            return ResponseEntity.badRequest().body("Quotation not found.");
        }

        // Fix 4.7: an accepted quotation had already been converted into a
        // booking at a particular price; editing it afterwards left the booking
        // and the quotation disagreeing about the amount owed.
        if ("Accepted".equalsIgnoreCase(quotation.getQuotationStatus())) {
            return ResponseEntity.badRequest().body(
                    "This quotation has been accepted and booked, so its pricing can no longer be changed. "
                    + "Edit the booking instead, or issue a new quotation.");
        }

        String error = validatePricing(request, true);
        if (error != null) return ResponseEntity.badRequest().body(error);

        applyFields(quotation, request);

        if (request.getQuotationStatus() != null) {
            if (!Validation.isOneOf(request.getQuotationStatus(), Validation.QUOTATION_STATUSES)) {
                return ResponseEntity.badRequest().body("Unknown quotation status: " + request.getQuotationStatus());
            }
            quotation.setQuotationStatus(request.getQuotationStatus());
        }

        return ResponseEntity.ok(quotationRepository.save(quotation));
    }

    /**
     * A customer's response to a quotation that was sent to them.
     *
     * Fix 2.7: "Reject Quotation" in the customer portal called
     * PUT /api/quotations/{id}, which only ADMIN and COORDINATOR may call, so
     * the button always failed with 403. Accepting still goes through
     * /api/bookings/convert.
     * Fix 4.10: rejecting now also moves the inquiry back to Reviewing, so the
     * office can see it needs another quotation, and the reason is stored
     * rather than appended into free-text notes by the browser.
     */
    @PutMapping("/{id}/respond")
    @Transactional
    public ResponseEntity<?> respondToQuotation(@PathVariable Integer id, @RequestBody Map<String, String> body) {
        Quotation quotation = quotationRepository.findById(id).orElse(null);
        if (quotation == null) return ResponseEntity.badRequest().body("Quotation not found.");

        if (currentUser.isCustomer()) {
            Inquiry inquiry = quotation.getInquiry();
            if (inquiry == null || inquiry.getCustomer() == null
                    || !currentUser.ownsCustomer(inquiry.getCustomer().getCustomerId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access denied.");
            }
        } else if (!currentUser.isStaff()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access denied.");
        }

        String response = body.get("response");
        if (!"Rejected".equalsIgnoreCase(response)) {
            return ResponseEntity.badRequest().body(
                    "Only a rejection can be sent here. To accept, use the booking conversion.");
        }

        String current = quotation.getQuotationStatus() == null ? "" : quotation.getQuotationStatus();
        if ("Accepted".equalsIgnoreCase(current)) {
            return ResponseEntity.badRequest().body("This quotation has already been accepted.");
        }
        if ("Rejected".equalsIgnoreCase(current)) {
            return ResponseEntity.badRequest().body("This quotation has already been rejected.");
        }

        String reason = body.get("reason");
        String comments = body.get("comments");
        if (reason == null || reason.isBlank()) {
            return ResponseEntity.badRequest().body("Please choose a reason for rejecting the quotation.");
        }

        quotation.setQuotationStatus("Rejected");
        String trail = "[Rejected by customer] " + reason.trim()
                + (comments == null || comments.isBlank() ? "" : " - " + comments.trim());
        String existing = quotation.getNotes() == null ? "" : quotation.getNotes();
        quotation.setNotes((existing + "\n\n" + trail).trim());
        quotationRepository.save(quotation);

        // The inquiry itself is not moved: a customer turning down one
        // quotation is a fact about that quotation, and the office can send
        // another. "Rejected" on an inquiry means the office rejected it,
        // which is a different and final thing.

        return ResponseEntity.ok(quotation);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteQuotation(@PathVariable Integer id) {
        Quotation quotation = quotationRepository.findById(id).orElse(null);
        if (quotation == null) return ResponseEntity.badRequest().body("Quotation not found.");
        if ("Accepted".equalsIgnoreCase(quotation.getQuotationStatus())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body("Cannot delete an accepted quotation that a booking was made from.");
        }
        try {
            quotationRepository.delete(quotation);
            return ResponseEntity.ok("Deleted");
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body("Cannot delete this quotation because a booking references it.");
        }
    }

    @GetMapping
    public ResponseEntity<?> getAllQuotations() {
        if (currentUser.isCustomer()) {
            Integer custId = currentUser.roleId();
            return ResponseEntity.ok(quotationRepository.findAll().stream()
                .filter(q -> q.getInquiry() != null && q.getInquiry().getCustomer() != null
                        && q.getInquiry().getCustomer().getCustomerId().equals(custId))
                // Fix 4.2: a quotation whose validity has passed is reported as
                // Expired rather than still being offered as live.
                .map(this::expireIfPastValidUntil)
                .toList());
        }
        return ResponseEntity.ok(quotationRepository.findAll().stream()
                .map(this::expireIfPastValidUntil)
                .toList());
    }

    private Quotation expireIfPastValidUntil(Quotation q) {
        if (q.getValidUntil() == null) return q;
        if (!"Sent to Customer".equalsIgnoreCase(q.getQuotationStatus())
                && !"Draft".equalsIgnoreCase(q.getQuotationStatus())) return q;
        if (q.getValidUntil().isBefore(LocalDate.now())) {
            q.setQuotationStatus("Expired");
            return quotationRepository.save(q);
        }
        return q;
    }

    private void applyFields(Quotation quotation, Quotation request) {
        if (request.getTourPackage() != null && request.getTourPackage().getPackageId() != null) {
            quotation.setTourPackage(tourPackageRepository.findById(request.getTourPackage().getPackageId()).orElse(null));
        } else {
            quotation.setTourPackage(null);
        }
        if (request.getItinerary() != null && request.getItinerary().getItineraryId() != null) {
            quotation.setItinerary(itineraryRepository.findById(request.getItinerary().getItineraryId()).orElse(null));
        } else {
            quotation.setItinerary(null);
        }

        quotation.setBasePrice(request.getBasePrice());
        quotation.setAdditionalCharges(request.getAdditionalCharges());
        quotation.setDiscount(request.getDiscount());
        // Fix 7.4: recompute the total server-side rather than trusting the
        // number the browser sent.
        quotation.setTotalAmount(computeTotal(request));
        quotation.setNotes(request.getNotes());
        // The covering message the customer reads with the quotation.
        quotation.setAdminMessage(request.getAdminMessage());
        quotation.setValidUntil(request.getValidUntil());
    }

    private BigDecimal computeTotal(Quotation request) {
        BigDecimal base = request.getBasePrice() == null ? BigDecimal.ZERO : request.getBasePrice();
        BigDecimal add = request.getAdditionalCharges() == null ? BigDecimal.ZERO : request.getAdditionalCharges();
        BigDecimal disc = request.getDiscount() == null ? BigDecimal.ZERO : request.getDiscount();
        return base.add(add).subtract(disc);
    }

    /** Fixes 7.4 and 7.5, which had no checks at all before. */
    private String validatePricing(Quotation request, boolean requireValidUntil) {
        BigDecimal base = request.getBasePrice();
        if (base == null || !Validation.isPositive(base)) {
            return "Base price must be greater than zero.";
        }
        if (request.getAdditionalCharges() != null && !Validation.isZeroOrMore(request.getAdditionalCharges())) {
            return "Additional charges cannot be negative.";
        }
        if (request.getDiscount() != null && !Validation.isZeroOrMore(request.getDiscount())) {
            return "Discount cannot be negative.";
        }
        if (!Validation.isPositive(computeTotal(request))) {
            return "The discount cannot be larger than the base price plus additional charges.";
        }
        if (requireValidUntil) {
            LocalDate validUntil = request.getValidUntil();
            if (validUntil == null) {
                return "Please set a date for how long the quotation is valid.";
            }
            if (validUntil.isBefore(LocalDate.now())) {
                return "The 'valid until' date cannot be in the past.";
            }
        }
        return null;
    }
}
