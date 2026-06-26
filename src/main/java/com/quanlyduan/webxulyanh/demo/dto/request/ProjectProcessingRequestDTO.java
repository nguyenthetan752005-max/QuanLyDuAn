package com.quanlyduan.webxulyanh.demo.dto.request;

import com.quanlyduan.webxulyanh.demo.enums.ProcessingStatus;
import lombok.Data;

@Data
public class ProjectProcessingRequestDTO {
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
}
