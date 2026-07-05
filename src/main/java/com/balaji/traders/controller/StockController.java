package com.balaji.traders.controller;

import com.balaji.traders.model.Stock;
import com.balaji.traders.repository.file.StockFileRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/stock")
@CrossOrigin(origins = "*")
public class StockController {

    @Autowired
    private StockFileRepository stockRepository;

    @GetMapping
    public List<Stock> getStock(@RequestParam String shopType) {
        return stockRepository.findByShopType(shopType);
    }

    @PostMapping
    public Stock addStock(@RequestBody Stock stock) {
        return stockRepository.save(stock);
    }

    @PutMapping("/{id}/return")
    public ResponseEntity<Stock> returnStock(@PathVariable Long id) {
        Optional<Stock> stockOpt = stockRepository.findById(id);
        if (stockOpt.isPresent()) {
            Stock stock = stockOpt.get();
            stock.setIsReturned(true);
            return ResponseEntity.ok(stockRepository.save(stock));
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteStock(@PathVariable Long id) {
        if (stockRepository.existsById(id)) {
            stockRepository.deleteById(id);
            return ResponseEntity.ok().build();
        } else {
            return ResponseEntity.notFound().build();
        }
    }
}
