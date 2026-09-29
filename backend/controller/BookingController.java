package com.sanastours.controller;

import com.sanastours.dto.BookingRequest;
import com.sanastours.entity.Booking;
import com.sanastours.entity.Inquiry;
import com.sanastours.entity.TourPackage;
import com.sanastours.repository.BookingRepository;
import com.sanastours.repository.InquiryRepository;
import com.sanastours.repository.TourPackageRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/bookings")
@CrossOrigin(origins = "http://localhost:5173")
public class BookingController {

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private InquiryRepository inquiryRepository;

    @Autowired
    private TourPackageRepository tourPackageRepository;

    @GetMapping
    public List<Booking> getAllBookings() {
        return bookingRepository.findAll();
    }

    @Transactional
    @PostMapping("/convert")
    public ResponseEntity<?> convertToBooking(@RequestBody BookingRequest request) {
        Inquiry inquiry = inquiryRepository.findById(request.getInquiryId()).orElse(null);
        TourPackage tourPackage = tourPackageRepository.findById(request.getPackageId()).orElse(null);

        if (inquiry == null || tourPackage == null) {
            return ResponseEntity.badRequest().body("Inquiry or Package not found!");
        }

        Booking booking = new Booking();
        booking.setCustomer(inquiry.getCustomer());
        booking.setTourPackage(tourPackage);
        booking.setBookingDate(LocalDate.now());
        booking.setNumberOfPeople(inquiry.getNumberOfTravellers());
        booking.setBookingStatus("Confirmed"); // Since customer accepted quotation

        // Update inquiry status
        inquiry.setInquiryStatus("Booked");
        inquiryRepository.save(inquiry);

        bookingRepository.save(booking);
        return ResponseEntity.ok("Booking successful");
    }
}
