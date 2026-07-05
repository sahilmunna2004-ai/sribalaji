package com.balaji.traders.repository.file;

import com.balaji.traders.model.Farmer;
import tools.jackson.core.type.TypeReference;
import org.springframework.stereotype.Repository;

import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Repository
public class FarmerFileRepository {
    private final File storageFile = new File("data/farmers.json");

    public List<Farmer> findByShopType(String shopType) {
        List<Farmer> all = readAll();
        if (shopType == null) return all;
        return all.stream().filter(f -> shopType.equals(f.getShopType())).collect(Collectors.toList());
    }

    public List<Farmer> findAll() { return readAll(); }

    public Optional<Farmer> findById(Long id) {
        return readAll().stream().filter(f -> f.getId() != null && f.getId().equals(id)).findFirst();
    }

    public Farmer save(Farmer farmer) {
        try {
            List<Farmer> all = readAll();
            if (farmer.getId() == null) {
                long next = all.stream().map(Farmer::getId).filter(i -> i != null).max(Comparator.naturalOrder()).orElse(0L) + 1;
                farmer.setId(next);
                all.add(farmer);
            } else {
                all.removeIf(f -> f.getId() != null && f.getId().equals(farmer.getId()));
                all.add(farmer);
            }
            FileStoreUtils.writeListAtomic(storageFile, all);
            return farmer;
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

    public void delete(Farmer farmer) {
        deleteById(farmer.getId());
    }

    public void deleteById(Long id) {
        try {
            List<Farmer> all = readAll();
            all.removeIf(f -> f.getId() != null && f.getId().equals(id));
            FileStoreUtils.writeListAtomic(storageFile, all);
        } catch (IOException e) {
            // ignore
        }
    }

    public boolean existsById(Long id) { return findById(id).isPresent(); }

    private List<Farmer> readAll() {
        return FileStoreUtils.readList(storageFile, new TypeReference<List<Farmer>>() {});
    }
}
