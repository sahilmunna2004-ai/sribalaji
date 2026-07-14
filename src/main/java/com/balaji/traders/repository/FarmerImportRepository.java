package com.balaji.traders.repository;

import com.balaji.traders.model.FarmerImport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FarmerImportRepository extends JpaRepository<FarmerImport, Long> {
    List<FarmerImport> findByShopTypeAndSeasonAndStatusOrderByCreatedAtAsc(String shopType, String season, String status);
    Optional<FarmerImport> findFirstByShopTypeAndSeasonAndImageHashAndStatus(String shopType, String season, String imageHash, String status);
    Optional<FarmerImport> findFirstByShopTypeAndSeasonAndSerialNumberAndStatus(String shopType, String season, String serialNumber, String status);
}