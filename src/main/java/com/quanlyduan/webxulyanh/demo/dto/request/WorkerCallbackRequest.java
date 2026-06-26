package com.quanlyduan.webxulyanh.demo.dto.request;

import lombok.Data;

@Data
public class WorkerCallbackRequest {
    private String jobId;
    private String status;
    private String filePath;
    private String errorMessage;
}
