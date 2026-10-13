package com.sanastours.controller;

import com.sanastours.entity.Inquiry;
import com.sanastours.entity.Quotation;
import com.sanastours.repository.InquiryRepository;
import com.sanastours.repository.QuotationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/quotations")
@CrossOrigin(origins = "http://localhost:5173")
public class QuotationController {

    @Autowired
    private QuotationRepository quotationRepository;

    @Autowired
    private InquiryRepository inquiryRepository;

    @PostMapping("/create/{inquiryId}")
    public ResponseEntity<?> createQuotation(@PathVariable Integer inquiryId, @RequestBody Quotation request) {
        Inquiry inquiry = inquiryRepository.findById(inquiryId).orElse(null);
        if (inquiry == null) {
            return ResponseEntity.badRequest().body("Inquiry not found.");
        }

        // Create the quotation
        Quotation quotation = new Quotation();
        quotation.setInquiry(inquiry);
        quotation.setTotalAmount(request.getTotalAmount());
        quotation.setQuotationStatus("Sent to Customer");
        quotation.setCreatedAt(LocalDateTime.now());

        // Update the inquiry status
        inquiry.setInquiryStatus("Quoted");
        inquiryRepository.save(inquiry);

        return ResponseEntity.ok(quotationRepository.save(quotation));
    }
}
