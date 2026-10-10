package com.sanastours.controller;

import com.sanastours.dto.BookingRequest;
import com.sanastours.entity.Booking;
import com.sanastours.entity.Driver;
import com.sanastours.entity.Inquiry;
import com.sanastours.entity.Quotation;
import com.sanastours.entity.Vehicle;
import com.sanastours.repository.BookingRepository;
import com.sanastours.repository.CustomerRepository;
import com.sanastours.repository.DriverRepository;
import com.sanastours.repository.InquiryRepository;
import com.sanastours.repository.ItineraryRepository;
import com.sanastours.repository.QuotationRepository;
import com.sanastours.repository.TourPackageRepository;
import com.sanastours.repository.VehicleRepository;
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
@RequestMapping("/api/bookings")
public class BookingController {

    @Autowired private BookingRepository bookingRepository;
    @Autowired private InquiryRepository inquiryRepository;
    @Autowired private TourPackageRepository tourPackageRepository;
    @Autowired private QuotationRepository quotationRepository;
    @Autowired private CustomerRepository customerRepository;
    @Autowired private ItineraryRepository itineraryRepository;
    @Autowired private DriverRepository driverRepository;
    @Autowired private VehicleRepository vehicleRepository;
    @Autowired private CurrentUser currentUser;

    @GetMapping
    public ResponseEntity<?> getAllBookings() {
        if (currentUser.isCustomer()) {
            Integer custId = currentUser.roleId();
            return ResponseEntity.ok(bookingRepository.findAll().stream()
                .filter(b -> b.getCustomer() != null && b.getCustomer().getCustomerId().equals(custId))
                .toList());
        }
        if (currentUser.isDriver()) {
            Integer driverId = currentUser.roleId();
            return ResponseEntity.ok(bookingRepository.findAll().stream()
                .filter(b -> b.getDriver() != null && b.getDriver().getDriverId().equals(driverId))
                .toList());
        }
        return ResponseEntity.ok(bookingRepository.findAll());
    }

    @PostMapping
    public ResponseEntity<?> createBooking(@RequestBody Booking request) {
        Booking booking = new Booking();

        if (request.getCustomer() != null && request.getCustomer().getCustomerId() != null) {
            booking.setCustomer(customerRepository.findById(request.getCustomer().getCustomerId()).orElse(null));
        }
        if (booking.getCustomer() == null) {
            return ResponseEntity.badRequest().body("Customer is required.");
        }

        if (request.getTourPackage() != null && request.getTourPackage().getPackageId() != null) {
            booking.setTourPackage(tourPackageRepository.findById(request.getTourPackage().getPackageId()).orElse(null));
        }
        if (booking.getTourPackage() == null) {
            return ResponseEntity.badRequest().body("Tour Package is required.");
        }

        if (request.getQuotation() != null && request.getQuotation().getQuotationId() != null) {
            Quotation quotation = quotationRepository.findById(request.getQuotation().getQuotationId()).orElse(null);
            // Fix 4.18: the admin form lists every quotation in the system, so
            // a booking could be linked to another customer's quotation.
            if (quotation != null && quotation.getInquiry() != null && quotation.getInquiry().getCustomer() != null
                    && !quotation.getInquiry().getCustomer().getCustomerId().equals(booking.getCustomer().getCustomerId())) {
                return ResponseEntity.badRequest().body("That quotation belongs to a different customer.");
            }
            booking.setQuotation(quotation);
        }

        if (request.getItinerary() != null && request.getItinerary().getItineraryId() != null) {
            booking.setItinerary(itineraryRepository.findById(request.getItinerary().getItineraryId()).orElse(null));
        }

        String error = applyEditableFields(booking, request);
        if (error != null) return ResponseEntity.badRequest().body(error);

        booking.setBookingStatus(request.getBookingStatus() != null ? request.getBookingStatus() : "Confirmed");
        if (!Validation.isOneOf(booking.getBookingStatus(), Validation.BOOKING_STATUSES)) {
            return ResponseEntity.badRequest().body("Unknown booking status: " + booking.getBookingStatus());
        }

        return ResponseEntity.ok(bookingRepository.save(booking));
    }

