package com.quanlyduan.webxulyanh.demo.service.impl;

import com.quanlyduan.webxulyanh.demo.service.StorageService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Service
public class LocalStorageServiceImpl implements StorageService {

    @Value("${app.storage.upload-dir:uploads}")
    private String uploadDir;

    private Path rootLocation;

    @PostConstruct
    public void init() {
        this.rootLocation = Paths.get(uploadDir);
        try {
            Files.createDirectories(rootLocation);
        } catch (IOException e) {
            throw new RuntimeException("Could not initialize storage directory", e);
        }
    }

    @Override
    public String store(MultipartFile file) {
        String originalFilename = StringUtils.cleanPath(file.getOriginalFilename());
        String extension = "";
        if (originalFilename.contains(".")) {
            extension = originalFilename.substring(originalFilename.lastIndexOf("."));
        }
        String newFilename = UUID.randomUUID().toString() + extension;

        try {
            if (file.isEmpty()) {
                throw new RuntimeException("Failed to store empty file " + originalFilename);
            }
            if (newFilename.contains("..")) {
                // This is a security check
                throw new RuntimeException("Cannot store file with relative path outside current directory " + newFilename);
            }
            Files.copy(file.getInputStream(), this.rootLocation.resolve(newFilename), StandardCopyOption.REPLACE_EXISTING);
            return newFilename;
        } catch (IOException e) {
            throw new RuntimeException("Failed to store file " + newFilename, e);
        }
    }

    @Override
    public Resource loadAsResource(String filename) {
        try {
            Path file = rootLocation.resolve(filename).normalize();
            if (!file.toAbsolutePath().startsWith(rootLocation.toAbsolutePath())) {
                throw new SecurityException("Access denied. Path traversal attempt detected: " + filename);
            }
            Resource resource = new UrlResource(file.toUri());
            if (resource.exists() || resource.isReadable()) {
                return resource;
            } else {
                throw new RuntimeException("Could not read file: " + filename);
            }
        } catch (MalformedURLException e) {
            throw new RuntimeException("Could not read file: " + filename, e);
        }
    }

    @Override
    public void delete(String filename) {
        try {
            Path file = rootLocation.resolve(filename).normalize();
            if (!file.toAbsolutePath().startsWith(rootLocation.toAbsolutePath())) {
                throw new SecurityException("Access denied. Path traversal attempt detected: " + filename);
            }
            Files.deleteIfExists(file);
        } catch (IOException e) {
            throw new RuntimeException("Could not delete file: " + filename, e);
        }
    }

    @Override
    public void storeChunk(MultipartFile file, String identifier, int chunkNumber) {
        try {
            if (file.isEmpty()) {
                throw new RuntimeException("Failed to store empty chunk.");
            }
            Path chunkDir = this.rootLocation.resolve("chunks").resolve(identifier);
            Files.createDirectories(chunkDir);
            Path chunkFile = chunkDir.resolve(String.valueOf(chunkNumber));
            Files.copy(file.getInputStream(), chunkFile, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new RuntimeException("Failed to store chunk " + chunkNumber, e);
        }
    }

    @Override
    public String mergeChunks(String identifier, String originalFilename, int totalChunks) {
        String extension = "";
        if (originalFilename != null && originalFilename.contains(".")) {
            extension = originalFilename.substring(originalFilename.lastIndexOf("."));
        }
        String newFilename = UUID.randomUUID().toString() + extension;
        Path finalFile = this.rootLocation.resolve(newFilename);

        try {
            Path chunkDir = this.rootLocation.resolve("chunks").resolve(identifier);
            if (!Files.exists(chunkDir)) {
                throw new RuntimeException("Chunk directory not found for identifier: " + identifier);
            }

            Files.createFile(finalFile);
            for (int i = 0; i < totalChunks; i++) {
                Path chunkFile = chunkDir.resolve(String.valueOf(i));
                if (!Files.exists(chunkFile)) {
                    throw new RuntimeException("Missing chunk: " + i);
                }
                Files.write(finalFile, Files.readAllBytes(chunkFile), java.nio.file.StandardOpenOption.APPEND);
            }

            // Cleanup chunks
            try (java.util.stream.Stream<Path> walk = Files.walk(chunkDir)) {
                walk.sorted(java.util.Comparator.reverseOrder())
                    .map(Path::toFile)
                    .forEach(java.io.File::delete);
            }

            return newFilename;
        } catch (IOException e) {
            throw new RuntimeException("Failed to merge chunks", e);
        }
    }
}
