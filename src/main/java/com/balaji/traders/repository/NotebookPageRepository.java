package com.balaji.traders.repository;

import com.balaji.traders.model.NotebookPage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface NotebookPageRepository extends JpaRepository<NotebookPage, Long> {
    List<NotebookPage> findByFarmerId(Long farmerId);
    List<NotebookPage> findByFarmerIdAndYear(Long farmerId, String year);
    Optional<NotebookPage> findFirstByFarmerIdAndImageHash(Long farmerId, String imageHash);
}
