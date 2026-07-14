package com.balaji.traders.repository.file;

import com.balaji.traders.model.NotebookPage;
import com.fasterxml.jackson.core.type.TypeReference;
import org.springframework.stereotype.Repository;

import java.io.File;
import java.io.IOException;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Repository
public class NotebookPageFileRepository {
    private final File storageFile = new File("data/notebook_pages.json");

    public List<NotebookPage> findByFarmerId(Long farmerId) {
        return readAll().stream().filter(p -> p.getFarmerId() != null && p.getFarmerId().equals(farmerId)).collect(Collectors.toList());
    }

    public Optional<NotebookPage> findById(Long id) {
        return readAll().stream().filter(p -> p.getId() != null && p.getId().equals(id)).findFirst();
    }

    public NotebookPage save(NotebookPage page) {
        try {
            List<NotebookPage> all = readAll();
            if (page.getId() == null) {
                long next = all.stream().map(NotebookPage::getId).filter(i -> i != null).max(Comparator.naturalOrder()).orElse(0L) + 1;
                page.setId(next);
                all.add(page);
            } else {
                all.removeIf(p -> p.getId() != null && p.getId().equals(page.getId()));
                all.add(page);
            }
            FileStoreUtils.writeListAtomic(storageFile, all);
            return page;
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

    public void delete(NotebookPage page) {
        deleteById(page.getId());
    }

    public void deleteById(Long id) {
        try {
            List<NotebookPage> all = readAll();
            all.removeIf(p -> p.getId() != null && p.getId().equals(id));
            FileStoreUtils.writeListAtomic(storageFile, all);
        } catch (IOException e) {
            // ignore
        }
    }

    private List<NotebookPage> readAll() {
        return FileStoreUtils.readList(storageFile, new TypeReference<List<NotebookPage>>() {});
    }
}
