package com.quanlyduan.webxulyanh.demo.entity;

import com.quanlyduan.webxulyanh.demo.enums.MediaType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.Map;

@Document(collection = "media_assets")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MediaAsset {
    @Id
    private String id;
    
    @Indexed
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
    
    @CreatedDate
    private LocalDateTime uploadedAt;
}

