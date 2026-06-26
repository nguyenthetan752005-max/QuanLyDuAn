package com.quanlyduan.webxulyanh.demo.service.impl;

import com.quanlyduan.webxulyanh.demo.dto.request.ProjectRequestDTO;
import com.quanlyduan.webxulyanh.demo.dto.response.ProjectResponseDTO;
import com.quanlyduan.webxulyanh.demo.entity.Project;
import com.quanlyduan.webxulyanh.demo.exception.ResourceNotFoundException;
import com.quanlyduan.webxulyanh.demo.repository.ProjectRepository;
import com.quanlyduan.webxulyanh.demo.repository.ProjectProcessingRepository;
import com.quanlyduan.webxulyanh.demo.entity.ProjectProcessing;
import com.quanlyduan.webxulyanh.demo.service.ProjectService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProjectServiceImpl implements ProjectService {

    private final ProjectRepository projectRepository;
    private final com.quanlyduan.webxulyanh.demo.service.StorageService storageService;
    private final ProjectProcessingRepository projectProcessingRepository;

    @org.springframework.beans.factory.annotation.Value("${app.storage.upload-dir:uploads}")
    private String uploadDir;

    @Override
    public ProjectResponseDTO createProject(ProjectRequestDTO request) {
        String projectName = request.getProjectName();
        List<Project> existing = projectRepository.findByUserIdAndDeleted(request.getUserId(), false);
        String finalName = projectName;
        int count = 1;
        while (hasProjectNameConflict(existing, null, finalName)) {
            finalName = projectName + " (" + count + ")";
            count++;
        }

        String tUrl = processThumbnailData(request.getThumbnailData(), request.getThumbnailUrl());

        Project project = Project.builder()
                .userId(request.getUserId())
                .projectName(finalName)
                .status(request.getStatus())
                .projectType(request.getProjectType())
                .canvasData(request.getCanvasData())
                .timelineData(request.getTimelineData())
                .thumbnailUrl(tUrl)
                .createdAt(LocalDateTime.now().truncatedTo(java.time.temporal.ChronoUnit.MILLIS))
                .updatedAt(LocalDateTime.now().truncatedTo(java.time.temporal.ChronoUnit.MILLIS))
                .build();
        Project saved = projectRepository.save(project);
        return mapToResponse(saved);
    }

    private String processThumbnailData(String base64Data, String currentUrl) {
        if (base64Data == null || base64Data.trim().isEmpty()) {
            return currentUrl;
        }
        try {
            String[] parts = base64Data.split(",");
            String data = parts.length > 1 ? parts[1] : parts[0];
            byte[] imageBytes = java.util.Base64.getDecoder().decode(data);
            String filename = "proj_" + java.util.UUID.randomUUID().toString() + ".png";
            java.nio.file.Path rootLocation = java.nio.file.Paths.get(uploadDir);
            java.nio.file.Files.createDirectories(rootLocation);
            java.nio.file.Path outputFile = rootLocation.resolve(filename);
            java.nio.file.Files.write(outputFile, imageBytes);
            
            // Xóa file cũ nếu có
            if (currentUrl != null && currentUrl.startsWith("/uploads/")) {
                try {
                    String oldFilename = currentUrl.substring("/uploads/".length());
                    storageService.delete(oldFilename);
                } catch (Exception ignored) {}
            }
            
            return "/uploads/" + filename;
        } catch (Exception e) {
            log.error("Lỗi khi lưu thumbnail project", e);
            return currentUrl;
        }
    }

    @Override
    public ProjectResponseDTO getProjectById(String id) {
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found with id: " + id));
        return mapToResponse(project);
    }

    @Override
    public List<ProjectResponseDTO> getAllProjects() {
        return projectRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public List<ProjectResponseDTO> getProjectsByUserId(String userId) {
        return projectRepository.findByUserIdAndDeleted(userId, false).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public org.springframework.data.domain.Page<ProjectResponseDTO> getProjectsByUserId(String userId, String search, org.springframework.data.domain.Pageable pageable) {
        org.springframework.data.domain.Page<Project> page;
        if (search != null && !search.trim().isEmpty()) {
            page = projectRepository.findByUserIdAndDeletedAndProjectNameRegex(userId, false, ".*" + search + ".*", pageable);
        } else {
            page = projectRepository.findByUserIdAndDeleted(userId, false, pageable);
        }
        return page.map(this::mapToResponse);
    }

    private void checkProjectNotRendering(String projectId) {
        List<ProjectProcessing> processings = projectProcessingRepository.findByProjectId(projectId);
        boolean isRendering = processings.stream()
                .anyMatch(p -> p.getStatus() == com.quanlyduan.webxulyanh.demo.enums.ProcessingStatus.QUEUED 
                            || p.getStatus() == com.quanlyduan.webxulyanh.demo.enums.ProcessingStatus.RUNNING);
        if (isRendering) {
            throw new IllegalStateException("Dự án đang trong quá trình xuất bản (rendering), không thể chỉnh sửa hoặc xóa lúc này!");
        }
    }

    @Override
    public ProjectResponseDTO updateProject(String id, ProjectRequestDTO request) {
        checkProjectNotRendering(id);
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found with id: " + id));
        
        if (request.getUpdatedAt() != null && project.getUpdatedAt() != null) {
            java.time.LocalDateTime reqTime = request.getUpdatedAt().truncatedTo(java.time.temporal.ChronoUnit.MILLIS);
            java.time.LocalDateTime dbTime = project.getUpdatedAt().truncatedTo(java.time.temporal.ChronoUnit.MILLIS);
            if (reqTime.isBefore(dbTime)) {
                throw new java.util.ConcurrentModificationException("Dự án đã được cập nhật ở một thiết bị khác. Vui lòng tải lại.");
            }
        }
        
        String projectName = request.getProjectName();
        List<Project> existing = projectRepository.findByUserIdAndDeleted(project.getUserId(), false);
        String finalName = projectName;
        int count = 1;
        while (hasProjectNameConflict(existing, id, finalName)) {
            finalName = projectName + " (" + count + ")";
            count++;
        }
        
        String tUrl = processThumbnailData(request.getThumbnailData(), request.getThumbnailUrl());
        if (tUrl == null && request.getThumbnailUrl() != null) {
            tUrl = request.getThumbnailUrl(); // keep old if no new data and old URL passed
        }
        
        project.setProjectName(finalName);
        project.setStatus(request.getStatus());
        if (request.getProjectType() != null) {
            project.setProjectType(request.getProjectType());
        }
        project.setThumbnailUrl(tUrl);
        project.setCanvasData(request.getCanvasData());
        project.setTimelineData(request.getTimelineData());
        project.setUpdatedAt(LocalDateTime.now().truncatedTo(java.time.temporal.ChronoUnit.MILLIS));
        Project updated = projectRepository.save(project);
        return mapToResponse(updated);
    }

    @Override
    public void deleteProject(String id) {
        checkProjectNotRendering(id);
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found with id: " + id));
        project.setDeleted(true);
        project.setDeletedAt(LocalDateTime.now().truncatedTo(java.time.temporal.ChronoUnit.MILLIS));
        projectRepository.save(project);
    }

    @Override
    public List<ProjectResponseDTO> getDeletedProjectsByUserId(String userId) {
        return projectRepository.findByUserIdAndDeleted(userId, true).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public void restoreProject(String id) {
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found with id: " + id));
        
        // Kiểm tra trùng tên với các dự án đang hoạt động
        List<Project> activeProjects = projectRepository.findByUserIdAndDeleted(project.getUserId(), false);
        String finalName = project.getProjectName();
        int count = 1;
        while (hasProjectNameConflict(activeProjects, id, finalName)) {
            finalName = project.getProjectName() + " (" + count + ")";
            count++;
        }
        if (!finalName.equals(project.getProjectName())) {
            project.setProjectName(finalName);
            log.info("Trùng tên dự án khi khôi phục, đổi tên thành: {}", project.getProjectName());
        }

        project.setDeleted(false);
        project.setDeletedAt(null);
        projectRepository.save(project);
    }

    @Override
    public void deleteProjectPermanently(String id) {
        checkProjectNotRendering(id);
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found with id: " + id));
        
        // Xóa file ảnh thumbnail vật lý trên đĩa nếu có
        if (project.getThumbnailUrl() != null && !project.getThumbnailUrl().isEmpty()) {
            try {
                String fileName = project.getThumbnailUrl().substring(project.getThumbnailUrl().lastIndexOf("/") + 1);
                storageService.delete(fileName);
                log.info("Đã xóa file thumbnail vật lý trên đĩa: {}", fileName);
            } catch (Exception e) {
                log.error("Lỗi khi xóa file thumbnail vật lý cho dự án {}: {}", project.getProjectName(), e.getMessage());
            }
        }

        projectRepository.delete(project);
    }

    private ProjectResponseDTO mapToResponse(Project project) {
        ProjectResponseDTO response = new ProjectResponseDTO();
        response.setId(project.getId());
        response.setUserId(project.getUserId());
        response.setProjectName(project.getProjectName());
        response.setStatus(project.getStatus());
        response.setProjectType(project.getProjectType());
        response.setThumbnailUrl(project.getThumbnailUrl());
        response.setDeleted(project.isDeleted());
        response.setCanvasData(project.getCanvasData());
        response.setTimelineData(project.getTimelineData());
        response.setCreatedAt(project.getCreatedAt());
        response.setUpdatedAt(project.getUpdatedAt());

        // Check if project is currently rendering
        List<ProjectProcessing> processings = projectProcessingRepository.findByProjectId(project.getId());
        java.util.Optional<ProjectProcessing> activeOpt = processings.stream()
                .filter(p -> p.getStatus() == com.quanlyduan.webxulyanh.demo.enums.ProcessingStatus.QUEUED 
                          || p.getStatus() == com.quanlyduan.webxulyanh.demo.enums.ProcessingStatus.RUNNING)
                .findFirst();
        if (activeOpt.isPresent()) {
            response.setRendering(true);
            response.setActiveProcessingId(activeOpt.get().getId());
        } else {
            response.setRendering(false);
            response.setActiveProcessingId(null);
        }

        return response;
    }

    private boolean hasProjectNameConflict(List<Project> existing, String excludeId, String name) {
        return existing.stream()
                .anyMatch(p -> (excludeId == null || !p.getId().equals(excludeId)) 
                            && p.getProjectName().equalsIgnoreCase(name));
    }
}
