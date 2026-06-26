package com.quanlyduan.webxulyanh.demo.service;

import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

public interface StorageService {
    String store(MultipartFile file);
    Resource loadAsResource(String filename);
    void delete(String filename);
    void storeChunk(MultipartFile file, String identifier, int chunkNumber);
    String mergeChunks(String identifier, String originalFilename, int totalChunks);
}
