package com.quanlyduan.webxulyanh.demo.controller.api;

import com.quanlyduan.webxulyanh.demo.dto.request.SocialImportRequest;
import com.quanlyduan.webxulyanh.demo.dto.request.WorkerCallbackRequest;
import com.quanlyduan.webxulyanh.demo.entity.AsyncTask;
import com.quanlyduan.webxulyanh.demo.entity.User;
import com.quanlyduan.webxulyanh.demo.repository.AsyncTaskRepository;
import com.quanlyduan.webxulyanh.demo.repository.UserRepository;
import com.quanlyduan.webxulyanh.demo.service.WorkerService;
import com.quanlyduan.webxulyanh.demo.exception.ResourceNotFoundException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class WorkerApiController {

    private final WorkerService workerService;
    private final AsyncTaskRepository asyncTaskRepository;
    private final UserRepository userRepository;

    // API từ Client trong Editor gọi lên để tải video
    @PostMapping("/projects/{projectId}/import-social")
    public ResponseEntity<AsyncTask> importSocialVideo(
            @PathVariable String projectId,
            @Valid @RequestBody SocialImportRequest request,
            Principal principal
    ) {
        String userId = "user-123"; // fallback
        if (principal != null) {
            userId = getCurrentUser(principal).getId();
        }
        AsyncTask task = workerService.submitSocialImportJob(userId, projectId, request);
        return ResponseEntity.ok(task);
    }
    
    // API từ Standalone Explorer gọi lên để tải video vào thư mục chung
    @PostMapping("/v1/media-assets/import-social")
    public ResponseEntity<AsyncTask> importSocialVideoStandalone(
            @Valid @RequestBody SocialImportRequest request,
            Principal principal
    ) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        User user = getCurrentUser(principal);
        AsyncTask task = workerService.submitSocialImportJob(user.getId(), null, request);
        return ResponseEntity.ok(task);
    }
    
    // API kiểm tra trạng thái tải
    @GetMapping("/jobs/{jobId}/status")
    public ResponseEntity<AsyncTask> getJobStatus(@PathVariable String jobId) {
        AsyncTask task = asyncTaskRepository.findById(jobId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy Job"));
        return ResponseEntity.ok(task);
    }

    @org.springframework.beans.factory.annotation.Value("${app.worker.secret:default-worker-secret}")
    private String defaultWorkerSecret;

    @org.springframework.beans.factory.annotation.Autowired
    private com.quanlyduan.webxulyanh.demo.service.SystemSettingService systemSettingService;

    private String getWorkerSecret() {
        return systemSettingService.getSettingByKey("worker_secret")
                .map(com.quanlyduan.webxulyanh.demo.entity.SystemSetting::getSettingValue)
                .orElse(defaultWorkerSecret);
    }

    // API nội bộ dành cho Worker Python gọi về báo kết quả
    @PostMapping("/internal/jobs/callback")
    public ResponseEntity<String> workerCallback(@RequestBody WorkerCallbackRequest request, @RequestHeader(value = "X-Worker-Token", required = false) String workerToken) {
        if (workerToken == null || !workerToken.equals(getWorkerSecret())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Invalid worker token");
        }
        workerService.handleWorkerCallback(request);
        return ResponseEntity.ok("Callback processed");
    }

    private User getCurrentUser(Principal principal) {
        return userRepository.findByUsername(principal.getName())
                .orElseGet(() -> userRepository.findByEmail(principal.getName())
                        .orElseThrow(() -> new ResourceNotFoundException("User not found")));
    }
}
