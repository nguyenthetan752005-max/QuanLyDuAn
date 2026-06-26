package com.quanlyduan.webxulyanh.demo.controller;

import com.quanlyduan.webxulyanh.demo.dto.request.MediaAssetRequestDTO;
import com.quanlyduan.webxulyanh.demo.dto.response.MediaAssetResponseDTO;
import com.quanlyduan.webxulyanh.demo.service.MediaAssetService;
import com.quanlyduan.webxulyanh.demo.entity.MediaAsset;
import com.quanlyduan.webxulyanh.demo.entity.User;
import com.quanlyduan.webxulyanh.demo.exception.ResourceNotFoundException;
import com.quanlyduan.webxulyanh.demo.repository.MediaAssetRepository;
import com.quanlyduan.webxulyanh.demo.repository.UserRepository;
import com.quanlyduan.webxulyanh.demo.service.StorageService;
import com.quanlyduan.webxulyanh.demo.service.ActivityLogService;
import com.quanlyduan.webxulyanh.demo.service.SystemSettingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.security.Principal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/media-assets")
@RequiredArgsConstructor
public class MediaAssetController {

    private final MediaAssetService mediaAssetService;
    private final StorageService storageService;
    private final UserRepository userRepository;
    private final MediaAssetRepository mediaAssetRepository;
    private final SystemSettingService systemSettingService;
    private final ActivityLogService activityLogService;

