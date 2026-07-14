package com.balaji.traders.repository;

import com.balaji.traders.model.Farmer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FarmerRepository extends JpaRepository<Farmer, Long> {
    List<Farmer> findByShopType(String shopType);
    List<Farmer> findByShopTypeAndSeason(String shopType, String season);
    List<Farmer> findByShopTypeOrderBySerialNumberAscIdAsc(String shopType);
    Optional<Farmer> findFirstByShopTypeAndSeasonAndSerialNumber(String shopType, String season, String serialNumber);
    Optional<Farmer> findFirstByShopTypeAndSeasonAndNameIgnoreCase(String shopType, String season, String name);
}
