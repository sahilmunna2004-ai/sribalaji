package com.balaji.traders.controller;

import com.balaji.traders.model.Farmer;
import com.balaji.traders.model.FarmerImport;
import com.balaji.traders.model.NotebookPage;
import com.balaji.traders.repository.FarmerImportRepository;
import com.balaji.traders.repository.FarmerRepository;
import com.balaji.traders.repository.NotebookPageRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/farmer-imports")
@CrossOrigin(origins = "*")
public class FarmerImportController {

    @Autowired
    private FarmerImportRepository farmerImportRepository;

    @Autowired
    private FarmerRepository farmerRepository;

    @Autowired
    private NotebookPageRepository notebookPageRepository;

    @Value("${app.upload.dir:./data/photos}")
    private String uploadDir;

    @GetMapping
    public List<FarmerImport> getPendingImports(@RequestParam String shopType,
                                                @RequestParam(defaultValue = "2026-27") String season,
                                                @RequestParam(defaultValue = "PENDING") String status) {
        List<FarmerImport> imports = farmerImportRepository.findByShopTypeAndSeasonAndStatusOrderByCreatedAtAsc(shopType, season, status);
        imports.sort(Comparator.comparingInt(item -> parseSerialNumber(item.getSerialNumber())));
        return imports;
    }

