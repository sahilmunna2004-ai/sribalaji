package com.balaji.traders.controller;

import com.balaji.traders.model.Farmer;
import com.balaji.traders.model.NotebookPage;
import com.balaji.traders.repository.FarmerRepository;
import com.balaji.traders.repository.NotebookPageRepository;
import com.balaji.traders.repository.TransactionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
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
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.Map;

@RestController
@RequestMapping("/api/farmers")
@CrossOrigin(origins = "*")
public class FarmerController {

    @Autowired
    private FarmerRepository farmerRepository;

    @Autowired
    private NotebookPageRepository notebookPageRepository;
    
    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private com.balaji.traders.service.MatchService matchService;

    @Value("${app.upload.dir:./data/photos}")
    private String uploadDir;

    @GetMapping
    public List<Farmer> getFarmers(@RequestParam String shopType) {
        List<Farmer> farmers = farmerRepository.findByShopType(shopType);
        farmers.sort(Comparator
                .comparingInt((Farmer farmer) -> parseSerialNumber(farmer.getSerialNumber()))
                .thenComparing(Farmer::getId));
        return farmers;
    }

    @GetMapping("/{id}")
    public ResponseEntity<Farmer> getFarmerById(@PathVariable Long id) {
        Optional<Farmer> farmer = farmerRepository.findById(id);
        return farmer.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> createFarmer(@RequestBody Farmer farmer) {
        Farmer saved = farmerRepository.save(farmer);
        // run matching against other farmers in same shopType
        List<Farmer> others = farmerRepository.findByShopType(saved.getShopType());
        List<com.balaji.traders.service.MatchService.Match> suggestions = matchService.findMatches(saved, others, 0.7);
        Map<String,Object> out = new java.util.HashMap<>();
        out.put("farmer", saved);
        out.put("suggestions", suggestions);
        return ResponseEntity.ok(out);
    }

    /**
     * Upload multiple pages and create farmer
     * Handles multipart form data with multiple files and farmer details
     */
    @PostMapping("/upload-pages")
        public ResponseEntity<Farmer> uploadFarmerPages(
            @RequestParam(value = "serialNumber", required = false) String serialNumber,
            @RequestParam("name") String name,
            @RequestParam(value = "nameLocal", required = false) String nameLocal,
            @RequestParam("phone") String phone,
            @RequestParam("village") String village,
            @RequestParam("cropDetails") String cropDetails,
            @RequestParam("season") String season,
            @RequestParam("shopType") String shopType,
            @RequestParam(value = "pages", required = false) MultipartFile[] pages) {
        
        try {
            final String normalizedSeason = "2026-27";
            final String normalizedSerial = serialNumber != null ? serialNumber.trim() : "";
            final String normalizedName = name != null ? name.trim() : "";

            Optional<Farmer> existingFarmer = normalizedSerial.isEmpty()
                    ? Optional.empty()
                    : farmerRepository.findFirstByShopTypeAndSeasonAndSerialNumber(shopType, normalizedSeason, normalizedSerial);

            if (!existingFarmer.isPresent() && !normalizedName.isEmpty()) {
                existingFarmer = farmerRepository.findFirstByShopTypeAndSeasonAndNameIgnoreCase(shopType, normalizedSeason, normalizedName);
            }

            Farmer farmer = existingFarmer.orElseGet(Farmer::new);
            farmer.setName(!normalizedName.isEmpty() ? normalizedName : farmer.getName());
                if (nameLocal != null && !nameLocal.trim().isEmpty()) {
                    farmer.setNameLocal(nameLocal.trim());
                }
            if (!normalizedSerial.isEmpty()) {
                farmer.setSerialNumber(normalizedSerial);
            }
            if (phone != null && !phone.trim().isEmpty()) {
                farmer.setPhone(phone.trim());
            }
            if (village != null && !village.trim().isEmpty()) {
                farmer.setVillage(village.trim());
            } else if (farmer.getVillage() == null || farmer.getVillage().trim().isEmpty()) {
                farmer.setVillage("Yellandu");
            }
            if (cropDetails != null && !cropDetails.trim().isEmpty()) {
                farmer.setCropDetails(mergeCropDetails(farmer.getCropDetails(), cropDetails.trim()));
            }
            farmer.setSeason(normalizedSeason);
            farmer.setShopType(shopType);

            Farmer savedFarmer = farmerRepository.save(farmer);

            if (pages != null && pages.length > 0) {
                StringBuilder photoPaths = new StringBuilder(savedFarmer.getPhotoPath() == null ? "" : savedFarmer.getPhotoPath());

                for (int i = 0; i < pages.length; i++) {
                    MultipartFile file = pages[i];
                    if (file == null || file.isEmpty()) {
                        continue;
                    }

                    String imageHash = calculateSha256(file);
                    if (imageHash != null && notebookPageRepository.findFirstByFarmerIdAndImageHash(savedFarmer.getId(), imageHash).isPresent()) {
                        continue;
                    }

                    File directory = new File(uploadDir + "/notebooks");
                    if (!directory.exists()) {
                        directory.mkdirs();
                    }

                    String originalFileName = file.getOriginalFilename();
                    String extension = originalFileName != null && originalFileName.contains(".")
                            ? originalFileName.substring(originalFileName.lastIndexOf("."))
                            : ".jpg";
                    String fileName = "farmer_" + savedFarmer.getId() + "_page_" + (i + 1) + "_" + UUID.randomUUID() + extension;
                    Path filePath = Paths.get(uploadDir, "notebooks", fileName);

                    Files.write(filePath, file.getBytes());

                    if (photoPaths.length() > 0) {
                        photoPaths.append(",");
                    }
                    photoPaths.append(filePath.toString());

                    NotebookPage page = new NotebookPage();
                    page.setFarmerId(savedFarmer.getId());
                    page.setImagePath(filePath.toString());
                    page.setImageHash(imageHash);
                    page.setUploadDate(LocalDateTime.now());
                    page.setNotes(buildNotebookNotes(savedFarmer));
                    page.setYear(normalizedSeason);
                    notebookPageRepository.save(page);
                }

                savedFarmer.setPhotoPath(photoPaths.length() == 0 ? savedFarmer.getPhotoPath() : photoPaths.toString());
                savedFarmer = farmerRepository.save(savedFarmer);
            }

            return ResponseEntity.ok(savedFarmer);
            
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<Farmer> updateFarmer(@PathVariable Long id, @RequestBody Farmer farmerDetails) {
        Optional<Farmer> farmerOpt = farmerRepository.findById(id);
        if (farmerOpt.isPresent()) {
            Farmer farmer = farmerOpt.get();
            farmer.setName(farmerDetails.getName());
            farmer.setNameLocal(farmerDetails.getNameLocal());
            farmer.setPhone(farmerDetails.getPhone());
            farmer.setVillage(farmerDetails.getVillage());
            farmer.setCropDetails(farmerDetails.getCropDetails());
            return ResponseEntity.ok(farmerRepository.save(farmer));
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<Void> deleteFarmer(@PathVariable Long id) {
        Optional<Farmer> farmerOpt = farmerRepository.findById(id);
        if (farmerOpt.isPresent()) {
            // Delete associated profile photo
            Farmer farmer = farmerOpt.get();
            if (farmer.getPhotoPath() != null) {
                deletePhotoFile(farmer.getPhotoPath());
            }
            
            // Delete all notebook pages associated with this farmer
            List<NotebookPage> pages = notebookPageRepository.findByFarmerId(id);
            for (NotebookPage page : pages) {
                deletePhotoFile(page.getImagePath());
                notebookPageRepository.delete(page);
            }

            // Delete all ledger transactions linked to this farmer/dealer/trader
            transactionRepository.deleteByFarmerId(id);
            
            farmerRepository.delete(farmer);
            return ResponseEntity.ok().build();
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    // Farmer Profile Photo Upload APIs
    @PostMapping("/{id}/photo")
    public ResponseEntity<Farmer> uploadPhoto(@PathVariable Long id, @RequestParam("photo") MultipartFile file) {
        Optional<Farmer> farmerOpt = farmerRepository.findById(id);
        if (!farmerOpt.isPresent()) {
            return ResponseEntity.notFound().build();
        }

        Farmer farmer = farmerOpt.get();
        try {
            File directory = new File(uploadDir);
            if (!directory.exists()) {
                directory.mkdirs();
            }

            String originalFileName = file.getOriginalFilename();
            String extension = originalFileName != null && originalFileName.contains(".") 
                    ? originalFileName.substring(originalFileName.lastIndexOf(".")) 
                    : ".jpg";
            String fileName = "farmer_" + id + "_" + UUID.randomUUID() + extension;
            Path filePath = Paths.get(uploadDir, fileName);
            
            Files.write(filePath, file.getBytes());

            farmer.setPhotoPath(filePath.toString());
            Farmer updatedFarmer = farmerRepository.save(farmer);
            return ResponseEntity.ok(updatedFarmer);

        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @DeleteMapping("/{id}/photo")
    public ResponseEntity<Farmer> deletePhoto(@PathVariable Long id) {
        Optional<Farmer> farmerOpt = farmerRepository.findById(id);
        if (!farmerOpt.isPresent()) {
            return ResponseEntity.notFound().build();
        }

        Farmer farmer = farmerOpt.get();
        if (farmer.getPhotoPath() != null) {
            deletePhotoFile(farmer.getPhotoPath());
            farmer.setPhotoPath(null);
            Farmer updatedFarmer = farmerRepository.save(farmer);
            return ResponseEntity.ok(updatedFarmer);
        }
        return ResponseEntity.ok(farmer);
    }

    @GetMapping("/{id}/photo")
    public ResponseEntity<byte[]> getPhoto(@PathVariable Long id) {
        Optional<Farmer> farmerOpt = farmerRepository.findById(id);
        if (farmerOpt.isPresent() && farmerOpt.get().getPhotoPath() != null) {
            try {
                Path filePath = Paths.get(farmerOpt.get().getPhotoPath());
                if (Files.exists(filePath)) {
                    byte[] image = Files.readAllBytes(filePath);
                    String contentType = Files.probeContentType(filePath);
                    return ResponseEntity.ok()
                            .contentType(contentType != null ? MediaType.parseMediaType(contentType) : MediaType.IMAGE_JPEG)
                            .body(image);
                }
            } catch (IOException e) {
                // Ignore
            }
        }
        return ResponseEntity.notFound().build();
    }

    // ==========================================
    // NOTEBOOK PAGES APIS
    // ==========================================

    @GetMapping("/{id}/notebooks")
    public List<NotebookPage> getNotebookPages(@PathVariable Long id) {
        return notebookPageRepository.findByFarmerId(id);
    }

    @PostMapping("/{id}/notebooks")
    public ResponseEntity<NotebookPage> uploadNotebookPage(
            @PathVariable Long id,
            @RequestParam("photo") MultipartFile file,
            @RequestParam(value = "notes", required = false) String notes,
            @RequestParam(value = "year", required = false) String year) {
        
        if (!farmerRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }

        try {
            String notebookUploadDir = uploadDir + "/notebooks";
            File directory = new File(notebookUploadDir);
            if (!directory.exists()) {
                directory.mkdirs();
            }

            String originalFileName = file.getOriginalFilename();
            String extension = originalFileName != null && originalFileName.contains(".") 
                    ? originalFileName.substring(originalFileName.lastIndexOf(".")) 
                    : ".jpg";
            String fileName = "farmer_" + id + "_page_" + UUID.randomUUID() + extension;
            Path filePath = Paths.get(notebookUploadDir, fileName);
            
            Files.write(filePath, file.getBytes());

            String imageHash = calculateSha256(file);
            if (imageHash != null && notebookPageRepository.findFirstByFarmerIdAndImageHash(id, imageHash).isPresent()) {
                Files.deleteIfExists(filePath);
                return ResponseEntity.status(HttpStatus.CONFLICT).build();
            }

            NotebookPage page = new NotebookPage();
            page.setFarmerId(id);
            page.setImagePath(filePath.toString());
            page.setImageHash(imageHash);
            page.setUploadDate(LocalDateTime.now());
            page.setNotes(notes != null ? notes : "");
            page.setYear(year != null ? year : "");
            
            NotebookPage savedPage = notebookPageRepository.save(page);
            return ResponseEntity.ok(savedPage);

        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @DeleteMapping("/notebooks/{pageId}")
    public ResponseEntity<Void> deleteNotebookPage(@PathVariable Long pageId) {
        Optional<NotebookPage> pageOpt = notebookPageRepository.findById(pageId);
        if (pageOpt.isPresent()) {
            NotebookPage page = pageOpt.get();
            deletePhotoFile(page.getImagePath());
            notebookPageRepository.delete(page);
            return ResponseEntity.ok().build();
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/notebooks/{pageId}/image")
    public ResponseEntity<byte[]> getNotebookPageImage(@PathVariable Long pageId) {
        Optional<NotebookPage> pageOpt = notebookPageRepository.findById(pageId);
        if (pageOpt.isPresent()) {
            try {
                Path filePath = Paths.get(pageOpt.get().getImagePath());
                if (Files.exists(filePath)) {
                    byte[] image = Files.readAllBytes(filePath);
                    String contentType = Files.probeContentType(filePath);
                    return ResponseEntity.ok()
                            .contentType(contentType != null ? MediaType.parseMediaType(contentType) : MediaType.IMAGE_JPEG)
                            .body(image);
                }
            } catch (IOException e) {
                // Ignore
            }
        }
        return ResponseEntity.notFound().build();
    }

    private void deletePhotoFile(String pathStr) {
        try {
            // Handle multiple paths separated by comma
            if (pathStr != null && !pathStr.isEmpty()) {
                String[] paths = pathStr.split(",");
                for (String path : paths) {
                    Path filePath = Paths.get(path.trim());
                    Files.deleteIfExists(filePath);
                }
            }
        } catch (IOException e) {
            // Ignore
        }
    }

    private String mergeCropDetails(String existing, String incoming) {
        if (incoming == null || incoming.trim().isEmpty()) {
            return existing;
        }
        if (existing == null || existing.trim().isEmpty()) {
            return incoming;
        }
        if (existing.toLowerCase().contains(incoming.toLowerCase())) {
            return existing;
        }
        return existing + " | " + incoming;
    }

    private String buildNotebookNotes(Farmer farmer) {
        String serial = farmer.getSerialNumber() != null && !farmer.getSerialNumber().trim().isEmpty()
                ? "Serial " + farmer.getSerialNumber().trim() + " - "
                : "";
        return serial + farmer.getName() + " Notebook Page";
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

    private int parseSerialNumber(String serialNumber) {
        if (serialNumber == null || serialNumber.trim().isEmpty()) {
            return Integer.MAX_VALUE;
        }
        try {
            return Integer.parseInt(serialNumber.replaceAll("[^0-9]", ""));
        } catch (NumberFormatException ex) {
            return Integer.MAX_VALUE;
        }
    }
}
