package com.sanastours.repository;

import com.sanastours.entity.PaymentSlip;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentSlipRepository extends JpaRepository<PaymentSlip, Integer> {

    Optional<PaymentSlip> findByPayment_PaymentId(Integer paymentId);

    /**
     * Which payments have a slip, as ids only.
     *
     * Selecting the id rather than the row matters: loading the entities here
     * would pull every stored PDF into memory just to tick a column in a list.
     */
    @Query("select s.payment.paymentId from PaymentSlip s")
    List<Integer> findPaymentIdsWithSlip();
}
