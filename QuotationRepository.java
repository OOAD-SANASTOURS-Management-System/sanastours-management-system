package com.sanastours.repository;
import com.sanastours.entity.Quotation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface QuotationRepository extends JpaRepository<Quotation, Integer> {
    java.util.List<Quotation> findByInquiry_InquiryId(Integer inquiryId);
}
