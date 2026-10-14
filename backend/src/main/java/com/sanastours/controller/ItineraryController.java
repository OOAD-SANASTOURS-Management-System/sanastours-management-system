package com.sanastours.controller;

import com.sanastours.entity.Booking;
import com.sanastours.entity.Itinerary;
import com.sanastours.entity.ItineraryDay;
import com.sanastours.entity.TourPackage;
import com.sanastours.repository.BookingRepository;
import com.sanastours.repository.ItineraryRepository;
import com.sanastours.repository.ItineraryDayRepository;
import com.sanastours.repository.TourPackageRepository;
import com.sanastours.security.CurrentUser;
import com.sanastours.util.Validation;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/itineraries")
public class ItineraryController {

    @Autowired private ItineraryRepository itineraryRepository;
    @Autowired private ItineraryDayRepository itineraryDayRepository;
    @Autowired private TourPackageRepository tourPackageRepository;
    @Autowired private BookingRepository bookingRepository;
    @Autowired private CurrentUser currentUser;

    @GetMapping
    public List<Itinerary> getAllItineraries() {
        return itineraryRepository.findAll();
    }

    @GetMapping("/{id}/days")
    public List<ItineraryDay> getItineraryDays(@PathVariable Integer id) {
        return itineraryDayRepository.findByItinerary_ItineraryId(id);
    }

    /**
     * The itinerary belonging to one tour package, days included.
     *
     * The screens used to fetch every itinerary in the system and search the
     * list client-side for a matching packageId. That handed each customer the
     * full catalogue to find one row, and broke silently once there was more
     * than one itinerary per package.
     */
    @GetMapping("/package/{packageId}")
    public ResponseEntity<?> getByPackage(@PathVariable String packageId) {
        return ResponseEntity.ok(
                itineraryRepository.findFirstByTourPackage_PackageIdOrderByItineraryIdAsc(packageId)
                        .map(this::asDetail)
                        .orElseGet(ItineraryController::notFoundDetail));
    }

