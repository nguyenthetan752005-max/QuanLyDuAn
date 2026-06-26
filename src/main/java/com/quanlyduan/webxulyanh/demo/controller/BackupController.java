package com.quanlyduan.webxulyanh.demo.controller;

import com.mongodb.client.MongoCollection;
import com.quanlyduan.webxulyanh.demo.entity.User;
import com.quanlyduan.webxulyanh.demo.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.bson.Document;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.security.Principal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import java.util.zip.ZipOutputStream;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.multipart.MultipartFile;

/**
 * Application-level backup &amp; restore (FR08 / US12 / US18).
 * Exports/imports all MongoDB collections and physical files as a single ZIP file.
 * Admin-only.
 */
@RestController
@RequestMapping("/api/v1/admin/backup")
@RequiredArgsConstructor
public class BackupController {

    private final MongoTemplate mongoTemplate;
    private final UserRepository userRepository;

    @Value("${app.storage.upload-dir:uploads}")
    private String uploadDir;

    private boolean isAdmin(Principal principal) {
        if (principal == null) return false;
        User user = userRepository.findByUsername(principal.getName()).orElse(null);
        return user != null && "ADMIN".equalsIgnoreCase(user.getRole());
    }

    @GetMapping("/export")
    public ResponseEntity<?> exportBackup(Principal principal) {
        if (!isAdmin(principal)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        Set<String> collectionNames = mongoTemplate.getCollectionNames();
        StringBuilder sb = new StringBuilder();
        sb.append("{\"exportedAt\":\"").append(LocalDateTime.now()).append("\",\"collections\":{");

        boolean firstCol = true;
        for (String name : collectionNames) {
            if (!firstCol) sb.append(",");
            firstCol = false;
            sb.append("\"").append(name).append("\":[");

            List<Document> docs = mongoTemplate.findAll(Document.class, name);
            for (int i = 0; i < docs.size(); i++) {
                if (i > 0) sb.append(",");
                sb.append(docs.get(i).toJson()); // MongoDB extended JSON (preserves _id/dates)
            }
            sb.append("]");
        }
        sb.append("}}");

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (ZipOutputStream zos = new ZipOutputStream(baos)) {
            ZipEntry dbEntry = new ZipEntry("database.json");
            zos.putNextEntry(dbEntry);
            zos.write(sb.toString().getBytes(StandardCharsets.UTF_8));
            zos.closeEntry();
            
            Path uploadsPath = Paths.get(uploadDir);
            if (Files.exists(uploadsPath)) {
                Files.walk(uploadsPath)
                     .filter(path -> !Files.isDirectory(path))
                     .forEach(path -> {
                         try {
                             ZipEntry entry = new ZipEntry("uploads/" + uploadsPath.relativize(path).toString().replace("\\", "/"));
                             zos.putNextEntry(entry);
                             Files.copy(path, zos);
                             zos.closeEntry();
                         } catch (Exception e) {
                             e.printStackTrace();
                         }
                     });
            }
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Lỗi khi tạo file ZIP: " + e.getMessage());
        }

        String filename = "lily-backup-" + System.currentTimeMillis() + ".zip";
        HttpHeaders headers = new HttpHeaders();
        headers.add(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"");
        return ResponseEntity.ok()
                .headers(headers)
                .contentType(MediaType.parseMediaType("application/zip"))
                .body(baos.toByteArray());
    }

    @PostMapping(value = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> importBackup(@RequestParam("file") MultipartFile file, Principal principal) {
        if (!isAdmin(principal)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        Map<String, Object> result = new HashMap<>();
        try {
            String json = null;
            try (ZipInputStream zis = new ZipInputStream(file.getInputStream())) {
                ZipEntry entry;
                while ((entry = zis.getNextEntry()) != null) {
                    if (entry.getName().equals("database.json")) {
                        ByteArrayOutputStream buffer = new ByteArrayOutputStream();
                        int nRead;
                        byte[] data = new byte[1024];
                        while ((nRead = zis.read(data, 0, data.length)) != -1) {
                            buffer.write(data, 0, nRead);
                        }
                        json = new String(buffer.toByteArray(), StandardCharsets.UTF_8);
                    } else if (entry.getName().startsWith("uploads/")) {
                        String fileName = entry.getName().substring("uploads/".length());
                        Path targetPath = Paths.get(uploadDir).resolve(fileName);
                        Files.createDirectories(targetPath.getParent());
                        Files.copy(zis, targetPath, StandardCopyOption.REPLACE_EXISTING);
                    }
                    zis.closeEntry();
                }
            }

            if (json == null) {
                result.put("message", "Tệp sao lưu không hợp lệ (thiếu database.json).");
                return ResponseEntity.badRequest().body(result);
            }

            Document root = Document.parse(json);
            Document collections = root.get("collections", Document.class);
            if (collections == null) {
                result.put("message", "Tệp sao lưu không hợp lệ (thiếu 'collections').");
                return ResponseEntity.badRequest().body(result);
            }

            int restoredCollections = 0;
            int restoredDocs = 0;
            for (String name : collections.keySet()) {
                List<Document> docs = collections.getList(name, Document.class);
                MongoCollection<Document> col = mongoTemplate.getDb().getCollection(name);
                col.drop(); // full restore: replace existing data
                if (docs != null && !docs.isEmpty()) {
                    col.insertMany(docs);
                    restoredDocs += docs.size();
                }
                restoredCollections++;
            }

            result.put("message", "Phục hồi thành công.");
            result.put("collections", restoredCollections);
            result.put("documents", restoredDocs);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            result.put("message", "Phục hồi thất bại: " + (e.getMessage() != null ? e.getMessage() : "lỗi không xác định"));
            return ResponseEntity.badRequest().body(result);
        }
    }
}