    @PostMapping("/upload")
    public ResponseEntity<MediaAssetResponseDTO> uploadFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "folderId", required = false) String folderId,
            Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        // EX-02: Xác thực định dạng MIME-type và dung lượng tệp tin trước khi lưu
        String contentType = file.getContentType();
        if (contentType == null || 
            (!contentType.startsWith("image/") && 
             !contentType.startsWith("video/") && 
             !contentType.startsWith("audio/"))) {
            throw new IllegalArgumentException("Định dạng tệp không được hỗ trợ. Chỉ cho phép tải lên Ảnh, Video và Âm thanh.");
        }
        
        long maxVideoAudioSize = 100L * 1024 * 1024; // 100MB
        long maxImageSize = 15L * 1024 * 1024; // 15MB
        if (contentType.startsWith("image/") && file.getSize() > maxImageSize) {
            throw new IllegalArgumentException("Dung lượng ảnh vượt quá giới hạn cho phép (15MB).");
        } else if ((contentType.startsWith("video/") || contentType.startsWith("audio/")) && file.getSize() > maxVideoAudioSize) {
            throw new IllegalArgumentException("Dung lượng tệp vượt quá giới hạn cho phép (100MB).");
        }
        
        User user = getCurrentUser(principal);

        // C5 — Storage quota check. Quota is configurable via SystemSetting `storage_quota_mb`
        // (admins can update it). 0 / blank / missing setting means unlimited.
        try {
            String quotaStr = systemSettingService.getSettingByKey("storage_quota_mb")
                    .map(s -> s.getSettingValue()).orElse("0");
            double quotaMb = Double.parseDouble(quotaStr);
            if (quotaMb > 0) {
                double usedMb = mediaAssetRepository.findByUserIdAndDeleted(user.getId(), false).stream()
                        .map(MediaAsset::getFileSizeMb)
                        .filter(java.util.Objects::nonNull)
                        .mapToDouble(Double::doubleValue)
                        .sum();
                double incomingMb = (double) file.getSize() / (1024 * 1024);
                if (usedMb + incomingMb > quotaMb) {
                    throw new IllegalArgumentException(String.format(
                            "Vượt quá hạn mức lưu trữ: %.1f MB / %.0f MB. Vui lòng xóa bớt tệp tin cũ rồi thử lại.",
                            usedMb, quotaMb));
                }
            }
        } catch (NumberFormatException ignored) { /* mis-configured quota → skip */ }

        String filename = storageService.store(file);

        MediaAssetRequestDTO request = new MediaAssetRequestDTO();
        request.setUserId(user.getId());
        request.setFileName(file.getOriginalFilename());
        
        if (filename.startsWith("http://") || filename.startsWith("https://")) {
            request.setFilePath(filename);
        } else {
            request.setFilePath("/uploads/" + filename);
        }
        
        if (contentType.startsWith("video/")) {
            request.setType(com.quanlyduan.webxulyanh.demo.enums.MediaType.VIDEO);
        } else if (contentType.startsWith("audio/")) {
            request.setType(com.quanlyduan.webxulyanh.demo.enums.MediaType.AUDIO);
        } else {
            request.setType(com.quanlyduan.webxulyanh.demo.enums.MediaType.IMAGE);
        }
        request.setFileSizeMb((double) file.getSize() / (1024 * 1024));
        
        // Gán folderId nếu được gửi lên
        if (folderId != null && !folderId.trim().isEmpty() && !"root".equalsIgnoreCase(folderId)) {
            request.setFolderId(folderId);
        }

        MediaAssetResponseDTO response = mediaAssetService.createMediaAsset(request);
        activityLogService.log(user.getId(), "ASSET_UPLOAD",
                "Tải lên tệp \"" + file.getOriginalFilename() + "\"", response.getId());
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @PostMapping("/upload/chunk")
    public ResponseEntity<?> uploadChunk(
            @RequestParam("file") MultipartFile file,
            @RequestParam("identifier") String identifier,
            @RequestParam("chunkNumber") int chunkNumber,
            @RequestParam("totalChunks") int totalChunks,
            @RequestParam("fileName") String fileName,
            @RequestParam("contentType") String contentType,
            @RequestParam("totalSize") long totalSize,
            @RequestParam(value = "folderId", required = false) String folderId,
            Principal principal) {
        
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        User user = getCurrentUser(principal);

        // Check Quota on first chunk
        if (chunkNumber == 0) {
            try {
                String quotaStr = systemSettingService.getSettingByKey("storage_quota_mb")
                        .map(s -> s.getSettingValue()).orElse("0");
                double quotaMb = Double.parseDouble(quotaStr);
                if (quotaMb > 0) {
                    double usedMb = mediaAssetRepository.findByUserIdAndDeleted(user.getId(), false).stream()
                            .map(MediaAsset::getFileSizeMb)
                            .filter(java.util.Objects::nonNull)
                            .mapToDouble(Double::doubleValue)
                            .sum();
                    double incomingMb = (double) totalSize / (1024 * 1024);
                    if (usedMb + incomingMb > quotaMb) {
                        throw new IllegalArgumentException(String.format(
                                "Vượt quá hạn mức lưu trữ: %.1f MB / %.0f MB. Vui lòng xóa bớt tệp tin cũ rồi thử lại.",
                                usedMb, quotaMb));
                    }
                }
            } catch (NumberFormatException ignored) { /* mis-configured quota → skip */ }
        }

        // Store chunk
        storageService.storeChunk(file, identifier, chunkNumber);

        // Check if last chunk
        if (chunkNumber == totalChunks - 1) {
            // merge chunks
            String finalFileName = storageService.mergeChunks(identifier, fileName, totalChunks);
            
            MediaAssetRequestDTO request = new MediaAssetRequestDTO();
            request.setUserId(user.getId());
            request.setFileName(fileName);
            
            if (finalFileName.startsWith("http://") || finalFileName.startsWith("https://")) {
                request.setFilePath(finalFileName);
            } else {
                request.setFilePath("/uploads/" + finalFileName);
            }
            
            if (contentType.startsWith("video/")) {
                request.setType(com.quanlyduan.webxulyanh.demo.enums.MediaType.VIDEO);
            } else if (contentType.startsWith("audio/")) {
                request.setType(com.quanlyduan.webxulyanh.demo.enums.MediaType.AUDIO);
            } else {
                request.setType(com.quanlyduan.webxulyanh.demo.enums.MediaType.IMAGE);
            }
            request.setFileSizeMb((double) totalSize / (1024 * 1024));
            
            if (folderId != null && !folderId.trim().isEmpty() && !"root".equalsIgnoreCase(folderId)) {
                request.setFolderId(folderId);
            }

            MediaAssetResponseDTO response = mediaAssetService.createMediaAsset(request);
            activityLogService.log(user.getId(), "ASSET_UPLOAD",
                    "Tải lên tệp (chunked) \"" + fileName + "\"", response.getId());
            return new ResponseEntity<>(response, HttpStatus.CREATED);
        }

        return ResponseEntity.ok(Map.of("message", "Chunk uploaded"));
    }

    @PostMapping
    public ResponseEntity<MediaAssetResponseDTO> createMediaAsset(@RequestBody MediaAssetRequestDTO request) {
        return new ResponseEntity<>(mediaAssetService.createMediaAsset(request), HttpStatus.CREATED);
    }

    @GetMapping("/{id}")
    public ResponseEntity<MediaAssetResponseDTO> getMediaAssetById(@PathVariable String id) {
        return ResponseEntity.ok(mediaAssetService.getMediaAssetById(id));
    }

    @GetMapping
    public ResponseEntity<org.springframework.data.domain.Page<MediaAssetResponseDTO>> getMediaAssets(
            @RequestParam(value = "folderId", required = false) String folderId,
            @RequestParam(value = "isDeleted", defaultValue = "false") boolean isDeleted,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(required = false) String search,
            Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        User user = getCurrentUser(principal);
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(
                page, size, org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "uploadedAt"));
        
        if (isDeleted) {
            return ResponseEntity.ok(mediaAssetService.getDeletedMediaAssets(user.getId(), search, pageable));
        } else {
            return ResponseEntity.ok(mediaAssetService.getActiveMediaAssets(user.getId(), folderId, search, pageable));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<MediaAssetResponseDTO> updateMediaAsset(
            @PathVariable String id, 
            @RequestBody MediaAssetRequestDTO request,
            Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        User user = getCurrentUser(principal);
        
        // Hỗ trợ gán parent folder là null nếu gửi "root" hoặc rỗng
        if (request.getFolderId() != null && ("root".equalsIgnoreCase(request.getFolderId()) || request.getFolderId().trim().isEmpty())) {
            request.setFolderId(null);
        }

        return ResponseEntity.ok(mediaAssetService.updateMediaAsset(id, user.getId(), request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMediaAsset(@PathVariable String id, Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        User user = getCurrentUser(principal);
        mediaAssetService.softDeleteMediaAsset(id, user.getId());
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/restore")
    public ResponseEntity<Void> restoreMediaAsset(@PathVariable String id, Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        User user = getCurrentUser(principal);
        mediaAssetService.restoreMediaAsset(id, user.getId());
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}/permanent")
    public ResponseEntity<Void> deleteMediaAssetPermanently(@PathVariable String id, Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        User user = getCurrentUser(principal);
        mediaAssetService.deleteMediaAssetPermanently(id, user.getId());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/usage")
    public ResponseEntity<List<Map<String, String>>> getMediaAssetUsage(@PathVariable String id, Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        User user = getCurrentUser(principal);
        return ResponseEntity.ok(mediaAssetService.getMediaAssetUsage(id, user.getId()));
    }

    @PostMapping("/extract-audio")
    public ResponseEntity<MediaAssetResponseDTO> extractAudio(
            @RequestParam("assetId") String assetId,
            @RequestParam(value = "folderId", required = false) String folderId,
            Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        User user = getCurrentUser(principal);
        MediaAssetResponseDTO response = mediaAssetService.extractAudio(assetId, folderId, user.getId());
        activityLogService.log(user.getId(), "EXTRACT_AUDIO", "Trích xuất âm thanh từ video", response.getId());
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    private User getCurrentUser(Principal principal) {
        return userRepository.findByUsername(principal.getName())
                .orElseGet(() -> userRepository.findByEmail(principal.getName())
                        .orElseThrow(() -> new ResourceNotFoundException("User not found")));
    }
}
