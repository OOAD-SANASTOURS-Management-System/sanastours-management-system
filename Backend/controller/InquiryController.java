package com.sanastours.controller;

import com.sanastours.dto.InquiryRequest;
import com.sanastours.entity.Customer;
import com.sanastours.entity.Inquiry;
import com.sanastours.repository.CustomerRepository;
import com.sanastours.repository.InquiryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/inquiries")
@CrossOrigin(origins = "http://localhost:5173")
public class InquiryController {

    @Autowired
    private InquiryRepository inquiryRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @PostMapping
    public ResponseEntity<?> submitInquiry(@RequestBody InquiryRequest request) {
        // 1. Verify the customer exists
        Customer customer = customerRepository.findById(request.getCustomerId())
                .orElse(null);

        if (customer == null) {
            return ResponseEntity.badRequest().body("Customer not found! Please login/register first.");
        }

        // 2. Create the Inquiry entity
        Inquiry inquiry = new Inquiry();
        inquiry.setCustomer(customer);
        inquiry.setTravelDates(request.getTravelDates());
        inquiry.setNumberOfTravellers(request.getNumberOfTravellers());
        
        // Append the package they were looking at to the destinations/special requirements
        String details = "Interested in Package: " + request.getPackageId();
        if (request.getSpecialRequirements() != null) {
            details += " | Notes: " + request.getSpecialRequirements();
        }
        inquiry.setDestinationsOfInterest(details);
        
        inquiry.setInquiryStatus("Pending");
        inquiry.setCreatedAt(LocalDateTime.now());

        // 3. Save to database
        Inquiry savedInquiry = inquiryRepository.save(inquiry);

        return ResponseEntity.ok(savedInquiry);
    }

    @GetMapping
    public ResponseEntity<?> getAllInquiries() {
        return ResponseEntity.ok(inquiryRepository.findAll());
    }
}
