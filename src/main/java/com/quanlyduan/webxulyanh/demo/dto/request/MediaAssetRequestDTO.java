package com.quanlyduan.webxulyanh.demo.dto.request;

import com.quanlyduan.webxulyanh.demo.enums.MediaType;
import lombok.Data;
import java.util.Map;

@Data
public class MediaAssetRequestDTO {
    private String userId;
    private String fileName;
    private String filePath;
    private MediaType type;
    private Double fileSizeMb;
    private Map<String, Object> metadata;
    private String folderId;
}