    /** Staff-only full update (fix 2.4: drivers use /{id}/status instead). */
    @PutMapping("/{id}")
    public ResponseEntity<?> updateBooking(@PathVariable Integer id, @RequestBody Booking request) {
        Booking booking = bookingRepository.findById(id).orElse(null);
        if (booking == null) return ResponseEntity.badRequest().body("Booking not found");

        if (request.getCustomer() != null && request.getCustomer().getCustomerId() != null) {
            booking.setCustomer(customerRepository.findById(request.getCustomer().getCustomerId()).orElse(booking.getCustomer()));
        }
        if (request.getTourPackage() != null && request.getTourPackage().getPackageId() != null) {
            booking.setTourPackage(tourPackageRepository.findById(request.getTourPackage().getPackageId()).orElse(booking.getTourPackage()));
        }
        if (request.getQuotation() != null && request.getQuotation().getQuotationId() != null) {
            booking.setQuotation(quotationRepository.findById(request.getQuotation().getQuotationId()).orElse(null));
        }
        if (request.getItinerary() != null && request.getItinerary().getItineraryId() != null) {
            booking.setItinerary(itineraryRepository.findById(request.getItinerary().getItineraryId()).orElse(null));
        }

        String error = applyEditableFields(booking, request);
        if (error != null) return ResponseEntity.badRequest().body(error);

        if (request.getBookingStatus() != null) {
            if (!Validation.isOneOf(request.getBookingStatus(), Validation.BOOKING_STATUSES)) {
                return ResponseEntity.badRequest().body("Unknown booking status: " + request.getBookingStatus());
            }
            booking.setBookingStatus(request.getBookingStatus());
        }

        return ResponseEntity.ok(bookingRepository.save(booking));
    }

