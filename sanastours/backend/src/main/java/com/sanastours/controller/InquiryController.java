package com.sanastours.controller;

import com.sanastours.entity.Customer;
import com.sanastours.entity.Inquiry;
import com.sanastours.entity.Quotation;
import com.sanastours.entity.TourPackage;
import com.sanastours.repository.BookingRepository;
import com.sanastours.repository.CustomerRepository;
import com.sanastours.repository.InquiryRepository;
import com.sanastours.repository.QuotationRepository;
import com.sanastours.repository.TourPackageRepository;
import com.sanastours.security.CurrentUser;
import com.sanastours.util.Validation;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/inquiries")
public class InquiryController {

    @Autowired
    private InquiryRepository inquiryRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private QuotationRepository quotationRepository;

    @Autowired
    private TourPackageRepository tourPackageRepository;

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private CurrentUser currentUser;

    /**
     * Resolve the enquired-about package and derive the travel end date from
     * it.
     *
     * The length of a tour is a property of the package, not something the
     * customer chooses, so the end date is computed here rather than trusted
     * from the browser: a 5-day package starting on the 15th ends on the 19th.
     * Inquiries raised by the office without a package keep whatever dates
     * were entered.
     */
    private String applyPackage(Inquiry inquiry) {
        if (inquiry.getTourPackage() == null || inquiry.getTourPackage().getPackageId() == null) {
            inquiry.setTourPackage(null);
            return null;
        }
        TourPackage pkg = tourPackageRepository.findById(inquiry.getTourPackage().getPackageId()).orElse(null);
        if (pkg == null) return "Tour package not found.";
        inquiry.setTourPackage(pkg);

        if (inquiry.getDestinationArea() == null || inquiry.getDestinationArea().isBlank()) {
            inquiry.setDestinationArea(pkg.getPackageName());
        }
        if (inquiry.getTravelStartDate() != null) {
            Integer days = pkg.getDurationDays();
            if (days == null || days < 1) return "This tour package has no valid duration.";
            inquiry.setTravelEndDate(inquiry.getTravelStartDate().plusDays(days - 1L));
        }
        return null;
    }

    @PostMapping
    public ResponseEntity<?> submitInquiry(@RequestBody Inquiry inquiry) {
        // Fix: the debug System.out.println calls that dumped the auth object,
        // its authorities and the caller's role id to stdout on every request
        // have been removed.
        if (currentUser.isCustomer()) {
            Integer custId = currentUser.roleId();
            Customer customer = custId == null ? null : customerRepository.findById(custId).orElse(null);
            if (customer == null) {
                return ResponseEntity.badRequest().body("Customer not found! Please login/register first.");
            }
            inquiry.setCustomer(customer);
        } else if (inquiry.getCustomer() == null || inquiry.getCustomer().getCustomerId() == null) {
            return ResponseEntity.badRequest().body("Customer ID is required");
        } else {
            Customer customer = customerRepository.findById(inquiry.getCustomer().getCustomerId()).orElse(null);
            if (customer == null) return ResponseEntity.badRequest().body("Customer not found.");
            inquiry.setCustomer(customer);
        }

        String packageError = applyPackage(inquiry);
        if (packageError != null) return ResponseEntity.badRequest().body(packageError);

        String error = validate(inquiry, true);
        if (error != null) return ResponseEntity.badRequest().body(error);

        // A customer never chooses their own inquiry status.
        if (currentUser.isCustomer() || inquiry.getInquiryStatus() == null) {
            inquiry.setInquiryStatus("New");
        } else if (!Validation.isOneOf(inquiry.getInquiryStatus(), Validation.INQUIRY_STATUSES)) {
            return ResponseEntity.badRequest().body("Unknown inquiry status: " + inquiry.getInquiryStatus());
        }

        return ResponseEntity.ok(inquiryRepository.save(inquiry));
    }

