package com.balaji.traders.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;

@Entity
@Table(name = "transactions")
public class Transaction {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private Long farmerId;
    private LocalDate date;
    private String type; // "BILL", "PAYMENT", "ADVANCE", "INTEREST"
    private Double amount;
    private String description;
    private Boolean interestApplied = false;
    private Double interestRate = 0.0;
    private String shopType; // "ENTERPRISES" or "TRADERS"

    // Default Constructor
    public Transaction() {}

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getFarmerId() { return farmerId; }
    public void setFarmerId(Long farmerId) { this.farmerId = farmerId; }

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public Double getAmount() { return amount; }
    public void setAmount(Double amount) { this.amount = amount; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public Boolean getInterestApplied() { return interestApplied; }
    public void setInterestApplied(Boolean interestApplied) { this.interestApplied = interestApplied; }

    public Double getInterestRate() { return interestRate; }
    public void setInterestRate(Double interestRate) { this.interestRate = interestRate; }

    public String getShopType() { return shopType; }
    public void setShopType(String shopType) { this.shopType = shopType; }
}
