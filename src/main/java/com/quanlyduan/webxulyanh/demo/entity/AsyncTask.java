package com.quanlyduan.webxulyanh.demo.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;
import java.util.Map;

@Document(collection = "async_tasks")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AsyncTask {
    @Id
    private String id;
    private String userId;
    private String projectId;
    private String actionCode; // vd: DOWNLOAD_SOCIAL_VIDEO
    private String status; // PENDING, RUNNING, SUCCESS, FAILED
    private Integer progress; // 0 - 100
    private String resultFilePath;
    private String errorMessage;
    
    // Lưu thêm các tham số payload gửi đi hoặc trả về nếu cần
    private Map<String, Object> payload; 
    
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
