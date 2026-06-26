package com.quanlyduan.webxulyanh.demo.service.impl;

import com.quanlyduan.webxulyanh.demo.entity.MediaAsset;
import com.quanlyduan.webxulyanh.demo.entity.MediaFolder;
import com.quanlyduan.webxulyanh.demo.entity.Project;
import com.quanlyduan.webxulyanh.demo.exception.ResourceNotFoundException;
import com.quanlyduan.webxulyanh.demo.repository.MediaAssetRepository;
import com.quanlyduan.webxulyanh.demo.repository.MediaFolderRepository;
import com.quanlyduan.webxulyanh.demo.repository.ProjectRepository;
import com.quanlyduan.webxulyanh.demo.service.MediaFolderService;
import com.quanlyduan.webxulyanh.demo.service.StorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class MediaFolderServiceImpl implements MediaFolderService {

    private final MediaFolderRepository mediaFolderRepository;
    private final MediaAssetRepository mediaAssetRepository;
    private final ProjectRepository projectRepository;
    private final StorageService storageService;

    @Override
    public MediaFolder createFolder(String userId, String name, String parentId) {
        // Kiểm tra trùng tên thư mục hoạt động trong cùng thư mục cha
        List<MediaFolder> existing = mediaFolderRepository.findByUserIdAndParentIdAndDeleted(userId, parentId, false);
        boolean hasDuplicate = existing.stream().anyMatch(f -> f.getName().equalsIgnoreCase(name));
        if (hasDuplicate) {
            throw new IllegalArgumentException("Thư mục có tên \"" + name + "\" đã tồn tại trong thư mục hiện hành.");
        }

        // EX-01: Giới hạn tối đa 5 cấp thư mục
        if (parentId != null && !"root".equalsIgnoreCase(parentId) && !parentId.trim().isEmpty()) {
            int parentDepth = getFolderDepth(parentId);
            if (parentDepth >= 5) {
                throw new IllegalArgumentException("Hệ thống chỉ giới hạn tối đa 5 cấp thư mục.");
            }
        }

        MediaFolder folder = MediaFolder.builder()
                .userId(userId)
                .name(name)
                .parentId(parentId)
                .deleted(false)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
        return mediaFolderRepository.save(folder);
    }

    @Override
    public MediaFolder renameFolder(String id, String userId, String newName) {
        MediaFolder folder = mediaFolderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thư mục."));
        
        if (!folder.getUserId().equals(userId)) {
            throw new SecurityException("Bạn không có quyền truy cập thư mục này.");
        }
        if (folder.isDeleted()) {
            throw new IllegalStateException("Không thể đổi tên thư mục đang nằm trong thùng rác.");
        }

        // Kiểm tra trùng tên
        List<MediaFolder> existing = mediaFolderRepository.findByUserIdAndParentIdAndDeleted(folder.getUserId(), folder.getParentId(), false);
        boolean hasDuplicate = existing.stream()
                .anyMatch(f -> !f.getId().equals(id) && f.getName().equalsIgnoreCase(newName));
        if (hasDuplicate) {
            throw new IllegalArgumentException("Thư mục có tên \"" + newName + "\" đã tồn tại trong thư mục hiện hành.");
        }

        folder.setName(newName);
        folder.setUpdatedAt(LocalDateTime.now());
        return mediaFolderRepository.save(folder);
    }

    @Override
    public MediaFolder moveFolder(String id, String userId, String targetParentId) {
        MediaFolder folder = mediaFolderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thư mục."));

        if (!folder.getUserId().equals(userId)) {
            throw new SecurityException("Bạn không có quyền truy cập thư mục này.");
        }
        if (folder.isDeleted()) {
            throw new IllegalStateException("Không thể di chuyển thư mục đang nằm trong thùng rác.");
        }

        // Chặn di chuyển thư mục vào chính nó hoặc vào thư mục con của nó (Cyclic Dependency Check)
        if (id.equals(targetParentId)) {
            throw new IllegalArgumentException("Không thể di chuyển thư mục vào chính nó.");
        }

        String currentParentId = targetParentId;
        while (currentParentId != null) {
            MediaFolder parent = mediaFolderRepository.findById(currentParentId).orElse(null);
            if (parent == null) break;
            if (parent.getId().equals(id)) {
                throw new IllegalArgumentException("Không thể di chuyển thư mục vào thư mục con của nó.");
            }
            currentParentId = parent.getParentId();
        }

        // EX-01: Giới hạn tối đa 5 cấp thư mục
        int targetParentDepth = getFolderDepth(targetParentId);
        int subtreeDepth = getSubtreeDepth(folder);
        if (targetParentDepth + subtreeDepth > 5) {
            throw new IllegalArgumentException("Vượt quá độ sâu thư mục tối đa cho phép (5 cấp).");
        }

        folder.setParentId(targetParentId);
        folder.setUpdatedAt(LocalDateTime.now());
        return mediaFolderRepository.save(folder);
    }

    @Override
    public void softDeleteFolder(String id, String userId) {
        MediaFolder folder = mediaFolderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thư mục."));
        
        if (!folder.getUserId().equals(userId)) {
            throw new SecurityException("Bạn không có quyền truy cập thư mục này.");
        }

        // EX-06: Chặn xóa thư mục khi chứa tệp tin đang được sử dụng
        checkFolderInUse(folder);
        
        LocalDateTime now = LocalDateTime.now();
        softDeleteFolderRecursive(folder, now);
    }

    private void softDeleteFolderRecursive(MediaFolder folder, LocalDateTime deletedAt) {
        folder.setDeleted(true);
        folder.setDeletedAt(deletedAt);
        mediaFolderRepository.save(folder);

        // Xóa mềm các file trong thư mục này
        List<MediaAsset> assets = mediaAssetRepository.findByUserIdAndFolderIdAndDeleted(folder.getUserId(), folder.getId(), false);
        for (MediaAsset asset : assets) {
            asset.setDeleted(true);
            asset.setDeletedAt(deletedAt);
            mediaAssetRepository.save(asset);
        }

        // Đệ quy xóa mềm các thư mục con
        List<MediaFolder> subfolders = mediaFolderRepository.findByUserIdAndParentIdAndDeleted(folder.getUserId(), folder.getId(), false);
        for (MediaFolder subfolder : subfolders) {
            softDeleteFolderRecursive(subfolder, deletedAt);
        }
    }

    @Override
    public void restoreFolder(String id, String userId) {
        MediaFolder folder = mediaFolderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thư mục."));

        if (!folder.getUserId().equals(userId)) {
            throw new SecurityException("Bạn không có quyền truy cập thư mục này.");
        }

        // Xử lý Trùng tên (Name Collision)
        List<MediaFolder> existing = mediaFolderRepository.findByUserIdAndParentIdAndDeleted(userId, folder.getParentId(), false);
        String finalName = folder.getName();
        int count = 1;
        while (hasFolderNameConflict(existing, finalName)) {
            finalName = folder.getName() + " (" + count + ")";
            count++;
        }
        folder.setName(finalName);

        // Khôi phục chuỗi thư mục cha nếu chúng đang bị xóa mềm
        restoreParentFoldersRecursive(folder.getParentId());

        // Khôi phục thư mục hiện tại và toàn bộ con cháu của nó
        restoreFolderRecursive(folder);
    }

    private boolean hasFolderNameConflict(List<MediaFolder> existing, String name) {
        return existing.stream().anyMatch(f -> f.getName().equalsIgnoreCase(name));
    }

    private void restoreParentFoldersRecursive(String parentId) {
        if (parentId == null) return;
        MediaFolder parent = mediaFolderRepository.findById(parentId).orElse(null);
        if (parent != null) {
            if (parent.isDeleted()) {
                List<MediaFolder> existing = mediaFolderRepository.findByUserIdAndParentIdAndDeleted(parent.getUserId(), parent.getParentId(), false);
                String finalName = parent.getName();
                int count = 1;
                while (hasFolderNameConflict(existing, finalName)) {
                    finalName = parent.getName() + " (" + count + ")";
                    count++;
                }
                parent.setName(finalName);

                parent.setDeleted(false);
                parent.setDeletedAt(null);
                mediaFolderRepository.save(parent);
                log.info("Tự động khôi phục thư mục cha: {}", parent.getName());
            }
            restoreParentFoldersRecursive(parent.getParentId());
        }
    }

    private void restoreFolderRecursive(MediaFolder folder) {
        folder.setDeleted(false);
        folder.setDeletedAt(null);
        mediaFolderRepository.save(folder);

        // Khôi phục các file bên trong thư mục
        List<MediaAsset> deletedAssets = mediaAssetRepository.findByUserIdAndFolderIdAndDeleted(folder.getUserId(), folder.getId(), true);
        for (MediaAsset asset : deletedAssets) {
            asset.setDeleted(false);
            asset.setDeletedAt(null);
            mediaAssetRepository.save(asset);
        }

        // Tìm thư mục con bị xóa mềm
        List<MediaFolder> deletedSubfolders = mediaFolderRepository.findByUserIdAndParentIdAndDeleted(folder.getUserId(), folder.getId(), true);
        for (MediaFolder sub : deletedSubfolders) {
            restoreFolderRecursive(sub);
        }
    }

    @Override
    public void deleteFolderPermanently(String id, String userId) {
        MediaFolder folder = mediaFolderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thư mục."));
        
        if (!folder.getUserId().equals(userId)) {
            throw new SecurityException("Bạn không có quyền truy cập thư mục này.");
        }

        // EX-06: Chặn xóa thư mục khi chứa tệp tin đang được sử dụng
        checkFolderInUse(folder);
        
        deleteFolderPermanentlyRecursive(folder);
    }

    private void deleteFolderPermanentlyRecursive(MediaFolder folder) {
        // 1. Tìm và xóa vĩnh viễn các file bên trong
        List<MediaAsset> assets = mediaAssetRepository.findByUserIdAndFolderIdAndDeleted(folder.getUserId(), folder.getId(), true);
        List<MediaAsset> activeAssets = mediaAssetRepository.findByUserIdAndFolderIdAndDeleted(folder.getUserId(), folder.getId(), false);
        List<MediaAsset> allAssets = new ArrayList<>();
        allAssets.addAll(assets);
        allAssets.addAll(activeAssets);

        for (MediaAsset asset : allAssets) {
            try {
                // Xóa vật lý trên đĩa
                String fileName = asset.getFilePath().substring(asset.getFilePath().lastIndexOf("/") + 1);
                storageService.delete(fileName);
            } catch (Exception e) {
                log.error("Lỗi khi xóa file vật lý {} trong thư mục {}: {}", asset.getFileName(), folder.getName(), e.getMessage());
            }
            mediaAssetRepository.delete(asset);
        }

        // 2. Tìm các thư mục con và xóa đệ quy
        List<MediaFolder> subfolders = mediaFolderRepository.findByUserIdAndParentIdAndDeleted(folder.getUserId(), folder.getId(), true);
        List<MediaFolder> activeSubfolders = mediaFolderRepository.findByUserIdAndParentIdAndDeleted(folder.getUserId(), folder.getId(), false);
        List<MediaFolder> allSubfolders = new ArrayList<>();
        allSubfolders.addAll(subfolders);
        allSubfolders.addAll(activeSubfolders);

        for (MediaFolder sub : allSubfolders) {
            deleteFolderPermanentlyRecursive(sub);
        }

        // 3. Xóa chính thư mục này khỏi DB
        mediaFolderRepository.delete(folder);
    }

    @Override
    public List<MediaFolder> getActiveFolders(String userId) {
        return mediaFolderRepository.findByUserIdAndDeleted(userId, false);
    }

    @Override
    public List<MediaFolder> getDeletedFolders(String userId) {
        return mediaFolderRepository.findByUserIdAndDeleted(userId, true).stream()
                .filter(f -> {
                    if (f.getParentId() == null) return true;
                    MediaFolder parent = mediaFolderRepository.findById(f.getParentId()).orElse(null);
                    return parent == null || !parent.isDeleted();
                })
                .collect(Collectors.toList());
    }

    // Helper methods for EX-01 & EX-06
    private int getFolderDepth(String folderId) {
        int depth = 0;
        String currentId = folderId;
        while (currentId != null) {
            MediaFolder folder = mediaFolderRepository.findById(currentId).orElse(null);
            if (folder == null) break;
            depth++;
            currentId = folder.getParentId();
            if (depth > 20) break;
        }
        return depth;
    }

    private int getSubtreeDepth(MediaFolder folder) {
        List<MediaFolder> subfolders = mediaFolderRepository.findByUserIdAndParentIdAndDeleted(folder.getUserId(), folder.getId(), false);
        int maxSubDepth = 0;
        for (MediaFolder sub : subfolders) {
            maxSubDepth = Math.max(maxSubDepth, getSubtreeDepth(sub));
        }
        return 1 + maxSubDepth;
    }

    private void checkFolderInUse(MediaFolder folder) {
        List<MediaAsset> allAssets = new ArrayList<>();
        collectAssetsRecursive(folder.getId(), folder.getUserId(), allAssets);
        
        if (allAssets.isEmpty()) return;
        
        List<Project> allProjects = projectRepository.findByUserId(folder.getUserId());
        for (MediaAsset asset : allAssets) {
            for (Project project : allProjects) {
                String canvasStr = project.getCanvasData() != null ? project.getCanvasData().toString() : "";
                String timelineStr = project.getTimelineData() != null ? project.getTimelineData().toString() : "";
                if (canvasStr.contains(asset.getId()) || timelineStr.contains(asset.getId())) {
                    String pName = project.getProjectName() + (project.isDeleted() ? " (trong thùng rác)" : "");
                    throw new IllegalStateException("Không thể xóa thư mục vì tệp tin \"" + asset.getFileName() + "\" đang được sử dụng trong dự án: " + pName + ". Vui lòng xóa vĩnh viễn dự án đó trước.");
                }
            }
        }
    }

    private void collectAssetsRecursive(String folderId, String userId, List<MediaAsset> result) {
        List<MediaAsset> assets = mediaAssetRepository.findByUserIdAndFolderIdAndDeleted(userId, folderId, false);
        result.addAll(assets);
        
        List<MediaFolder> subfolders = mediaFolderRepository.findByUserIdAndParentIdAndDeleted(userId, folderId, false);
        for (MediaFolder sub : subfolders) {
            collectAssetsRecursive(sub.getId(), userId, result);
        }
    }
}