    /**
     * Narrow status-only endpoint.
     *
     * Fix 2.6: the customer's "Cancel Booking" button called PUT /api/bookings/{id},
     * which customers are not allowed to call, so it always failed with 403.
     * Fix 2.4: the driver's tour progress used that same full update, which let
     * a driver rewrite any booking in the system.
     *
     * Each role may make only the transitions that belong to it, on its own
     * bookings.
     */
    @PutMapping("/{id}/status")
    @Transactional
    public ResponseEntity<?> updateBookingStatus(@PathVariable Integer id, @RequestBody Map<String, String> body) {
        Booking booking = bookingRepository.findById(id).orElse(null);
        if (booking == null) return ResponseEntity.badRequest().body("Booking not found");

        String status = body.get("bookingStatus");
        if (status == null || status.isBlank()) {
            return ResponseEntity.badRequest().body("bookingStatus is required.");
        }
        if (!Validation.isOneOf(status, Validation.BOOKING_STATUSES)) {
            return ResponseEntity.badRequest().body("Unknown booking status: " + status);
        }

        if (currentUser.isCustomer()) {
            if (booking.getCustomer() == null || !currentUser.ownsCustomer(booking.getCustomer().getCustomerId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access denied.");
            }
            if (!"Cancelled".equalsIgnoreCase(status)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("You can only cancel your own booking.");
            }
            String current = booking.getBookingStatus() == null ? "" : booking.getBookingStatus();
            if (!("Pending".equalsIgnoreCase(current) || "Confirmed".equalsIgnoreCase(current))) {
                return ResponseEntity.badRequest().body("A booking that is " + current + " can no longer be cancelled.");
            }
        } else if (currentUser.isDriver()) {
            if (booking.getDriver() == null || !currentUser.ownsDriver(booking.getDriver().getDriverId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("This tour is not assigned to you.");
            }
            if (!("Ongoing".equalsIgnoreCase(status) || "Completed".equalsIgnoreCase(status))) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("A driver can only start or complete a tour.");
            }
        } else if (!currentUser.isStaff()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access denied.");
        }

        // Customers may add a cancellation reason to the notes.
        String note = body.get("note");
        if (note != null && !note.isBlank()) {
            String existing = booking.getNotes() == null ? "" : booking.getNotes();
            booking.setNotes((existing + "\n\n" + note.trim()).trim());
        }

        booking.setBookingStatus(status);
        Booking saved = bookingRepository.save(booking);

        // Fix 5.7: keep the assigned driver and vehicle status in step with the
        // tour, instead of leaving those fields purely decorative.
        releaseOrReserveResources(saved, status);

        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteBooking(@PathVariable Integer id) {
        Booking booking = bookingRepository.findById(id).orElse(null);
        if (booking == null) return ResponseEntity.badRequest().body("Booking not found");
        try {
            bookingRepository.delete(booking);
            return ResponseEntity.ok("Deleted");
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body("Cannot delete this booking because payments or a trip are recorded against it.");
        }
    }

    /**
     * Turn an accepted quotation into a booking.
     *
     * Fix 4.1: the caller now says which quotation was accepted. The old code
     * took quotes.get(size - 1) - the last row returned - so with two
     * quotations on one inquiry, accepting the first booked the second one's
     * amount and marked the wrong quotation Accepted.
     * Fix 4.3: the quotation's itinerary and package are carried onto the
     * booking, instead of leaving every converted booking with no itinerary.
     * Fix 4.2: an expired quotation can no longer be accepted.
     */
    @Transactional
    @PostMapping("/convert")
    public ResponseEntity<?> convertToBooking(@RequestBody BookingRequest request) {
        if (request.getInquiryId() == null) {
            return ResponseEntity.badRequest().body("Inquiry is required.");
        }

        Inquiry inquiry = inquiryRepository.findById(request.getInquiryId()).orElse(null);
        if (inquiry == null) return ResponseEntity.badRequest().body("Inquiry not found!");

        if (currentUser.isCustomer()) {
            if (inquiry.getCustomer() == null || !currentUser.ownsCustomer(inquiry.getCustomer().getCustomerId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access denied.");
            }
        }

        if ("Booked".equalsIgnoreCase(inquiry.getInquiryStatus())) {
            return ResponseEntity.badRequest().body("This inquiry has already been converted to a booking.");
        }
        if (!"Quoted".equalsIgnoreCase(inquiry.getInquiryStatus())) {
            return ResponseEntity.badRequest().body("You can only book an inquiry after it has been Quoted by an Admin.");
        }

        List<Quotation> quotes = quotationRepository.findByInquiry_InquiryId(inquiry.getInquiryId());
        if (quotes.isEmpty()) {
            return ResponseEntity.badRequest().body("No valid quotation found for this inquiry.");
        }

        // Fix 4.1: resolve the quotation the customer actually accepted.
        Quotation accepted;
        if (request.getQuotationId() != null) {
            accepted = quotes.stream()
                    .filter(q -> q.getQuotationId().equals(request.getQuotationId()))
                    .findFirst().orElse(null);
            if (accepted == null) {
                return ResponseEntity.badRequest().body("That quotation does not belong to this inquiry.");
            }
        } else if (quotes.size() == 1) {
            accepted = quotes.get(0);
        } else {
            return ResponseEntity.badRequest().body(
                    "This inquiry has more than one quotation; please say which one you are accepting.");
        }

        if ("Rejected".equalsIgnoreCase(accepted.getQuotationStatus())) {
            return ResponseEntity.badRequest().body("That quotation was rejected and can no longer be accepted.");
        }
        if ("Expired".equalsIgnoreCase(accepted.getQuotationStatus())) {
            return ResponseEntity.badRequest().body("That quotation has expired. Please ask us for a new one.");
        }
        // Fix 4.2: validUntil was stored and then never checked anywhere.
        if (accepted.getValidUntil() != null && accepted.getValidUntil().isBefore(LocalDate.now())) {
            accepted.setQuotationStatus("Expired");
            quotationRepository.save(accepted);
            return ResponseEntity.badRequest().body(
                    "That quotation expired on " + accepted.getValidUntil() + ". Please ask us for a new one.");
        }

        BigDecimal totalAmt = accepted.getTotalAmount();
        if (totalAmt == null) {
            return ResponseEntity.badRequest().body("That quotation has no total amount; please contact the office.");
        }

        // Fix 4.4: the package comes from the quotation, and a missing one is an
        // error. The old code invented a "Custom Itinerary" package row using
        // whatever packageId the client sent (the frontend sent the literal
        // string "CUS"), writing junk into tour_package.
        if (accepted.getTourPackage() == null) {
            return ResponseEntity.badRequest().body(
                    "That quotation has no tour package attached; please contact the office.");
        }

        Booking booking = new Booking();
        booking.setCustomer(inquiry.getCustomer());
        booking.setTourPackage(accepted.getTourPackage());
        booking.setQuotation(accepted);
        // Fix 4.3: carry the itinerary the customer was quoted.
        booking.setItinerary(accepted.getItinerary());
        booking.setNumberOfPeople(inquiry.getNumberOfTravellers());
        booking.setBookingStatus("Confirmed");
        booking.setTotalAmount(totalAmt);
        booking.setTravelStartDate(inquiry.getTravelStartDate());
        booking.setTravelEndDate(inquiry.getTravelEndDate());

        accepted.setQuotationStatus("Accepted");
        quotationRepository.save(accepted);

        // Any other live quotation on this inquiry is now moot.
        for (Quotation other : quotes) {
            if (!other.getQuotationId().equals(accepted.getQuotationId())
                    && !"Rejected".equalsIgnoreCase(other.getQuotationStatus())) {
                other.setQuotationStatus("Expired");
                quotationRepository.save(other);
            }
        }

        inquiry.setInquiryStatus("Booked");
        inquiryRepository.save(inquiry);

        Booking saved = bookingRepository.save(booking);
        return ResponseEntity.ok(saved);
    }

    /**
     * Shared field handling for create and update, with the validation that was
     * missing entirely (fixes 7.1, 7.2, 7.3, 7.7, 7.11).
     */
    private String applyEditableFields(Booking booking, Booking request) {
        String dateError = Validation.checkTravelDates(
                request.getTravelStartDate(), request.getTravelEndDate(), false, false);
        if (dateError != null) return dateError;

        if (request.getNumberOfPeople() != null) {
            String travellerError = Validation.checkTravellers(request.getNumberOfPeople());
            if (travellerError != null) return travellerError;
        }
        if (request.getTotalAmount() != null && !Validation.isZeroOrMore(request.getTotalAmount())) {
            return "Total amount cannot be negative.";
        }

        Driver driver = null;
        if (request.getDriver() != null && request.getDriver().getDriverId() != null) {
            driver = driverRepository.findById(request.getDriver().getDriverId()).orElse(null);
            if (driver == null) return "The selected driver no longer exists.";
            if ("Inactive".equalsIgnoreCase(driver.getDriverStatus())) {
                return "Driver " + driver.getDriverName() + " is marked Inactive and cannot be assigned.";
            }
            // Fix 7.10: a licence that expires before the tour starts.
            if (driver.getLicenseExpiryDate() != null && request.getTravelStartDate() != null
                    && driver.getLicenseExpiryDate().isBefore(request.getTravelStartDate())) {
                return "Driver " + driver.getDriverName() + "'s licence expires on "
                        + driver.getLicenseExpiryDate() + ", before this tour starts.";
            }
        }

        Vehicle vehicle = null;
        if (request.getVehicle() != null && request.getVehicle().getVehicleId() != null) {
            vehicle = vehicleRepository.findById(request.getVehicle().getVehicleId()).orElse(null);
            if (vehicle == null) return "The selected vehicle no longer exists.";
            if ("Maintenance".equalsIgnoreCase(vehicle.getVehicleStatus())
                    || "Inactive".equalsIgnoreCase(vehicle.getVehicleStatus())) {
                return "Vehicle " + vehicle.getRegistrationNo() + " is currently "
                        + vehicle.getVehicleStatus() + " and cannot be assigned.";
            }
            // Fix 7.11 / 5.2: the capacity check only existed in the trip
            // allocation endpoint, which no screen ever called.
            Integer people = request.getNumberOfPeople();
            if (vehicle.getCapacity() != null && people != null && people > vehicle.getCapacity()) {
                return "Vehicle " + vehicle.getRegistrationNo() + " seats " + vehicle.getCapacity()
                        + " and cannot carry " + people + " passengers.";
            }
        }

        booking.setDriver(driver);
        booking.setVehicle(vehicle);
        booking.setInitialLocation(request.getInitialLocation());
        booking.setReturnDropOffLocation(request.getReturnDropOffLocation());
        booking.setTravelStartDate(request.getTravelStartDate());
        booking.setTravelEndDate(request.getTravelEndDate());
        booking.setNumberOfPeople(request.getNumberOfPeople());
        booking.setTotalAmount(request.getTotalAmount());
        booking.setNotes(request.getNotes());
        return null;
    }

    /** Fix 5.7: mark the driver and vehicle busy while a tour is running. */
    private void releaseOrReserveResources(Booking booking, String status) {
        boolean busy = "Ongoing".equalsIgnoreCase(status);
        boolean finished = "Completed".equalsIgnoreCase(status) || "Cancelled".equalsIgnoreCase(status);
        if (!busy && !finished) return;

        Driver driver = booking.getDriver();
        if (driver != null && !"Inactive".equalsIgnoreCase(driver.getDriverStatus())) {
            driver.setDriverStatus(busy ? "Assigned" : "Available");
            driverRepository.save(driver);
        }
        Vehicle vehicle = booking.getVehicle();
        if (vehicle != null && !"Maintenance".equalsIgnoreCase(vehicle.getVehicleStatus())
                && !"Inactive".equalsIgnoreCase(vehicle.getVehicleStatus())) {
            vehicle.setVehicleStatus(busy ? "Assigned" : "Available");
            vehicleRepository.save(vehicle);
        }
    }
}
