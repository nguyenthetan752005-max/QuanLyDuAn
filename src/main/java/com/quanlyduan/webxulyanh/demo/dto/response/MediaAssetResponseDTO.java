package com.quanlyduan.webxulyanh.demo.dto.response;

import com.quanlyduan.webxulyanh.demo.enums.MediaType;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.Map;

@Data
public class MediaAssetResponseDTO {
    private String id;
    private String userId;
    private String fileName;
    private String filePath;
    private MediaType type;
    private Double fileSizeMb;
    private Map<String, Object> metadata;
    private String thumbnailUrl;
    private String folderId;
    private boolean deleted;
    private LocalDateTime deletedAt;
    private LocalDateTime uploadedAt;
}
