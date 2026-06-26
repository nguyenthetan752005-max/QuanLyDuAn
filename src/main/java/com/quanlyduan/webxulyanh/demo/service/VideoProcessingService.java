package com.quanlyduan.webxulyanh.demo.service;

import com.quanlyduan.webxulyanh.demo.dto.response.ProjectProcessingResponseDTO;

public interface VideoProcessingService {
    ProjectProcessingResponseDTO startVideoRender(String projectId, String format, Double scale, Integer fps, String userId);
    void cancelVideoRender(String processingId);
}
