package com.sanastours.repository;
import com.sanastours.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface PaymentRepository extends JpaRepository<Payment, Integer> {
    List<Payment> findByBooking_BookingId(Integer bookingId);
}
