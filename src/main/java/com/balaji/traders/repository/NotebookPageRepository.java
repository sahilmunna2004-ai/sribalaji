package com.balaji.traders.repository;

import com.balaji.traders.model.NotebookPage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface NotebookPageRepository extends JpaRepository<NotebookPage, Long> {
    List<NotebookPage> findByFarmerId(Long farmerId);
}
