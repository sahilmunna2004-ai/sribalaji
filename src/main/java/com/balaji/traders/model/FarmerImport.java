package com.balaji.traders.model;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "farmer_imports")
public class FarmerImport {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "shop_type", length = 50, nullable = false)
    private String shopType;

    @Column(length = 20, nullable = false)
    private String season;

    @Column(name = "serial_number", length = 50)
    private String serialNumber;

    @Column(name = "detected_name")
    private String detectedName;

    @Column(name = "detected_name_local")
    private String detectedNameLocal;

    @Column(name = "detected_phone", length = 20)
    private String detectedPhone;

    @Column(name = "detected_village")
    private String detectedVillage;

    @Column(name = "detected_crop_details", length = 500)
    private String detectedCropDetails;

    @Column(name = "ocr_text", columnDefinition = "TEXT")
    private String ocrText;

    @Column(name = "image_path", nullable = false, columnDefinition = "TEXT")
    private String imagePath;

    @Column(name = "image_hash", length = 128)
    private String imageHash;

    @Column(length = 20, nullable = false)
    private String status = "PENDING";

    @Column(name = "created_farmer_id")
    private Long createdFarmerId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getShopType() { return shopType; }
    public void setShopType(String shopType) { this.shopType = shopType; }

    public String getSeason() { return season; }
    public void setSeason(String season) { this.season = season; }

    public String getSerialNumber() { return serialNumber; }
    public void setSerialNumber(String serialNumber) { this.serialNumber = serialNumber; }

    public String getDetectedName() { return detectedName; }
    public void setDetectedName(String detectedName) { this.detectedName = detectedName; }

    public String getDetectedNameLocal() { return detectedNameLocal; }
    public void setDetectedNameLocal(String detectedNameLocal) { this.detectedNameLocal = detectedNameLocal; }

    public String getDetectedPhone() { return detectedPhone; }
    public void setDetectedPhone(String detectedPhone) { this.detectedPhone = detectedPhone; }

    public String getDetectedVillage() { return detectedVillage; }
    public void setDetectedVillage(String detectedVillage) { this.detectedVillage = detectedVillage; }

    public String getDetectedCropDetails() { return detectedCropDetails; }
    public void setDetectedCropDetails(String detectedCropDetails) { this.detectedCropDetails = detectedCropDetails; }

    public String getOcrText() { return ocrText; }
    public void setOcrText(String ocrText) { this.ocrText = ocrText; }

    public String getImagePath() { return imagePath; }
    public void setImagePath(String imagePath) { this.imagePath = imagePath; }

    public String getImageHash() { return imageHash; }
    public void setImageHash(String imageHash) { this.imageHash = imageHash; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Long getCreatedFarmerId() { return createdFarmerId; }
    public void setCreatedFarmerId(Long createdFarmerId) { this.createdFarmerId = createdFarmerId; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}