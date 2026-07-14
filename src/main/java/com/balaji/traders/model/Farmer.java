package com.balaji.traders.model;

import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.Table;
import javax.persistence.Column;
import java.time.LocalDateTime;

@Entity
@Table(name = "farmers")
public class Farmer {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private String name;
    
    @Column(length = 20)
    private String phone;
    
    @Column(nullable = false)
    private String village;
    
    @Column(name = "crop_details", length = 500)
    private String cropDetails;
    
    @Column(columnDefinition = "TEXT")
    private String photoPath;
    
    @Column(name = "shop_type", length = 50)
    private String shopType; // "ENTERPRISES" or "TRADERS"

    @Column(name = "name_local", length = 255)
    private String nameLocal; // Farmer name in local language (Telugu)
    @Column(name = "serial_number", length = 50)
    private String serialNumber;
    
    @Column(length = 20)
    private String season; // e.g. 2025-26
    
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();

    // Default Constructor
    public Farmer() {}

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getVillage() { return village; }
    public void setVillage(String village) { this.village = village; }

    public String getCropDetails() { return cropDetails; }
    public void setCropDetails(String cropDetails) { this.cropDetails = cropDetails; }

    public String getPhotoPath() { return photoPath; }
    public void setPhotoPath(String photoPath) { this.photoPath = photoPath; }

    public String getShopType() { return shopType; }
    public void setShopType(String shopType) { this.shopType = shopType; }

    public String getSerialNumber() { return serialNumber; }
    public void setSerialNumber(String serialNumber) { this.serialNumber = serialNumber; }

    public String getSeason() { return season; }
    public void setSeason(String season) { this.season = season; }

    public String getNameLocal() { return nameLocal; }
    public void setNameLocal(String nameLocal) { this.nameLocal = nameLocal; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
