package com.quanlyduan.webxulyanh.demo.dto.response;

import com.quanlyduan.webxulyanh.demo.enums.ProjectStatus;
import com.quanlyduan.webxulyanh.demo.enums.MediaType;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.Map;

@Data
public class ProjectResponseDTO {
    private String id;
    private String userId;
    private String projectName;
    private ProjectStatus status;
    private MediaType projectType;
    private Map<String, Object> canvasData;
    private Map<String, Object> timelineData;
    private String thumbnailUrl;
    private boolean deleted;
    private boolean rendering;
    private String activeProcessingId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

