package com.quanlyduan.webxulyanh.demo.service.impl;

import com.quanlyduan.webxulyanh.demo.dto.request.ProjectProcessingRequestDTO;
import com.quanlyduan.webxulyanh.demo.dto.response.ProjectProcessingResponseDTO;
import com.quanlyduan.webxulyanh.demo.entity.ProjectProcessing;
import com.quanlyduan.webxulyanh.demo.exception.ResourceNotFoundException;
import com.quanlyduan.webxulyanh.demo.repository.ProjectProcessingRepository;
import com.quanlyduan.webxulyanh.demo.service.ProjectProcessingService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProjectProcessingServiceImpl implements ProjectProcessingService {

    private final ProjectProcessingRepository projectProcessingRepository;

    @Override
    public ProjectProcessingResponseDTO createProjectProcessing(ProjectProcessingRequestDTO request) {
        ProjectProcessing processing = ProjectProcessing.builder()
                .projectId(request.getProjectId())
                .userId(request.getUserId())
                .calculatedRamMb(request.getCalculatedRamMb())
                .requiresGpu(request.isRequiresGpu())
                .status(request.getStatus())
                .processingType(request.getProcessingType() != null ? request.getProcessingType() : com.quanlyduan.webxulyanh.demo.enums.ProcessingType.PROJECT_EXPORT)
                .targetItemId(request.getTargetItemId())
                .resultAssetId(request.getResultAssetId())
                .progressPercent(request.getProgressPercent())
                .finalExportPath(request.getFinalExportPath())
                .errorMessage(request.getErrorMessage())
                .build();
        ProjectProcessing saved = projectProcessingRepository.save(processing);
        return mapToResponse(saved);
    }

    @Override
    public ProjectProcessingResponseDTO getProjectProcessingById(String id) {
        ProjectProcessing processing = projectProcessingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ProjectProcessing not found with id: " + id));
        return mapToResponse(processing);
    }

    @Override
    public List<ProjectProcessingResponseDTO> getAllProjectProcessings() {
        return projectProcessingRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public ProjectProcessingResponseDTO updateProjectProcessing(String id, ProjectProcessingRequestDTO request) {
        ProjectProcessing processing = projectProcessingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ProjectProcessing not found with id: " + id));
        processing.setCalculatedRamMb(request.getCalculatedRamMb());
        processing.setRequiresGpu(request.isRequiresGpu());
        processing.setStatus(request.getStatus());
        if(request.getProcessingType() != null) processing.setProcessingType(request.getProcessingType());
        if(request.getTargetItemId() != null) processing.setTargetItemId(request.getTargetItemId());
        if(request.getResultAssetId() != null) processing.setResultAssetId(request.getResultAssetId());
        processing.setProgressPercent(request.getProgressPercent());
        processing.setFinalExportPath(request.getFinalExportPath());
        processing.setErrorMessage(request.getErrorMessage());
        ProjectProcessing updated = projectProcessingRepository.save(processing);
        return mapToResponse(updated);
    }

    @Override
    public void deleteProjectProcessing(String id) {
        ProjectProcessing processing = projectProcessingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ProjectProcessing not found with id: " + id));
        projectProcessingRepository.delete(processing);
    }

    private final java.util.Map<String, org.springframework.web.servlet.mvc.method.annotation.SseEmitter> emitters = new java.util.concurrent.ConcurrentHashMap<>();

    @Override
    public org.springframework.web.servlet.mvc.method.annotation.SseEmitter createEmitter(String processingId) {
        org.springframework.web.servlet.mvc.method.annotation.SseEmitter emitter = new org.springframework.web.servlet.mvc.method.annotation.SseEmitter(3600000L); // 1 hour timeout
        emitters.put(processingId, emitter);
        
        // Gửi ngay trạng thái hiện tại khi vừa kết nối (phải chạy bất đồng bộ để tránh IllegalStateException khi response chưa commit)
        ProjectProcessing processing = projectProcessingRepository.findById(processingId).orElse(null);
        if (processing != null) {
            java.util.concurrent.CompletableFuture.runAsync(() -> {
                try {
                    Thread.sleep(500);
                    emitter.send(org.springframework.web.servlet.mvc.method.annotation.SseEmitter.event()
                            .name("progress")
                            .data("{\"progress\": " + processing.getProgressPercent() + ", \"status\": \"" + processing.getStatus().name() + "\"}"));
                } catch (Exception e) {
                    // Ignore, client might have disconnected
                }
            });
        }
        
        emitter.onCompletion(() -> emitters.remove(processingId));
        emitter.onTimeout(() -> emitters.remove(processingId));
        emitter.onError((e) -> emitters.remove(processingId));
        return emitter;
    }

    @Override
    public void emitProgress(String processingId, int progress, String status) {
        org.springframework.web.servlet.mvc.method.annotation.SseEmitter emitter = emitters.get(processingId);
        if (emitter != null) {
            try {
                emitter.send(org.springframework.web.servlet.mvc.method.annotation.SseEmitter.event()
                        .name("progress")
                        .data("{\"progress\": " + progress + ", \"status\": \"" + status + "\"}"));
            } catch (Exception e) {
                emitters.remove(processingId);
            }
        }
    }

    private ProjectProcessingResponseDTO mapToResponse(ProjectProcessing processing) {
        ProjectProcessingResponseDTO response = new ProjectProcessingResponseDTO();
        response.setId(processing.getId());
        response.setProjectId(processing.getProjectId());
        response.setUserId(processing.getUserId());
        response.setCalculatedRamMb(processing.getCalculatedRamMb());
        response.setRequiresGpu(processing.isRequiresGpu());
        response.setStatus(processing.getStatus());
        response.setProcessingType(processing.getProcessingType());
        response.setTargetItemId(processing.getTargetItemId());
        response.setResultAssetId(processing.getResultAssetId());
        response.setProgressPercent(processing.getProgressPercent());
        response.setFinalExportPath(processing.getFinalExportPath());
        response.setErrorMessage(processing.getErrorMessage());
        return response;
    }
}
