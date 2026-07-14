package com.balaji.traders.controller;

import com.balaji.traders.model.Transaction;
import com.balaji.traders.repository.TransactionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/transactions")
@CrossOrigin(origins = "*")
public class TransactionController {

    @Autowired
    private TransactionRepository transactionRepository;

    // Directory to store bill files
    private static final String UPLOAD_DIR = "data/bills";

    @GetMapping
    public List<Transaction> getTransactions(@RequestParam String shopType) {
        return transactionRepository.findByShopType(shopType);
    }

    @GetMapping("/farmer/{farmerId}")
    public List<Transaction> getFarmerTransactions(@PathVariable Long farmerId, @RequestParam String shopType) {
        return transactionRepository.findByFarmerIdAndShopType(farmerId, shopType);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Transaction> getTransaction(@PathVariable Long id) {
        return transactionRepository.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public Transaction createTransaction(@RequestBody Transaction transaction) {
        return transactionRepository.save(transaction);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Transaction> updateTransaction(@PathVariable Long id, @RequestBody Transaction transactionData) {
        return transactionRepository.findById(id)
            .map(tx -> {
                tx.setFarmerId(transactionData.getFarmerId());
                tx.setType(transactionData.getType());
                tx.setAmount(transactionData.getAmount());
                tx.setDate(transactionData.getDate());
                tx.setDescription(transactionData.getDescription());
                tx.setCropItemType(transactionData.getCropItemType());
                tx.setInterestApplied(transactionData.getInterestApplied());
                tx.setInterestRate(transactionData.getInterestRate());
                return ResponseEntity.ok(transactionRepository.save(tx));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/bill")
    public ResponseEntity<Map<String, Object>> uploadBill(@PathVariable Long id, @RequestParam("file") MultipartFile file) {
        try {
            if (!transactionRepository.existsById(id)) {
                Map<String, Object> resp = new HashMap<>();
                resp.put("error", "Transaction not found");
                return ResponseEntity.notFound().build();
            }

            if (file.isEmpty()) {
                Map<String, Object> resp = new HashMap<>();
                resp.put("error", "File is empty");
                return ResponseEntity.badRequest().body(resp);
            }

            // Create directory if it doesn't exist
            File uploadDir = new File(UPLOAD_DIR);
            if (!uploadDir.exists()) {
                uploadDir.mkdirs();
            }

            // Generate unique filename
            String originalFilename = file.getOriginalFilename();
            String extension = originalFilename.substring(originalFilename.lastIndexOf("."));
            String uniqueFilename = "bill_" + id + "_" + UUID.randomUUID().toString() + extension;
            
            // Save file
            Path filePath = Paths.get(UPLOAD_DIR, uniqueFilename);
            Files.write(filePath, file.getBytes());

            // Update transaction with file path
            Transaction tx = transactionRepository.findById(id).get();
            tx.setBillFilePath("bills/" + uniqueFilename);
            transactionRepository.save(tx);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("filePath", "bills/" + uniqueFilename);
            response.put("fileName", originalFilename);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            e.printStackTrace();
            Map<String, Object> resp = new HashMap<>();
            resp.put("error", "File upload failed: " + e.getMessage());
            return ResponseEntity.internalServerError().body(resp);
        }
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
