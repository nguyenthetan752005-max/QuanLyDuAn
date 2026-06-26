package com.quanlyduan.webxulyanh.demo.dto.request;

import com.quanlyduan.webxulyanh.demo.enums.ProjectStatus;
import com.quanlyduan.webxulyanh.demo.enums.MediaType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.util.Map;

@Data
public class ProjectRequestDTO {
    private String userId;

    @NotBlank(message = "Project name is required")
    private String projectName;

    @NotNull(message = "Project status is required")
    private ProjectStatus status;

    @NotNull(message = "Project type is required")
    private MediaType projectType;

    private Map<String, Object> canvasData;
    private Map<String, Object> timelineData;
    private String thumbnailUrl;
    private String thumbnailData; // base64 string
    private java.time.LocalDateTime updatedAt;
}
