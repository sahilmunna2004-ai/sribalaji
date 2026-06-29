package com.balaji.traders.controller;

import com.balaji.traders.model.Transaction;
import com.balaji.traders.repository.TransactionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/transactions")
@CrossOrigin(origins = "*")
public class TransactionController {

    @Autowired
    private TransactionRepository transactionRepository;

    @GetMapping
    public List<Transaction> getTransactions(@RequestParam String shopType) {
        return transactionRepository.findByShopType(shopType);
    }

    @GetMapping("/farmer/{farmerId}")
    public List<Transaction> getFarmerTransactions(@PathVariable Long farmerId, @RequestParam String shopType) {
        return transactionRepository.findByFarmerIdAndShopType(farmerId, shopType);
    }

    @PostMapping
    public Transaction createTransaction(@RequestBody Transaction transaction) {
        return transactionRepository.save(transaction);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTransaction(@PathVariable Long id) {
        if (transactionRepository.existsById(id)) {
            transactionRepository.deleteById(id);
            return ResponseEntity.ok().build();
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/farmer/{farmerId}/summary")
    public ResponseEntity<Map<String, Object>> getFarmerSummary(@PathVariable Long farmerId, @RequestParam String shopType) {
        List<Transaction> txList = transactionRepository.findByFarmerIdAndShopType(farmerId, shopType);
        
        double totalBills = 0.0;
        double totalPayments = 0.0;
        double totalAdvances = 0.0;
        double totalInterest = 0.0;

        for (Transaction tx : txList) {
            String type = tx.getType().toUpperCase();
            double amount = tx.getAmount() != null ? tx.getAmount() : 0.0;
            switch (type) {
                case "BILL":
                    totalBills += amount;
                    break;
                case "PAYMENT":
                    totalPayments += amount;
                    break;
                case "ADVANCE":
                    totalAdvances += amount;
                    break;
                case "INTEREST":
                    totalInterest += amount;
                    break;
            }
        }

        double balanceDue = (totalBills + totalAdvances + totalInterest) - totalPayments;

        Map<String, Object> summary = new HashMap<>();
        summary.put("farmerId", farmerId);
        summary.put("totalBills", totalBills);
        summary.put("totalPayments", totalPayments);
        summary.put("totalAdvances", totalAdvances);
        summary.put("totalInterest", totalInterest);
        summary.put("balanceDue", balanceDue);

        return ResponseEntity.ok(summary);
    }
}
