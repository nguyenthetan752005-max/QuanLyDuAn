package com.quanlyduan.webxulyanh.demo.service;

import com.quanlyduan.webxulyanh.demo.dto.request.ProjectProcessingRequestDTO;
import com.quanlyduan.webxulyanh.demo.dto.response.ProjectProcessingResponseDTO;

import java.util.List;

public interface ProjectProcessingService {
    ProjectProcessingResponseDTO createProjectProcessing(ProjectProcessingRequestDTO request);
    ProjectProcessingResponseDTO getProjectProcessingById(String id);
    List<ProjectProcessingResponseDTO> getAllProjectProcessings();
    ProjectProcessingResponseDTO updateProjectProcessing(String id, ProjectProcessingRequestDTO request);
    void deleteProjectProcessing(String id);
    org.springframework.web.servlet.mvc.method.annotation.SseEmitter createEmitter(String processingId);
    void emitProgress(String processingId, int progress, String status);
}
