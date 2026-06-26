package com.quanlyduan.webxulyanh.demo.service.impl;

import com.quanlyduan.webxulyanh.demo.dto.request.MediaAssetRequestDTO;
import com.quanlyduan.webxulyanh.demo.dto.response.MediaAssetResponseDTO;
import com.quanlyduan.webxulyanh.demo.entity.MediaAsset;
import com.quanlyduan.webxulyanh.demo.entity.MediaFolder;
import com.quanlyduan.webxulyanh.demo.entity.Project;
import com.quanlyduan.webxulyanh.demo.exception.ResourceNotFoundException;
import com.quanlyduan.webxulyanh.demo.repository.MediaAssetRepository;
import com.quanlyduan.webxulyanh.demo.repository.MediaFolderRepository;
import com.quanlyduan.webxulyanh.demo.repository.ProjectRepository;
import com.quanlyduan.webxulyanh.demo.service.MediaAssetService;
import com.quanlyduan.webxulyanh.demo.service.StorageService;
import com.quanlyduan.webxulyanh.demo.service.SystemSettingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class MediaAssetServiceImpl implements MediaAssetService {

    private final MediaAssetRepository mediaAssetRepository;
    private final MediaFolderRepository mediaFolderRepository;
    private final ProjectRepository projectRepository;
    private final StorageService storageService;
    private final SystemSettingService systemSettingService;

    @org.springframework.beans.factory.annotation.Value("${app.ffmpeg.path:ffmpeg}")
    private String ffmpegPath;

    @org.springframework.beans.factory.annotation.Value("${app.storage.upload-dir:uploads}")
    private String uploadDir;

    @Override
    public MediaAssetResponseDTO createMediaAsset(MediaAssetRequestDTO request) {
        String fileName = request.getFileName();
        String folderId = request.getFolderId();
        if ("root".equalsIgnoreCase(folderId)) {
            folderId = null;
        }
        String userId = request.getUserId();

        List<MediaAsset> existing = mediaAssetRepository.findByUserIdAndFolderIdAndDeleted(userId, folderId, false);
        String finalName = fileName;
        int count = 1;

        String nameWithoutExt = fileName;
        String ext = "";
        int dotIndex = fileName.lastIndexOf(".");
        if (dotIndex > 0) {
            nameWithoutExt = fileName.substring(0, dotIndex);
            ext = fileName.substring(dotIndex);
        }

        while (hasNameConflict(existing, finalName)) {
            finalName = nameWithoutExt + " (" + count + ")" + ext;
            count++;
        }

        String thumbnailUrl = null;
        if (request.getType() == com.quanlyduan.webxulyanh.demo.enums.MediaType.IMAGE) {
            thumbnailUrl = generateImageThumbnail(request.getFilePath());
        } else if (request.getType() == com.quanlyduan.webxulyanh.demo.enums.MediaType.VIDEO) {
            thumbnailUrl = generateVideoThumbnail(request.getFilePath());
        }

        MediaAsset mediaAsset = MediaAsset.builder()
                .userId(userId)
                .fileName(finalName)
                .filePath(request.getFilePath())
                .type(request.getType())
                .fileSizeMb(request.getFileSizeMb())
                .folderId(folderId)
                .thumbnailUrl(thumbnailUrl)
                .deleted(false)
                .uploadedAt(LocalDateTime.now())
                .build();
        MediaAsset saved = mediaAssetRepository.save(mediaAsset);
        return mapToResponse(saved);
    }

    private String generateImageThumbnail(String filePath) {
        if (filePath == null || !filePath.startsWith("/uploads/")) return null;
        try {
            String filename = filePath.substring("/uploads/".length());
            String thumbFilename = "thumb_" + filename;
            java.nio.file.Path rootLocation = java.nio.file.Paths.get(uploadDir);
            java.nio.file.Path inputFile = rootLocation.resolve(filename);
            java.nio.file.Path outputFile = rootLocation.resolve(thumbFilename);
            
            if (java.nio.file.Files.exists(inputFile)) {
                net.coobird.thumbnailator.Thumbnails.of(inputFile.toFile())
                    .size(256, 256)
                    .outputFormat("jpg")
                    .toFile(outputFile.toFile());
                return "/uploads/" + thumbFilename;
            }
        } catch (Exception e) {
            log.error("Lỗi tạo ảnh thu nhỏ", e);
        }
        return null;
    }

    private String generateVideoThumbnail(String filePath) {
        if (filePath == null || !filePath.startsWith("/uploads/")) return null;
        try {
            String filename = filePath.substring("/uploads/".length());
            String thumbFilename = "thumb_" + filename + ".jpg";
            java.nio.file.Path rootLocation = java.nio.file.Paths.get(uploadDir);
            java.nio.file.Path inputFile = rootLocation.resolve(filename).toAbsolutePath();
            java.nio.file.Path outputFile = rootLocation.resolve(thumbFilename).toAbsolutePath();
            
            if (java.nio.file.Files.exists(inputFile)) {
                ProcessBuilder pb = new ProcessBuilder(
                    ffmpegPath, "-y", "-i", inputFile.toString(), "-vframes", "1", "-s", "256x256", outputFile.toString()
                );
                pb.redirectOutput(ProcessBuilder.Redirect.DISCARD);
                pb.redirectError(ProcessBuilder.Redirect.DISCARD);
                Process process = pb.start();
                process.waitFor();
                
                if (java.nio.file.Files.exists(outputFile)) {
                    return "/uploads/" + thumbFilename;
                }
            }
        } catch (Exception e) {
            log.error("Lỗi tạo ảnh thu nhỏ video", e);
        }
        return null;
    }

    private boolean hasNameConflict(List<MediaAsset> existing, String fileName) {
        return existing.stream().anyMatch(a -> a.getFileName().equalsIgnoreCase(fileName));
    }

    @Override
    public MediaAssetResponseDTO getMediaAssetById(String id) {
        MediaAsset mediaAsset = mediaAssetRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("MediaAsset not found with id: " + id));
        return mapToResponse(mediaAsset);
    }

    @Override
    public List<MediaAssetResponseDTO> getAllMediaAssets() {
        return mediaAssetRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public MediaAssetResponseDTO updateMediaAsset(String id, String userId, MediaAssetRequestDTO request) {
        MediaAsset mediaAsset = mediaAssetRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("MediaAsset not found with id: " + id));
        
        if (!mediaAsset.getUserId().equals(userId)) {
            throw new SecurityException("Bạn không có quyền truy cập tệp tin này.");
        }
        if (mediaAsset.isDeleted()) {
            throw new IllegalStateException("Không thể chỉnh sửa tệp tin đang nằm trong thùng rác.");
        }
        
        if (request.getFolderId() != null) {
            String fId = request.getFolderId();
            if ("root".equalsIgnoreCase(fId)) fId = null;
            mediaAsset.setFolderId(fId);
        } else if (request.getFileName() == null) {
            // Move to root folder (represented by null)
            mediaAsset.setFolderId(null);
        }

        if (request.getFileName() != null) {
            String newName = request.getFileName();
            List<MediaAsset> existing = mediaAssetRepository.findByUserIdAndFolderIdAndDeleted(userId, mediaAsset.getFolderId(), false);
            String finalName = newName;
            int count = 1;
            String nameWithoutExt = newName;
            String ext = "";
            int dotIndex = newName.lastIndexOf(".");
            if (dotIndex > 0) {
                nameWithoutExt = newName.substring(0, dotIndex);
                ext = newName.substring(dotIndex);
            }
            while (hasFileNameConflict(existing, id, finalName)) {
                finalName = nameWithoutExt + " (" + count + ")" + ext;
                count++;
            }
            mediaAsset.setFileName(finalName);
        }
        if (request.getFilePath() != null) {
            mediaAsset.setFilePath(request.getFilePath());
        }
        if (request.getType() != null) {
            mediaAsset.setType(request.getType());
        }
        if (request.getFileSizeMb() != null) {
            mediaAsset.setFileSizeMb(request.getFileSizeMb());
        }
        if (request.getMetadata() != null) {
            mediaAsset.setMetadata(request.getMetadata());
        }
        


        MediaAsset updated = mediaAssetRepository.save(mediaAsset);
        return mapToResponse(updated);
    }

    @Override
    public void deleteMediaAsset(String id, String userId) {
        // Thực hiện xóa mềm mặc định
        softDeleteMediaAsset(id, userId);
    }

    @Override
    public void softDeleteMediaAsset(String id, String userId) {
        MediaAsset mediaAsset = mediaAssetRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("MediaAsset not found with id: " + id));
        
        if (!mediaAsset.getUserId().equals(userId)) {
            throw new SecurityException("Bạn không có quyền truy cập tệp tin này.");
        }

        // EX-06: Chặn xóa khi file đang được sử dụng trong Timeline/Canvas
        List<Map<String, String>> usage = getMediaAssetUsage(id, userId);
        if (!usage.isEmpty()) {
            boolean physicalExists = true;
            if (mediaAsset.getFilePath() != null && mediaAsset.getFilePath().startsWith("/uploads/")) {
                try {
                    String filename = mediaAsset.getFilePath().substring("/uploads/".length());
                    java.nio.file.Path rootLocation = java.nio.file.Paths.get(uploadDir);
                    physicalExists = java.nio.file.Files.exists(rootLocation.resolve(filename));
                } catch (Exception e) {
                    physicalExists = false;
                }
            }
            if (physicalExists) {
                String projectNames = usage.stream()
                    .map(m -> m.get("projectName"))
                    .collect(Collectors.joining(", "));
                throw new IllegalStateException("Không thể xóa tệp tin đang được sử dụng trong dự án: " + projectNames + ". Vui lòng xóa vĩnh viễn dự án đó trước.");
            }
        }

        mediaAsset.setDeleted(true);
        mediaAsset.setDeletedAt(LocalDateTime.now());
        mediaAssetRepository.save(mediaAsset);
        log.info("Đã xóa mềm tệp tin: {}", mediaAsset.getFileName());
    }

    @Override
    public void restoreMediaAsset(String id, String userId) {
        MediaAsset mediaAsset = mediaAssetRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("MediaAsset not found with id: " + id));
        
        if (!mediaAsset.getUserId().equals(userId)) {
            throw new SecurityException("Bạn không có quyền truy cập tệp tin này.");
        }

        // C5 — Storage quota check
        try {
            String quotaStr = systemSettingService.getSettingByKey("storage_quota_mb")
                    .map(s -> s.getSettingValue()).orElse("0");
            double quotaMb = Double.parseDouble(quotaStr);
            if (quotaMb > 0) {
                double usedMb = mediaAssetRepository.findByUserIdAndDeleted(userId, false).stream()
                        .map(MediaAsset::getFileSizeMb)
                        .filter(java.util.Objects::nonNull)
                        .mapToDouble(Double::doubleValue)
                        .sum();
                double incomingMb = mediaAsset.getFileSizeMb() != null ? mediaAsset.getFileSizeMb() : 0.0;
                if (usedMb + incomingMb > quotaMb) {
                    throw new IllegalStateException(String.format(
                            "Vượt quá hạn mức lưu trữ: %.1f MB / %.0f MB. Vui lòng xóa bớt tệp tin cũ rồi thử lại.",
                            usedMb, quotaMb));
                }
            }
        } catch (NumberFormatException ignored) { /* mis-configured quota -> skip */ }

        // Xử lý Trùng tên (Name Collision)
        List<MediaAsset> existing = mediaAssetRepository.findByUserIdAndFolderIdAndDeleted(userId, mediaAsset.getFolderId(), false);
        String finalName = mediaAsset.getFileName();
        int count = 1;
        String nameWithoutExt = finalName;
        String ext = "";
        int dotIndex = finalName.lastIndexOf(".");
        if (dotIndex > 0) {
            nameWithoutExt = finalName.substring(0, dotIndex);
            ext = finalName.substring(dotIndex);
        }
        while (hasNameConflict(existing, finalName)) {
            finalName = nameWithoutExt + " (" + count + ")" + ext;
            count++;
        }
        mediaAsset.setFileName(finalName);

        // Khôi phục các thư mục cha nếu chúng đang bị xóa mềm
        if (mediaAsset.getFolderId() != null) {
            restoreParentFoldersRecursive(mediaAsset.getFolderId());
        }

        mediaAsset.setDeleted(false);
        mediaAsset.setDeletedAt(null);
        mediaAssetRepository.save(mediaAsset);
        log.info("Đã khôi phục tệp tin: {}", mediaAsset.getFileName());
    }

    private void restoreParentFoldersRecursive(String folderId) {
        if (folderId == null) return;
        MediaFolder folder = mediaFolderRepository.findById(folderId).orElse(null);
        if (folder != null) {
            if (folder.isDeleted()) {
                List<MediaFolder> existing = mediaFolderRepository.findByUserIdAndParentIdAndDeleted(folder.getUserId(), folder.getParentId(), false);
                String finalName = folder.getName();
                int count = 1;
                while (hasFolderNameConflict(existing, finalName)) {
                    finalName = folder.getName() + " (" + count + ")";
                    count++;
                }
                folder.setName(finalName);
                
                folder.setDeleted(false);
                folder.setDeletedAt(null);
                mediaFolderRepository.save(folder);
                log.info("Tự động khôi phục thư mục cha: {}", folder.getName());
            }
            restoreParentFoldersRecursive(folder.getParentId());
        }
    }

    @Override
    public void deleteMediaAssetPermanently(String id, String userId) {
        MediaAsset mediaAsset = mediaAssetRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("MediaAsset not found with id: " + id));
        
        if (!mediaAsset.getUserId().equals(userId)) {
            throw new SecurityException("Bạn không có quyền truy cập tệp tin này.");
        }

        // EX-06: Chặn xóa khi file đang được sử dụng trong Timeline/Canvas
        List<Map<String, String>> usage = getMediaAssetUsage(id, userId);
        if (!usage.isEmpty()) {
            boolean physicalExists = true;
            if (mediaAsset.getFilePath() != null && mediaAsset.getFilePath().startsWith("/uploads/")) {
                try {
                    String filename = mediaAsset.getFilePath().substring("/uploads/".length());
                    java.nio.file.Path rootLocation = java.nio.file.Paths.get(uploadDir);
                    physicalExists = java.nio.file.Files.exists(rootLocation.resolve(filename));
                } catch (Exception e) {
                    physicalExists = false;
                }
            }
            if (physicalExists) {
                String projectNames = usage.stream()
                    .map(m -> m.get("projectName"))
                    .collect(Collectors.joining(", "));
                throw new IllegalStateException("Không thể xóa tệp tin đang được sử dụng trong dự án: " + projectNames + ". Vui lòng xóa vĩnh viễn dự án đó trước.");
            }
        }

        // Xóa file vật lý trên đĩa
        try {
            String fileName = mediaAsset.getFilePath().substring(mediaAsset.getFilePath().lastIndexOf("/") + 1);
            storageService.delete(fileName);
            log.info("Đã xóa file vật lý trên đĩa: {}", fileName);
        } catch (Exception e) {
            log.error("Lỗi khi xóa file vật lý trên đĩa cho {}: {}", mediaAsset.getFileName(), e.getMessage());
        }

        // Xóa bản ghi trong database
        mediaAssetRepository.delete(mediaAsset);
        log.info("Đã xóa vĩnh viễn tệp tin trong database: {}", mediaAsset.getFileName());
    }

    @Override
    public List<MediaAssetResponseDTO> getActiveMediaAssets(String userId, String folderId) {
        List<MediaAsset> assets;
        if (folderId == null || "root".equalsIgnoreCase(folderId)) {
            assets = mediaAssetRepository.findByUserIdAndFolderIdAndDeleted(userId, null, false);
        } else {
            assets = mediaAssetRepository.findByUserIdAndFolderIdAndDeleted(userId, folderId, false);
        }
        return assets.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    @Override
    public org.springframework.data.domain.Page<MediaAssetResponseDTO> getActiveMediaAssets(String userId, String folderId, String search, org.springframework.data.domain.Pageable pageable) {
        String fId = (folderId == null || "root".equalsIgnoreCase(folderId)) ? null : folderId;
        org.springframework.data.domain.Page<MediaAsset> page;
        if (search != null && !search.trim().isEmpty()) {
            page = mediaAssetRepository.findByUserIdAndFolderIdAndDeletedAndFileNameRegex(userId, fId, false, ".*" + search + ".*", pageable);
        } else {
            page = mediaAssetRepository.findByUserIdAndFolderIdAndDeleted(userId, fId, false, pageable);
        }
        return page.map(this::mapToResponse);
    }

    private void collectAssetsRecursive(String folderId, String userId, List<MediaAsset> result) {
        List<MediaAsset> assets = mediaAssetRepository.findByUserIdAndFolderIdAndDeleted(userId, folderId, false);
        result.addAll(assets);
        
        List<MediaFolder> subfolders = mediaFolderRepository.findByUserIdAndParentIdAndDeleted(userId, folderId, false);
        for (MediaFolder sub : subfolders) {
            collectAssetsRecursive(sub.getId(), userId, result);
        }
    }

    private boolean hasFileNameConflict(List<MediaAsset> existing, String excludeId, String name) {
        return existing.stream().anyMatch(a -> (excludeId == null || !a.getId().equals(excludeId)) 
                                            && a.getFileName().equalsIgnoreCase(name));
    }

    private boolean hasFolderNameConflict(List<MediaFolder> existing, String name) {
        return existing.stream().anyMatch(f -> f.getName().equalsIgnoreCase(name));
    }

    @Override
    public List<MediaAssetResponseDTO> getDeletedMediaAssets(String userId) {
        return mediaAssetRepository.findByUserIdAndDeleted(userId, true).stream()
                .filter(asset -> {
                    if (asset.getFolderId() == null) return true;
                    MediaFolder parent = mediaFolderRepository.findById(asset.getFolderId()).orElse(null);
                    return parent == null || !parent.isDeleted();
                })
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public org.springframework.data.domain.Page<MediaAssetResponseDTO> getDeletedMediaAssets(String userId, String search, org.springframework.data.domain.Pageable pageable) {
        org.springframework.data.domain.Page<MediaAsset> page;
        if (search != null && !search.trim().isEmpty()) {
            page = mediaAssetRepository.findByUserIdAndDeletedAndFileNameRegex(userId, true, ".*" + search + ".*", pageable);
        } else {
            page = mediaAssetRepository.findByUserIdAndDeleted(userId, true, pageable);
        }
        
        // Cần lọc lại do folderId. Để đơn giản cho pagination, chúng ta sẽ trả về luôn (ở thùng rác, việc tải hiển thị tất cả file không phụ thuộc folder cha cũng chấp nhận được)
        return page.map(this::mapToResponse);
    }

    @Override
    public MediaAssetResponseDTO extractAudio(String assetId, String folderId, String userId) {
        MediaAsset mediaAsset = mediaAssetRepository.findById(assetId)
                .orElseThrow(() -> new ResourceNotFoundException("MediaAsset not found"));
        if (!mediaAsset.getUserId().equals(userId)) {
            throw new SecurityException("Bạn không có quyền truy cập tệp tin này.");
        }
        if (mediaAsset.getType() != com.quanlyduan.webxulyanh.demo.enums.MediaType.VIDEO) {
            throw new IllegalArgumentException("Chỉ có thể trích xuất âm thanh từ tệp Video.");
        }
        if ("root".equalsIgnoreCase(folderId)) {
            folderId = null;
        }

        String inputPathStr = mediaAsset.getFilePath();
        if (inputPathStr == null || !inputPathStr.startsWith("/uploads/")) {
            throw new IllegalArgumentException("Đường dẫn tệp tin không hợp lệ.");
        }

        try {
            String filename = inputPathStr.substring("/uploads/".length());
            java.nio.file.Path rootLocation = java.nio.file.Paths.get(uploadDir);
            java.nio.file.Path inputFile = rootLocation.resolve(filename).toAbsolutePath();

            String newFilename = java.util.UUID.randomUUID().toString() + ".mp3";
            java.nio.file.Path outputFile = rootLocation.resolve(newFilename).toAbsolutePath();

            ProcessBuilder pb = new ProcessBuilder(
                ffmpegPath, "-y", "-i", inputFile.toString(), "-vn", "-acodec", "libmp3lame", "-q:a", "2", outputFile.toString()
            );
            pb.redirectOutput(ProcessBuilder.Redirect.DISCARD);
            pb.redirectError(ProcessBuilder.Redirect.DISCARD);
            Process process = pb.start();
            int exitCode = process.waitFor();
            
            if (exitCode != 0) {
                throw new RuntimeException("Lỗi khi chạy lệnh FFmpeg trích xuất âm thanh. Exit code: " + exitCode);
            }
            
            MediaAssetRequestDTO requestDTO = new MediaAssetRequestDTO();
            requestDTO.setUserId(userId);
            
            String originalName = mediaAsset.getFileName();
            int dotIdx = originalName.lastIndexOf(".");
            if (dotIdx > 0) {
                originalName = originalName.substring(0, dotIdx);
            }
            requestDTO.setFileName(originalName + "_audio.mp3");
            requestDTO.setFilePath("/uploads/" + newFilename);
            requestDTO.setType(com.quanlyduan.webxulyanh.demo.enums.MediaType.AUDIO);
            requestDTO.setFileSizeMb((double) java.nio.file.Files.size(outputFile) / (1024 * 1024));
            requestDTO.setFolderId(folderId);

            return createMediaAsset(requestDTO);

        } catch (Exception e) {
            throw new RuntimeException("Đã xảy ra lỗi trong quá trình trích xuất âm thanh", e);
        }
    }

    @Override
    public List<Map<String, String>> getMediaAssetUsage(String id, String userId) {
        MediaAsset mediaAsset = mediaAssetRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("MediaAsset not found with id: " + id));
        if (!mediaAsset.getUserId().equals(userId)) {
            throw new SecurityException("Bạn không có quyền truy cập tệp tin này.");
        }
        
        List<Map<String, String>> usage = new ArrayList<>();
        List<Project> allProjects = projectRepository.findAll();
        
        for (Project project : allProjects) {
            if (!project.getUserId().equals(userId)) continue;

            String canvasStr = project.getCanvasData() != null ? project.getCanvasData().toString() : "";
            String timelineStr = project.getTimelineData() != null ? project.getTimelineData().toString() : "";

            if (canvasStr.contains(id) || timelineStr.contains(id)) {
                Map<String, String> projectInfo = new HashMap<>();
                projectInfo.put("projectId", project.getId());
                projectInfo.put("projectName", project.getProjectName() + (project.isDeleted() ? " (trong thùng rác)" : ""));
                projectInfo.put("projectType", project.getProjectType() != null ? project.getProjectType().toString() : "IMAGE");
                usage.add(projectInfo);
            }
        }
        return usage;
    }

    private MediaAssetResponseDTO mapToResponse(MediaAsset mediaAsset) {
        MediaAssetResponseDTO response = new MediaAssetResponseDTO();
        response.setId(mediaAsset.getId());
        response.setUserId(mediaAsset.getUserId());
        response.setFileName(mediaAsset.getFileName());
        response.setFilePath(mediaAsset.getFilePath());
        response.setType(mediaAsset.getType());
        response.setFileSizeMb(mediaAsset.getFileSizeMb());
        response.setMetadata(mediaAsset.getMetadata());
        response.setFolderId(mediaAsset.getFolderId());
        response.setDeleted(mediaAsset.isDeleted());
        response.setDeletedAt(mediaAsset.getDeletedAt());
        response.setUploadedAt(mediaAsset.getUploadedAt());
        return response;
    }
}
