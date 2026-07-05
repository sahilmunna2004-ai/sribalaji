package com.balaji.traders.repository.file;

import com.balaji.traders.model.Stock;
import tools.jackson.core.type.TypeReference;
import org.springframework.stereotype.Repository;

import java.io.File;
import java.io.IOException;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Repository
public class StockFileRepository {
    private final File storageFile = new File("data/stock.json");

    public List<Stock> findByShopType(String shopType) {
        return readAll().stream().filter(s -> shopType.equals(s.getShopType())).collect(Collectors.toList());
    }

    public Optional<Stock> findById(Long id) {
        return readAll().stream().filter(s -> s.getId() != null && s.getId().equals(id)).findFirst();
    }

    public Stock save(Stock stock) {
        try {
            List<Stock> all = readAll();
            if (stock.getId() == null) {
                long next = all.stream().map(Stock::getId).filter(i -> i != null).max(Comparator.naturalOrder()).orElse(0L) + 1;
                stock.setId(next);
                all.add(stock);
            } else {
                all.removeIf(s -> s.getId() != null && s.getId().equals(stock.getId()));
                all.add(stock);
            }
            FileStoreUtils.writeListAtomic(storageFile, all);
            return stock;
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

    public void deleteById(Long id) {
        try {
            List<Stock> all = readAll();
            all.removeIf(s -> s.getId() != null && s.getId().equals(id));
            FileStoreUtils.writeListAtomic(storageFile, all);
        } catch (IOException e) {
            // ignore
        }
    }

    public boolean existsById(Long id) { return findById(id).isPresent(); }

    private List<Stock> readAll() {
        return FileStoreUtils.readList(storageFile, new TypeReference<List<Stock>>() {});
    }
}
