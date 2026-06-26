package com.quanlyduan.webxulyanh.demo.entity;

import com.quanlyduan.webxulyanh.demo.enums.ProcessingStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "project_processings")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProjectProcessing {
    @Id
    private String id;
    private String projectId;
    private String userId;
    private Double calculatedRamMb;
    private boolean requiresGpu;
    private ProcessingStatus status;
    private com.quanlyduan.webxulyanh.demo.enums.ProcessingType processingType;
    private String targetItemId;
    private String resultAssetId;
    private Integer progressPercent;
    private String finalExportPath;
    private String errorMessage;
    
    @CreatedDate
    private LocalDateTime createdAt;
    
    private LocalDateTime startedAt;
    private LocalDateTime finishedAt;
}
