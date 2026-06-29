package com.balaji.traders.repository;

import com.balaji.traders.model.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, Long> {
    List<Transaction> findByShopType(String shopType);
    List<Transaction> findByFarmerIdAndShopType(Long farmerId, String shopType);
}
