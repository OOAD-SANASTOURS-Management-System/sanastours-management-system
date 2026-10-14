package com.sanastours.repository;
import com.sanastours.entity.Booking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Integer> {

    /**
     * Has this inquiry already been turned into a booking?
     *
     * The inquiry used to be moved to "Booked" on conversion and that status
     * was the guard against booking the same inquiry twice. The inquiry now
     * stays at "Quotation Sent", so the question is asked of the bookings
     * themselves, which is the thing that actually decides it.
     */
    boolean existsByQuotation_Inquiry_InquiryId(Integer inquiryId);
}
