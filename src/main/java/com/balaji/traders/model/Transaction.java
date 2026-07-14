package com.balaji.traders.model;

import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.Table;
import javax.persistence.Column;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "transactions")
public class Transaction {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "farmer_id", nullable = false)
    private Long farmerId;
    
    @Column(nullable = false)
    private LocalDate date;
    
    @Column(length = 50)
    private String type; // "BILL", "PAYMENT", "ADVANCE", "INTEREST"
    
    @Column(precision = 10, scale = 2)
    private Double amount;
    
    @Column(columnDefinition = "TEXT")
    private String description;
    
    @Column(name = "interest_applied")
    private Boolean interestApplied = false;
    
    @Column(name = "interest_rate", precision = 5, scale = 2)
    private Double interestRate = 0.0;
    
    @Column(name = "shop_type", length = 50)
    private String shopType; // "ENTERPRISES" or "TRADERS"

    @Column(name = "lorry_no", length = 50)
    private String lorryNo;

    @Column(name = "tons")
    private Double tons;

    @Column(name = "rate_per_ton")
    private Double ratePerTon;

    @Column(name = "other_charges")
    private Double otherCharges = 0.0;

    @Column(name = "crop_item_type", length = 50)
    private String cropItemType; // "SEEDS", "FERTILIZER", "PESTICIDES"

    @Column(name = "bill_file_path", length = 500)
    private String billFilePath; // Path to uploaded bill file
    
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

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

    public String getLorryNo() { return lorryNo; }
    public void setLorryNo(String lorryNo) { this.lorryNo = lorryNo; }

    public Double getTons() { return tons; }
    public void setTons(Double tons) { this.tons = tons; }

    public Double getRatePerTon() { return ratePerTon; }
    public void setRatePerTon(Double ratePerTon) { this.ratePerTon = ratePerTon; }

    public Double getOtherCharges() { return otherCharges; }
    public void setOtherCharges(Double otherCharges) { this.otherCharges = otherCharges; }

    public String getCropItemType() { return cropItemType; }
    public void setCropItemType(String cropItemType) { this.cropItemType = cropItemType; }

    public String getBillFilePath() { return billFilePath; }
    public void setBillFilePath(String billFilePath) { this.billFilePath = billFilePath; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
