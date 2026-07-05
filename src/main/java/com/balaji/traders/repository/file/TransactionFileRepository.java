package com.balaji.traders.repository.file;

import com.balaji.traders.model.Transaction;
import tools.jackson.core.type.TypeReference;
import org.springframework.stereotype.Repository;

import java.io.File;
import java.io.IOException;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Repository
public class TransactionFileRepository {
    private final File storageFile = new File("data/transactions.json");

    public List<Transaction> findByShopType(String shopType) {
        return readAll().stream().filter(t -> shopType.equals(t.getShopType())).collect(Collectors.toList());
    }

    public List<Transaction> findByFarmerIdAndShopType(Long farmerId, String shopType) {
        return readAll().stream().filter(t -> t.getFarmerId() != null && t.getFarmerId().equals(farmerId) && shopType.equals(t.getShopType())).collect(Collectors.toList());
    }

    public Optional<Transaction> findById(Long id) {
        return readAll().stream().filter(t -> t.getId() != null && t.getId().equals(id)).findFirst();
    }

    public Transaction save(Transaction tx) {
        try {
            List<Transaction> all = readAll();
            if (tx.getId() == null) {
                long next = all.stream().map(Transaction::getId).filter(i -> i != null).max(Comparator.naturalOrder()).orElse(0L) + 1;
                tx.setId(next);
                all.add(tx);
            } else {
                all.removeIf(t -> t.getId() != null && t.getId().equals(tx.getId()));
                all.add(tx);
            }
            FileStoreUtils.writeListAtomic(storageFile, all);
            return tx;
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

    public void deleteById(Long id) {
        try {
            List<Transaction> all = readAll();
            all.removeIf(t -> t.getId() != null && t.getId().equals(id));
            FileStoreUtils.writeListAtomic(storageFile, all);
        } catch (IOException e) {
            // ignore
        }
    }

    public boolean existsById(Long id) { return findById(id).isPresent(); }

    private List<Transaction> readAll() {
        return FileStoreUtils.readList(storageFile, new TypeReference<List<Transaction>>() {});
    }
}
