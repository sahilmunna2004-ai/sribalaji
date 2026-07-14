package com.balaji.traders.repository.file;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.List;

public class FileStoreUtils {
    private static final ObjectMapper mapper = new ObjectMapper();

    public static synchronized <T> List<T> readList(File file, TypeReference<List<T>> typeRef) {
        try {
            if (!file.exists()) return new ArrayList<>();
            return mapper.readValue(file, typeRef);
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    public static synchronized void writeListAtomic(File file, Object data) throws IOException {
        if (file.getParentFile() != null) {
            Files.createDirectories(file.getParentFile().toPath());
        }
        File tmp = new File(file.getAbsolutePath() + ".tmp");
        if (tmp.getParentFile() != null) {
            Files.createDirectories(tmp.getParentFile().toPath());
        }
        mapper.writerWithDefaultPrettyPrinter().writeValue(tmp, data);
        Path tmpPath = tmp.toPath();
        Files.move(tmpPath, file.toPath(), StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
    }
}
