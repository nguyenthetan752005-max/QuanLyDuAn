package com.quanlyduan.webxulyanh.demo.entity;

import com.quanlyduan.webxulyanh.demo.enums.ProjectStatus;
import com.quanlyduan.webxulyanh.demo.enums.MediaType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.Map;

@Document(collection = "projects")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Project {
    @Id
    private String id;
    
    @Indexed
    private String userId;
    private String projectName;
    private ProjectStatus status;
    private MediaType projectType;
    private Map<String, Object> canvasData;
    private Map<String, Object> timelineData;
    private String thumbnailUrl;
    
    private boolean deleted;
    private LocalDateTime deletedAt;
    
    @CreatedDate
    private LocalDateTime createdAt;
    
    @LastModifiedDate
    private LocalDateTime updatedAt;
}