    /**
     * The itinerary for one booking, days included.
     *
     * A booking carries the itinerary the customer was quoted; when that is not
     * set (older bookings, or a quotation raised without one) fall back to the
     * itinerary of the booked package so the screen still has something to
     * show. Customers may read their own booking's itinerary and drivers the
     * one for a tour assigned to them.
     */
    @GetMapping("/booking/{bookingId}")
    public ResponseEntity<?> getByBooking(@PathVariable Integer bookingId) {
        Booking booking = bookingRepository.findById(bookingId).orElse(null);
        if (booking == null) return ResponseEntity.notFound().build();

        if (!currentUser.isStaff()) {
            if (currentUser.isCustomer()) {
                if (booking.getCustomer() == null
                        || !currentUser.ownsCustomer(booking.getCustomer().getCustomerId())) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access denied.");
                }
                // A Pending booking has not been paid for yet, so its details
                // stay closed to the customer until the office confirms the payment.
                if ("Pending".equalsIgnoreCase(booking.getBookingStatus())) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).body(
                            "Payment needed first. This booking can be viewed once your payment has been confirmed.");
                }
            } else if (currentUser.isDriver()) {
                if (booking.getDriver() == null
                        || !currentUser.ownsDriver(booking.getDriver().getDriverId())) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).body("This tour is not assigned to you.");
                }
            } else {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access denied.");
            }
        }

        Itinerary itinerary = booking.getItinerary();
        if (itinerary == null && booking.getTourPackage() != null) {
            itinerary = itineraryRepository
                    .findFirstByTourPackage_PackageIdOrderByItineraryIdAsc(booking.getTourPackage().getPackageId())
                    .orElse(null);
        }
        return ResponseEntity.ok(itinerary == null ? notFoundDetail() : asDetail(itinerary));
    }

    /** One itinerary plus its days, flattened so the client needs a single call. */
    private Map<String, Object> asDetail(Itinerary itinerary) {
        Map<String, Object> out = new java.util.LinkedHashMap<>();
        out.put("found", true);
        out.put("itineraryId", itinerary.getItineraryId());
        out.put("itineraryName", itinerary.getItineraryName());
        out.put("durationDays", itinerary.getDurationDays());
        out.put("itineraryStatus", itinerary.getItineraryStatus());
        TourPackage pkg = itinerary.getTourPackage();
        out.put("packageId", pkg == null ? null : pkg.getPackageId());
        out.put("packageName", pkg == null ? null : pkg.getPackageName());

        List<Map<String, Object>> days = new ArrayList<>();
        itineraryDayRepository.findByItinerary_ItineraryId(itinerary.getItineraryId()).stream()
                .sorted(java.util.Comparator.comparing(
                        ItineraryDay::getDayNumber, java.util.Comparator.nullsLast(Integer::compareTo)))
                .forEach(day -> {
                    Map<String, Object> d = new java.util.LinkedHashMap<>();
                    d.put("dayId", day.getDayId());
                    d.put("dayNumber", day.getDayNumber());
                    d.put("title", day.getTitle());
                    d.put("location", day.getLocation());
                    d.put("activities", day.getActivities());
                    days.add(d);
                });
        out.put("days", days);
        return out;
    }

    /** 200 with found=false, so "no itinerary yet" is a normal state, not an error. */
    private static Map<String, Object> notFoundDetail() {
        Map<String, Object> out = new java.util.LinkedHashMap<>();
        out.put("found", false);
        out.put("days", List.of());
        return out;
    }

    @PostMapping
    @Transactional
    public ResponseEntity<?> addItinerary(@RequestBody Map<String, Object> payload) {
        String packageId = asString(payload.get("packageId"));
        if (packageId == null || packageId.isBlank()) {
            return ResponseEntity.badRequest().body("Please choose a tour package.");
        }
        TourPackage tourPackage = tourPackageRepository.findById(packageId).orElse(null);
        if (tourPackage == null) return ResponseEntity.badRequest().body("Tour Package not found");

        List<Map<String, Object>> days = readDays(payload);
        String error = validate(payload, days);
        if (error != null) return ResponseEntity.badRequest().body(error);

        Itinerary itinerary = new Itinerary();
        itinerary.setTourPackage(tourPackage);
        itinerary.setItineraryName(asString(payload.get("itineraryName")).trim());
        itinerary.setDurationDays(asInt(payload.get("durationDays")));
        itinerary.setItineraryStatus(statusOrDefault(payload));

        itinerary = itineraryRepository.save(itinerary);
        saveDays(itinerary, days);

        return ResponseEntity.ok(itinerary);
    }

    /**
     * Fix 4.22: this deleted every day row and then re-inserted them with no
     * transaction, so a failure part-way through left the itinerary with its
     * days gone.
     */
    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<?> updateItinerary(@PathVariable Integer id, @RequestBody Map<String, Object> payload) {
        Itinerary itinerary = itineraryRepository.findById(id).orElse(null);
        if (itinerary == null) return ResponseEntity.badRequest().body("Itinerary not found");

        String packageId = asString(payload.get("packageId"));
        if (packageId == null || packageId.isBlank()) {
            return ResponseEntity.badRequest().body("Please choose a tour package.");
        }
        TourPackage tourPackage = tourPackageRepository.findById(packageId).orElse(null);
        if (tourPackage == null) return ResponseEntity.badRequest().body("Tour Package not found");

        List<Map<String, Object>> days = readDays(payload);
        String error = validate(payload, days);
        if (error != null) return ResponseEntity.badRequest().body(error);

        itinerary.setTourPackage(tourPackage);
        itinerary.setItineraryName(asString(payload.get("itineraryName")).trim());
        itinerary.setDurationDays(asInt(payload.get("durationDays")));
        itinerary.setItineraryStatus(statusOrDefault(payload));
        itinerary = itineraryRepository.save(itinerary);

        List<ItineraryDay> existingDays = itineraryDayRepository.findByItinerary_ItineraryId(id);
        itineraryDayRepository.deleteAll(existingDays);
        itineraryDayRepository.flush();
        saveDays(itinerary, days);

        return ResponseEntity.ok(itinerary);
    }

    // An itinerary is now part of its tour package rather than a record of its
    // own, so there is no delete: removing one would strand the quotations and
    // bookings that were sold against it. Retiring one is what the Inactive
    // status is for, and deleting the package still removes it.

    private void saveDays(Itinerary itinerary, List<Map<String, Object>> days) {
        int dayNumber = 1;
        for (Map<String, Object> dayMap : days) {
            ItineraryDay day = new ItineraryDay();
            day.setItinerary(itinerary);
            // Renumber from 1 in the order supplied, so removing a day in the
            // middle cannot leave a gap or a duplicate day number.
            day.setDayNumber(dayNumber++);
            day.setTitle(asString(dayMap.get("title")).trim());
            day.setLocation(asString(dayMap.get("location")));
            day.setActivities(asString(dayMap.get("activities")));
            itineraryDayRepository.save(day);
        }
    }

    /** Fix 7.9: duration and the number of day entries were never cross-checked. */
    private String validate(Map<String, Object> payload, List<Map<String, Object>> days) {
        String name = asString(payload.get("itineraryName"));
        if (name == null || name.isBlank()) {
            return "Itinerary name is required.";
        }
        Integer duration = asInt(payload.get("durationDays"));
        if (duration == null || duration < 1 || duration > 365) {
            return "Duration must be between 1 and 365 days.";
        }
        if (days.isEmpty()) {
            return "Please add at least one day to the itinerary.";
        }
        if (days.size() != duration) {
            return "The itinerary is set to " + duration + " day(s) but has " + days.size()
                    + " day entries. Please make them match.";
        }
        for (int i = 0; i < days.size(); i++) {
            String title = asString(days.get(i).get("title"));
            if (title == null || title.isBlank()) {
                return "Day " + (i + 1) + " needs a title.";
            }
            String location = asString(days.get(i).get("location"));
            if (location == null || location.isBlank()) {
                return "Day " + (i + 1) + " needs a location.";
            }
        }
        String status = asString(payload.get("itineraryStatus"));
        if (status != null && !status.isBlank()
                && !Validation.isOneOf(status, List.of("Draft", "Active", "Inactive"))) {
            return "Unknown itinerary status: " + status;
        }
        return null;
    }

    private String statusOrDefault(Map<String, Object> payload) {
        String status = asString(payload.get("itineraryStatus"));
        return (status == null || status.isBlank()) ? "Active" : status;
    }

    /**
     * Read the days list without the unchecked cast the old code used - a
     * malformed payload produced a ClassCastException and a 500 that echoed the
     * raw exception text back to the caller.
     */
    private List<Map<String, Object>> readDays(Map<String, Object> payload) {
        List<Map<String, Object>> days = new ArrayList<>();
        Object raw = payload.get("days");
        if (!(raw instanceof List<?> rawList)) return days;
        for (Object item : rawList) {
            if (item instanceof Map<?, ?> rawMap) {
                Map<String, Object> day = new java.util.LinkedHashMap<>();
                for (Map.Entry<?, ?> entry : rawMap.entrySet()) {
                    day.put(String.valueOf(entry.getKey()), entry.getValue());
                }
                days.add(day);
            }
        }
        return days;
    }

    private String asString(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    private Integer asInt(Object value) {
        if (value instanceof Number n) return n.intValue();
        if (value instanceof String s && !s.isBlank()) {
            try {
                return Integer.valueOf(s.trim());
            } catch (NumberFormatException e) {
                return null;
            }
        }
        return null;
    }
}
