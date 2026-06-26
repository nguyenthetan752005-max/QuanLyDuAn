package com.quanlyduan.webxulyanh.demo.controller;

import com.quanlyduan.webxulyanh.demo.dto.request.ProjectRequestDTO;
import com.quanlyduan.webxulyanh.demo.dto.response.ProjectResponseDTO;
import com.quanlyduan.webxulyanh.demo.service.ProjectService;
import lombok.RequiredArgsConstructor;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;
    private final com.quanlyduan.webxulyanh.demo.repository.UserRepository userRepository;
    private final com.quanlyduan.webxulyanh.demo.service.ActivityLogService activityLogService;

    @PostMapping
    public ResponseEntity<ProjectResponseDTO> createProject(@Valid @RequestBody ProjectRequestDTO request, java.security.Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        com.quanlyduan.webxulyanh.demo.entity.User user = getCurrentUser(principal);
        request.setUserId(user.getId());
        if (request.getProjectName() != null) {
            request.setProjectName(org.springframework.web.util.HtmlUtils.htmlEscape(request.getProjectName().trim()));
        }
        if (request.getStatus() == null) {
            request.setStatus(com.quanlyduan.webxulyanh.demo.enums.ProjectStatus.DRAFT);
        }
        ProjectResponseDTO created = projectService.createProject(request);
        activityLogService.log(user.getId(), "PROJECT_CREATE",
                "Tạo dự án \"" + request.getProjectName() + "\"", created.getId());
        return new ResponseEntity<>(created, HttpStatus.CREATED);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProjectResponseDTO> getProjectById(@PathVariable String id, java.security.Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        com.quanlyduan.webxulyanh.demo.entity.User user = getCurrentUser(principal);
        ProjectResponseDTO project = projectService.getProjectById(id);
        if (!project.getUserId().equals(user.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        if (project.isDeleted()) {
            throw new com.quanlyduan.webxulyanh.demo.exception.ResourceNotFoundException("Dự án này đã bị xóa hoặc không tồn tại.");
        }
        return ResponseEntity.ok(project);
    }

    @GetMapping
    public ResponseEntity<org.springframework.data.domain.Page<ProjectResponseDTO>> getAllProjects(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String search,
            java.security.Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        com.quanlyduan.webxulyanh.demo.entity.User user = getCurrentUser(principal);
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(
                page, size, org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "updatedAt"));
        return ResponseEntity.ok(projectService.getProjectsByUserId(user.getId(), search, pageable));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProjectResponseDTO> updateProject(@PathVariable String id, @Valid @RequestBody ProjectRequestDTO request, java.security.Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        com.quanlyduan.webxulyanh.demo.entity.User user = getCurrentUser(principal);
        ProjectResponseDTO existing = projectService.getProjectById(id);
        if (!existing.getUserId().equals(user.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        if (existing.isDeleted()) {
            throw new com.quanlyduan.webxulyanh.demo.exception.ResourceNotFoundException("Dự án này đã bị xóa hoặc không tồn tại.");
        }
        request.setUserId(user.getId());
        if (request.getProjectName() != null) {
            request.setProjectName(org.springframework.web.util.HtmlUtils.htmlEscape(request.getProjectName().trim()));
        }
        return ResponseEntity.ok(projectService.updateProject(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProject(@PathVariable String id, java.security.Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        com.quanlyduan.webxulyanh.demo.entity.User user = getCurrentUser(principal);
        ProjectResponseDTO existing = projectService.getProjectById(id);
        if (!existing.getUserId().equals(user.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        projectService.deleteProject(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/deleted")
    public ResponseEntity<List<ProjectResponseDTO>> getDeletedProjects(java.security.Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        com.quanlyduan.webxulyanh.demo.entity.User user = getCurrentUser(principal);
        return ResponseEntity.ok(projectService.getDeletedProjectsByUserId(user.getId()));
    }

    @PutMapping("/{id}/restore")
    public ResponseEntity<Void> restoreProject(@PathVariable String id, java.security.Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        com.quanlyduan.webxulyanh.demo.entity.User user = getCurrentUser(principal);
        ProjectResponseDTO existing = projectService.getProjectById(id);
        if (!existing.getUserId().equals(user.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        projectService.restoreProject(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}/permanent")
    public ResponseEntity<Void> deleteProjectPermanently(@PathVariable String id, java.security.Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        com.quanlyduan.webxulyanh.demo.entity.User user = getCurrentUser(principal);
        ProjectResponseDTO existing = projectService.getProjectById(id);
        if (!existing.getUserId().equals(user.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        projectService.deleteProjectPermanently(id);
        return ResponseEntity.noContent().build();
    }

    private com.quanlyduan.webxulyanh.demo.entity.User getCurrentUser(java.security.Principal principal) {
        return userRepository.findByUsername(principal.getName())
                .orElseGet(() -> userRepository.findByEmail(principal.getName())
                        .orElseThrow(() -> new com.quanlyduan.webxulyanh.demo.exception.ResourceNotFoundException("User not found")));
    }
}
