package com.quanlyduan.webxulyanh.demo.scheduler;

import com.quanlyduan.webxulyanh.demo.entity.MediaAsset;
import com.quanlyduan.webxulyanh.demo.entity.MediaFolder;
import com.quanlyduan.webxulyanh.demo.entity.Project;
import com.quanlyduan.webxulyanh.demo.repository.MediaAssetRepository;
import com.quanlyduan.webxulyanh.demo.repository.MediaFolderRepository;
import com.quanlyduan.webxulyanh.demo.repository.ProjectRepository;
import com.quanlyduan.webxulyanh.demo.service.SystemSettingService;
import com.quanlyduan.webxulyanh.demo.service.StorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class TrashCleanupScheduler {

    private final MediaFolderRepository mediaFolderRepository;
    private final MediaAssetRepository mediaAssetRepository;
    private final ProjectRepository projectRepository;
    private final SystemSettingService settingService;
    private final StorageService storageService;

    // Chạy dọn dẹp mỗi giờ một lần để kiểm tra tệp tin quá hạn
    @Scheduled(cron = "0 0 * * * *")
    public void cleanupExpiredTrash() {
        log.info("[TrashCleanupScheduler] Bắt đầu chạy quét dọn Thùng rác định kỳ...");
        
        int days = 30;
        try {
            days = Integer.parseInt(settingService.getSettingByKey("trash_auto_delete_days")
                    .map(s -> s.getSettingValue()).orElse("30"));
        } catch (Exception e) {
            log.warn("Lỗi đọc cấu hình trash_auto_delete_days, sử dụng mặc định 30 ngày.");
        }
        
        LocalDateTime threshold = LocalDateTime.now().minusDays(days);
        
        // 1. Quét tệp tin đã xóa mềm quá hạn
        List<MediaAsset> expiredAssets = mediaAssetRepository.findAll().stream()
                .filter(a -> a.isDeleted() && a.getDeletedAt() != null && a.getDeletedAt().isBefore(threshold))
                .toList();
        for (MediaAsset asset : expiredAssets) {
            try {
                // Xóa vật lý trên đĩa
                String fileName = asset.getFilePath().substring(asset.getFilePath().lastIndexOf("/") + 1);
                storageService.delete(fileName);
                // Xóa DB
                mediaAssetRepository.delete(asset);
                log.info("Đã dọn dẹp vĩnh viễn tệp tin quá hạn: {}", asset.getFileName());
            } catch (Exception e) {
                log.error("Lỗi khi dọn dẹp tệp tin {}: {}", asset.getFileName(), e.getMessage());
            }
        }
        
        // 2. Quét thư mục đã xóa mềm quá hạn
        List<MediaFolder> expiredFolders = mediaFolderRepository.findAll().stream()
                .filter(f -> f.isDeleted() && f.getDeletedAt() != null && f.getDeletedAt().isBefore(threshold))
                .toList();
        for (MediaFolder folder : expiredFolders) {
            mediaFolderRepository.delete(folder);
            log.info("Đã dọn dẹp vĩnh viễn thư mục quá hạn: {}", folder.getName());
        }
        
        // 3. Quét dự án đã xóa mềm quá hạn
        List<Project> expiredProjects = projectRepository.findAll().stream()
                .filter(p -> p.isDeleted() && p.getDeletedAt() != null && p.getDeletedAt().isBefore(threshold))
                .toList();
        for (Project project : expiredProjects) {
            projectRepository.delete(project);
            log.info("Đã dọn dẹp vĩnh viễn dự án quá hạn: {}", project.getProjectName());
        }
    }
}
