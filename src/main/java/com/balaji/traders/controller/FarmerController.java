package com.balaji.traders.controller;

import com.balaji.traders.model.Farmer;
import com.balaji.traders.model.NotebookPage;
import com.balaji.traders.repository.FarmerRepository;
import com.balaji.traders.repository.NotebookPageRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/farmers")
@CrossOrigin(origins = "*")
public class FarmerController {

    @Autowired
    private FarmerRepository farmerRepository;

    @Autowired
    private NotebookPageRepository notebookPageRepository;

    @Value("${app.upload.dir:./data/photos}")
    private String uploadDir;

    @GetMapping
    public List<Farmer> getFarmers(@RequestParam String shopType) {
        return farmerRepository.findByShopType(shopType);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Farmer> getFarmerById(@PathVariable Long id) {
        Optional<Farmer> farmer = farmerRepository.findById(id);
        return farmer.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public Farmer createFarmer(@RequestBody Farmer farmer) {
        return farmerRepository.save(farmer);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Farmer> updateFarmer(@PathVariable Long id, @RequestBody Farmer farmerDetails) {
        Optional<Farmer> farmerOpt = farmerRepository.findById(id);
        if (farmerOpt.isPresent()) {
            Farmer farmer = farmerOpt.get();
            farmer.setName(farmerDetails.getName());
            farmer.setPhone(farmerDetails.getPhone());
            farmer.setVillage(farmerDetails.getVillage());
            farmer.setCropDetails(farmerDetails.getCropDetails());
            return ResponseEntity.ok(farmerRepository.save(farmer));
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
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
            String fileName = "farmer_" + id + extension;
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
            @RequestParam(value = "notes", required = false) String notes) {
        
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
            String fileName = "farmer_" + id + "_page_" + System.currentTimeMillis() + extension;
            Path filePath = Paths.get(notebookUploadDir, fileName);
            
            Files.write(filePath, file.getBytes());

            NotebookPage page = new NotebookPage();
            page.setFarmerId(id);
            page.setImagePath(filePath.toString());
            page.setUploadDate(LocalDate.now());
            page.setNotes(notes != null ? notes : "");
            
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
            Path path = Paths.get(pathStr);
            Files.deleteIfExists(path);
        } catch (IOException e) {
            // Ignore
        }
    }
}