    /**
     * Fix 2.8: a customer may edit their own inquiry while it is still New.
     * The customer portal already offered an Edit button for exactly that case,
     * but /api/inquiries/** was ADMIN/COORDINATOR only, so it always 403'd.
     */
    @PutMapping("/{id}")
    public ResponseEntity<?> updateInquiry(@PathVariable Integer id, @RequestBody Inquiry updatedData) {
        Inquiry inquiry = inquiryRepository.findById(id).orElse(null);
        if (inquiry == null) return ResponseEntity.notFound().build();

        boolean staff = currentUser.isStaff();
        if (!staff) {
            if (!currentUser.isCustomer() || inquiry.getCustomer() == null
                    || !currentUser.ownsCustomer(inquiry.getCustomer().getCustomerId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access denied.");
            }
            String status = inquiry.getInquiryStatus() == null ? "New" : inquiry.getInquiryStatus();
            if (!"New".equalsIgnoreCase(status)) {
                return ResponseEntity.badRequest().body(
                        "This inquiry is already " + status + ", so it can no longer be edited. "
                        + "Please contact us or send a new inquiry.");
            }
        }

        // An edit keeps the package it was raised against unless one is sent,
        // and the end date is re-derived from it the same way as on creation.
        if (updatedData.getTourPackage() == null) {
            updatedData.setTourPackage(inquiry.getTourPackage());
        }
        String packageError = applyPackage(updatedData);
        if (packageError != null) return ResponseEntity.badRequest().body(packageError);

        // Dates must still be in order, but an existing inquiry is not blocked
        // from being corrected just because its travel date has since passed.
        String error = validate(updatedData, false);
        if (error != null) return ResponseEntity.badRequest().body(error);

        inquiry.setTourPackage(updatedData.getTourPackage());
        inquiry.setTravelStartDate(updatedData.getTravelStartDate());
        inquiry.setTravelEndDate(updatedData.getTravelEndDate());
        inquiry.setNumberOfTravellers(updatedData.getNumberOfTravellers());
        inquiry.setDestinationArea(updatedData.getDestinationArea());
        inquiry.setAccommodationRequirement(updatedData.getAccommodationRequirement());
        inquiry.setTransportationRequirement(updatedData.getTransportationRequirement());
        inquiry.setAdditionalRequests(updatedData.getAdditionalRequests());

        // Fix 4.12: the status used to be overwritten with whatever the form
        // sent, and the admin form's dropdown has no Booked or Rejected option,
        // so editing a booked inquiry silently moved it backwards. Only staff
        // may change it, only to a known value, and never away from Booked.
        if (staff && updatedData.getInquiryStatus() != null
                && !updatedData.getInquiryStatus().equalsIgnoreCase(inquiry.getInquiryStatus())) {
            if (!Validation.isOneOf(updatedData.getInquiryStatus(), Validation.INQUIRY_STATUSES)) {
                return ResponseEntity.badRequest().body("Unknown inquiry status: " + updatedData.getInquiryStatus());
            }
            if ("Booked".equalsIgnoreCase(inquiry.getInquiryStatus())) {
                return ResponseEntity.badRequest().body(
                        "This inquiry has been converted to a booking; its status cannot be changed here.");
            }
            inquiry.setInquiryStatus(updatedData.getInquiryStatus());
        }

        return ResponseEntity.ok(inquiryRepository.save(inquiry));
    }

    @GetMapping
    public ResponseEntity<?> getAllInquiries() {
        if (currentUser.isCustomer()) {
            Integer custId = currentUser.roleId();
            return ResponseEntity.ok(inquiryRepository.findAll().stream()
                    .filter(i -> i.getCustomer() != null && i.getCustomer().getCustomerId().equals(custId))
                    .toList());
        }
        return ResponseEntity.ok(inquiryRepository.findAll());
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateInquiryStatus(@PathVariable Integer id, @RequestBody Map<String, String> body) {
        Inquiry inquiry = inquiryRepository.findById(id).orElse(null);
        if (inquiry == null) return ResponseEntity.badRequest().body("Inquiry not found");

        // Fix 4.13: this used to take a raw request body and strip quote
        // characters out of it, then store whatever was left with no check.
        String status = body.get("inquiryStatus");
        if (status == null || status.isBlank()) {
            return ResponseEntity.badRequest().body("inquiryStatus is required.");
        }
        if (!Validation.isOneOf(status, Validation.INQUIRY_STATUSES)) {
            return ResponseEntity.badRequest().body("Unknown inquiry status: " + status);
        }
        if ("Booked".equalsIgnoreCase(inquiry.getInquiryStatus())) {
            return ResponseEntity.badRequest().body("This inquiry has already been converted to a booking.");
        }
        inquiry.setInquiryStatus(status);
        return ResponseEntity.ok(inquiryRepository.save(inquiry));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteInquiry(@PathVariable Integer id) {
        Inquiry inquiry = inquiryRepository.findById(id).orElse(null);
        if (inquiry == null) return ResponseEntity.badRequest().body("Inquiry not found");

        if (Validation.isQuotationSent(inquiry.getInquiryStatus())
                || "Booked".equalsIgnoreCase(inquiry.getInquiryStatus())) {
            return ResponseEntity.badRequest().body(
                "Cannot delete this inquiry because it has already been " + inquiry.getInquiryStatus().toLowerCase() + ".");
        }
        if (!quotationRepository.findByInquiry_InquiryId(id).isEmpty()) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body("Cannot delete this inquiry because quotations have been raised against it.");
        }

        inquiryRepository.deleteById(id);
        return ResponseEntity.ok("Deleted");
    }

    /**
     * The office turns an inquiry down. This is the end of the inquiry: no
     * further quotation can be sent for it and the customer can only read it.
     *
     * Fix 4.11: the rejection reason was accepted and then thrown away - the
     * line that stored it was commented out and the entity had no field for
     * it. It now has a field of its own rather than being appended to the
     * customer's additional requests, which is their text, shown back to them.
     */
    @PutMapping("/{id}/reject")
    @Transactional
    public ResponseEntity<?> rejectInquiry(@PathVariable Integer id, @RequestBody Map<String, String> body) {
        Inquiry inquiry = inquiryRepository.findById(id).orElse(null);
        if (inquiry == null) return ResponseEntity.badRequest().body("Inquiry not found");

        if ("Booked".equalsIgnoreCase(inquiry.getInquiryStatus())
                || bookingRepository.existsByQuotation_Inquiry_InquiryId(id)) {
            return ResponseEntity.badRequest().body("This inquiry has already been converted to a booking.");
        }
        if ("Rejected".equalsIgnoreCase(inquiry.getInquiryStatus())) {
            return ResponseEntity.badRequest().body("This inquiry has already been rejected.");
        }

        String reason = body.get("reason");
        if (reason == null || reason.isBlank()) {
            return ResponseEntity.badRequest().body("Please give a reason for rejecting the inquiry.");
        }

        inquiry.setInquiryStatus("Rejected");
        inquiry.setRejectionReason(reason.trim());

        // A quotation already sent for this inquiry must not stay acceptable,
        // or the customer could still book a trip the office has turned down.
        for (Quotation quotation : quotationRepository.findByInquiry_InquiryId(id)) {
            if ("Sent to Customer".equalsIgnoreCase(quotation.getQuotationStatus())
                    || "Draft".equalsIgnoreCase(quotation.getQuotationStatus())) {
                quotation.setQuotationStatus("Expired");
                quotationRepository.save(quotation);
            }
        }

        return ResponseEntity.ok(inquiryRepository.save(inquiry));
    }

    /** Fixes 7.1, 7.2 and 7.3 for both the customer and the admin inquiry forms. */
    private String validate(Inquiry inquiry, boolean mustBeFuture) {
        String dateError = Validation.checkTravelDates(
                inquiry.getTravelStartDate(), inquiry.getTravelEndDate(), true, mustBeFuture);
        if (dateError != null) return dateError;

        String travellerError = Validation.checkTravellers(inquiry.getNumberOfTravellers());
        if (travellerError != null) return travellerError;

        if (inquiry.getDestinationArea() == null || inquiry.getDestinationArea().isBlank()) {
            return "Please tell us the destination or area you would like to visit.";
        }
        return null;
    }
}
