package com.quanlyduan.webxulyanh.demo.service.impl;

import com.quanlyduan.webxulyanh.demo.dto.request.SocialImportRequest;
import com.quanlyduan.webxulyanh.demo.dto.request.WorkerCallbackRequest;
import com.quanlyduan.webxulyanh.demo.entity.AsyncTask;
import com.quanlyduan.webxulyanh.demo.entity.MediaAsset;
import com.quanlyduan.webxulyanh.demo.enums.ActionType;
import com.quanlyduan.webxulyanh.demo.repository.AsyncTaskRepository;
import com.quanlyduan.webxulyanh.demo.repository.MediaAssetRepository;
import com.quanlyduan.webxulyanh.demo.service.MediaAssetService;
import com.quanlyduan.webxulyanh.demo.service.WorkerService;
import com.quanlyduan.webxulyanh.demo.repository.SystemSettingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Service
@Slf4j
@RequiredArgsConstructor
public class WorkerServiceImpl implements WorkerService {

    private final AsyncTaskRepository asyncTaskRepository;
    private final MediaAssetRepository mediaAssetRepository;
    private final SystemSettingRepository systemSettingRepository;

    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${worker.python.url:http://localhost:8000}")
    private String workerUrl;

    @Override
    public AsyncTask submitSocialImportJob(String userId, String projectId, SocialImportRequest request) {
        // 1. Tạo bản ghi AsyncTask
        Map<String, Object> payloadMap = new HashMap<>();
        if (request.getFolderId() != null) {
            payloadMap.put("folderId", request.getFolderId());
        }

        AsyncTask task = AsyncTask.builder()
                .userId(userId)
                .projectId(projectId)
                .actionCode("DOWNLOAD_SOCIAL_VIDEO")
                .status("PENDING")
                .progress(0)
                .payload(payloadMap)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
        
        task = asyncTaskRepository.save(task);

        // 2. Gửi request sang Python Worker
        try {
            String url = workerUrl + "/worker/download-video";
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            Map<String, String> payload = new HashMap<>();
            payload.put("job_id", task.getId());
            payload.put("url", request.getUrl());
            
            // Read max duration setting from DB
            String maxDuration = systemSettingRepository.findBySettingKey("max_social_download_duration_seconds")
                    .map(com.quanlyduan.webxulyanh.demo.entity.SystemSetting::getSettingValue)
                    .orElse("600");
            payload.put("max_duration", maxDuration);

            HttpEntity<Map<String, String>> requestEntity = new HttpEntity<>(payload, headers);
            restTemplate.postForEntity(url, requestEntity, String.class);

            // Cập nhật trạng thái đang chạy
            task.setStatus("RUNNING");
            task.setUpdatedAt(LocalDateTime.now());
            asyncTaskRepository.save(task);
            
            log.info("Đã gửi job {} sang Python Worker thành công", task.getId());
        } catch (Exception e) {
            log.error("Lỗi khi gửi job sang Worker: ", e);
            task.setStatus("FAILED");
            task.setErrorMessage(e.getMessage());
            task.setUpdatedAt(LocalDateTime.now());
            asyncTaskRepository.save(task);
        }

        return task;
    }

    @Override
    public void handleWorkerCallback(WorkerCallbackRequest callback) {
        log.info("Nhận callback từ Worker cho Job {}: {}", callback.getJobId(), callback.getStatus());
        
        AsyncTask task = asyncTaskRepository.findById(callback.getJobId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy AsyncTask với ID: " + callback.getJobId()));

        if ("SUCCESS".equalsIgnoreCase(callback.getStatus())) {
            task.setStatus("SUCCESS");
            task.setProgress(100);
            
            // Xử lý di chuyển file từ thư mục worker/shared_storage vào thư mục uploads của server Java
            try {
                File downloadedFile = new File(callback.getFilePath());
                if (downloadedFile.exists()) {
                    // Tạo thư mục đích nếu chưa có
                    Path uploadDir = Paths.get("uploads");
                    if (!Files.exists(uploadDir)) {
                        Files.createDirectories(uploadDir);
                    }

                    // Tên file mới trong thư mục upload
                    String fileName = downloadedFile.getName();
                    Path targetPath = uploadDir.resolve(fileName);

                    // Di chuyển/Copy file từ worker về thư mục uploads
                    Files.copy(downloadedFile.toPath(), targetPath, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
                    
                    // Xóa file ở thư mục chia sẻ để dọn dẹp dung lượng
                    downloadedFile.delete();

                    // Cập nhật đường dẫn trả về file gốc
                    String finalFilePath = "/uploads/" + fileName;
                    task.setResultFilePath(finalFilePath);
                    
                    // Tạo MediaAsset để hiện trên Explorer
                    String folderId = null;
                    if (task.getPayload() != null && task.getPayload().containsKey("folderId")) {
                        folderId = (String) task.getPayload().get("folderId");
                    }

                    MediaAsset mediaAsset = MediaAsset.builder()
                            .userId(task.getUserId())
                            .fileName(fileName)
                            .filePath(finalFilePath)
                            .type(com.quanlyduan.webxulyanh.demo.enums.MediaType.VIDEO)
                            .fileSizeMb((double) targetPath.toFile().length() / (1024 * 1024))
                            .folderId(folderId)
                            .deleted(false)
                            .uploadedAt(LocalDateTime.now())
                            .build();
                    mediaAssetRepository.save(mediaAsset);
                    
                    log.info("Đã import file thành công vào: {}", targetPath.toAbsolutePath());
                } else {
                    task.setStatus("FAILED");
                    task.setErrorMessage("File không tồn tại ở thư mục worker: " + callback.getFilePath());
                }
            } catch (Exception e) {
                log.error("Lỗi khi import file vào project: ", e);
                task.setStatus("FAILED");
                task.setErrorMessage("Lỗi import file: " + e.getMessage());
            }
        } else {
            task.setStatus("FAILED");
            task.setErrorMessage(callback.getErrorMessage());
        }
        
        task.setUpdatedAt(LocalDateTime.now());
        asyncTaskRepository.save(task);

        // TODO: Gửi thông báo WebSocket về cho Frontend (userId) để cập nhật UI
        // simpMessagingTemplate.convertAndSendToUser(task.getUserId(), "/queue/notifications", ...);
    }
}