    @PostMapping
    public ResponseEntity<FarmerImport> createPendingImport(@RequestParam("photo") MultipartFile file,
                                                            @RequestParam String shopType,
                                                            @RequestParam(defaultValue = "2026-27") String season,
                                                            @RequestParam(required = false) String serialNumber,
                                                            @RequestParam(required = false) String detectedName,
                                                            @RequestParam(required = false) String detectedPhone,
                                                            @RequestParam(required = false) String detectedVillage,
                                                            @RequestParam(required = false) String detectedCropDetails,
                                                            @RequestParam(required = false) String ocrText) {
        try {
            String normalizedSeason = "2026-27";
            String imageHash = calculateSha256(file);

            Optional<FarmerImport> existing = Optional.empty();
            if (imageHash != null) {
                existing = farmerImportRepository.findFirstByShopTypeAndSeasonAndImageHashAndStatus(shopType, normalizedSeason, imageHash, "PENDING");
            }
            if (!existing.isPresent() && serialNumber != null && !serialNumber.trim().isEmpty()) {
                existing = farmerImportRepository.findFirstByShopTypeAndSeasonAndSerialNumberAndStatus(shopType, normalizedSeason, serialNumber.trim(), "PENDING");
            }

            FarmerImport farmerImport = existing.orElseGet(FarmerImport::new);
            boolean isNew = farmerImport.getId() == null;

            if (isNew) {
                File directory = new File(uploadDir + "/pending-imports");
                if (!directory.exists()) {
                    directory.mkdirs();
                }

                String originalFileName = file.getOriginalFilename();
                String extension = originalFileName != null && originalFileName.contains(".")
                        ? originalFileName.substring(originalFileName.lastIndexOf("."))
                        : ".jpg";
                String fileName = "pending_import_" + UUID.randomUUID() + extension;
                Path filePath = Paths.get(uploadDir, "pending-imports", fileName);
                Files.write(filePath, file.getBytes());
                farmerImport.setImagePath(filePath.toString());
            }

            farmerImport.setShopType(shopType);
            farmerImport.setSeason(normalizedSeason);
            if (serialNumber != null && !serialNumber.trim().isEmpty()) farmerImport.setSerialNumber(serialNumber.trim());
            if (detectedName != null && !detectedName.trim().isEmpty()) farmerImport.setDetectedName(detectedName.trim());
            if (detectedPhone != null && !detectedPhone.trim().isEmpty()) farmerImport.setDetectedPhone(detectedPhone.trim());
            if (detectedVillage != null && !detectedVillage.trim().isEmpty()) farmerImport.setDetectedVillage(detectedVillage.trim());
            if (detectedCropDetails != null && !detectedCropDetails.trim().isEmpty()) {
                farmerImport.setDetectedCropDetails(mergeText(farmerImport.getDetectedCropDetails(), detectedCropDetails.trim()));
            }
            if (ocrText != null && !ocrText.trim().isEmpty()) {
                farmerImport.setOcrText(mergeText(farmerImport.getOcrText(), ocrText.trim()));
            }
            farmerImport.setImageHash(imageHash);
            farmerImport.setStatus("PENDING");
            farmerImport.setUpdatedAt(LocalDateTime.now());

            return ResponseEntity.ok(farmerImportRepository.save(farmerImport));
        } catch (IOException ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/{id}/image")
    public ResponseEntity<Resource> getPendingImportImage(@PathVariable Long id) {
        Optional<FarmerImport> importOpt = farmerImportRepository.findById(id);
        if (!importOpt.isPresent() || importOpt.get().getImagePath() == null) {
            return ResponseEntity.notFound().build();
        }

        try {
            Path filePath = Paths.get(importOpt.get().getImagePath());
            if (!Files.exists(filePath)) {
                return ResponseEntity.notFound().build();
            }

            Resource resource = new UrlResource(filePath.toUri());
            String contentType = Files.probeContentType(filePath);
            return ResponseEntity.ok()
                    .contentType(contentType != null ? MediaType.parseMediaType(contentType) : MediaType.IMAGE_JPEG)
                    .body(resource);
        } catch (IOException ex) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/{id}/finalize")
    @Transactional
    public ResponseEntity<Farmer> finalizeImport(@PathVariable Long id, @RequestBody FarmerImport importPayload) {
        Optional<FarmerImport> importOpt = farmerImportRepository.findById(id);
        if (!importOpt.isPresent()) {
            return ResponseEntity.notFound().build();
        }

        FarmerImport farmerImport = importOpt.get();
        if ("FINALIZED".equalsIgnoreCase(farmerImport.getStatus()) && farmerImport.getCreatedFarmerId() != null) {
            return farmerRepository.findById(farmerImport.getCreatedFarmerId())
                    .map(ResponseEntity::ok)
                    .orElseGet(() -> ResponseEntity.notFound().build());
        }

        String season = "2026-27";
        String serialNumber = safeValue(importPayload.getSerialNumber(), farmerImport.getSerialNumber());
        String name = safeValue(importPayload.getDetectedName(), farmerImport.getDetectedName());
        String phone = safeValue(importPayload.getDetectedPhone(), farmerImport.getDetectedPhone());
        String village = safeValue(importPayload.getDetectedVillage(), farmerImport.getDetectedVillage());
        String cropDetails = safeValue(importPayload.getDetectedCropDetails(), farmerImport.getDetectedCropDetails());

        Optional<Farmer> farmerOpt = serialNumber.isEmpty()
                ? Optional.empty()
                : farmerRepository.findFirstByShopTypeAndSeasonAndSerialNumber(farmerImport.getShopType(), season, serialNumber);
        if (!farmerOpt.isPresent() && !name.isEmpty()) {
            farmerOpt = farmerRepository.findFirstByShopTypeAndSeasonAndNameIgnoreCase(farmerImport.getShopType(), season, name);
        }

        Farmer farmer = farmerOpt.orElseGet(Farmer::new);
        if (!name.isEmpty()) farmer.setName(name);
        if (!serialNumber.isEmpty()) farmer.setSerialNumber(serialNumber);
        if (!phone.isEmpty()) farmer.setPhone(phone);
        if (!village.isEmpty()) farmer.setVillage(village); else if (farmer.getVillage() == null) farmer.setVillage("Yellandu");
        if (!cropDetails.isEmpty()) farmer.setCropDetails(mergeText(farmer.getCropDetails(), cropDetails));
        farmer.setSeason(season);
        farmer.setShopType(farmerImport.getShopType());

        Farmer savedFarmer = farmerRepository.save(farmer);

        if (farmerImport.getImageHash() == null || !notebookPageRepository.findFirstByFarmerIdAndImageHash(savedFarmer.getId(), farmerImport.getImageHash()).isPresent()) {
            NotebookPage page = new NotebookPage();
            page.setFarmerId(savedFarmer.getId());
            page.setImagePath(farmerImport.getImagePath());
            page.setImageHash(farmerImport.getImageHash());
            page.setUploadDate(LocalDateTime.now());
            page.setNotes(buildNotes(serialNumber, name));
            page.setYear(season);
            notebookPageRepository.save(page);
        }

        if (savedFarmer.getPhotoPath() == null || savedFarmer.getPhotoPath().trim().isEmpty()) {
            savedFarmer.setPhotoPath(farmerImport.getImagePath());
        } else if (!savedFarmer.getPhotoPath().contains(farmerImport.getImagePath())) {
            savedFarmer.setPhotoPath(savedFarmer.getPhotoPath() + "," + farmerImport.getImagePath());
        }
        savedFarmer = farmerRepository.save(savedFarmer);

        farmerImport.setDetectedName(name);
        farmerImport.setDetectedPhone(phone);
        farmerImport.setDetectedVillage(village);
        farmerImport.setDetectedCropDetails(cropDetails);
        farmerImport.setSerialNumber(serialNumber);
        farmerImport.setStatus("FINALIZED");
        farmerImport.setCreatedFarmerId(savedFarmer.getId());
        farmerImport.setUpdatedAt(LocalDateTime.now());
        farmerImportRepository.save(farmerImport);

        return ResponseEntity.ok(savedFarmer);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePendingImport(@PathVariable Long id) {
        Optional<FarmerImport> importOpt = farmerImportRepository.findById(id);
        if (!importOpt.isPresent()) {
            return ResponseEntity.notFound().build();
        }
        FarmerImport farmerImport = importOpt.get();
        if (!"FINALIZED".equalsIgnoreCase(farmerImport.getStatus())) {
            deleteFileIfExists(farmerImport.getImagePath());
        }
        farmerImportRepository.delete(farmerImport);
        return ResponseEntity.ok().build();
    }

    private void deleteFileIfExists(String path) {
        if (path == null || path.trim().isEmpty()) return;
        try {
            Files.deleteIfExists(Paths.get(path));
        } catch (IOException ignored) {
        }
    }

    private String mergeText(String existing, String incoming) {
        if (incoming == null || incoming.trim().isEmpty()) return existing;
        if (existing == null || existing.trim().isEmpty()) return incoming;
        if (existing.toLowerCase().contains(incoming.toLowerCase())) return existing;
        return existing + " | " + incoming;
    }

    private String safeValue(String preferred, String fallback) {
        if (preferred != null && !preferred.trim().isEmpty()) return preferred.trim();
        return fallback == null ? "" : fallback.trim();
    }

    private String buildNotes(String serialNumber, String name) {
        String serialPrefix = serialNumber == null || serialNumber.trim().isEmpty() ? "" : "Serial " + serialNumber.trim() + " - ";
        return serialPrefix + name + " Pending Import Page";
    }

    private int parseSerialNumber(String serialNumber) {
        if (serialNumber == null || serialNumber.trim().isEmpty()) return Integer.MAX_VALUE;
        try {
            return Integer.parseInt(serialNumber.replaceAll("[^0-9]", ""));
        } catch (NumberFormatException ex) {
            return Integer.MAX_VALUE;
        }
    }

    private String calculateSha256(MultipartFile file) {
        try (InputStream inputStream = file.getInputStream()) {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] buffer = new byte[8192];
            int read;
            while ((read = inputStream.read(buffer)) != -1) {
                digest.update(buffer, 0, read);
            }
            byte[] hash = digest.digest();
            StringBuilder hex = new StringBuilder();
            for (byte b : hash) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (IOException | NoSuchAlgorithmException ex) {
            return null;
        }
    }
}