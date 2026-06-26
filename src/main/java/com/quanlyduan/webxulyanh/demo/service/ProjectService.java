package com.quanlyduan.webxulyanh.demo.service;

import com.quanlyduan.webxulyanh.demo.dto.request.ProjectRequestDTO;
import com.quanlyduan.webxulyanh.demo.dto.response.ProjectResponseDTO;

import java.util.List;

public interface ProjectService {
    ProjectResponseDTO createProject(ProjectRequestDTO request);
    ProjectResponseDTO getProjectById(String id);
    List<ProjectResponseDTO> getAllProjects();
    List<ProjectResponseDTO> getProjectsByUserId(String userId);
    org.springframework.data.domain.Page<ProjectResponseDTO> getProjectsByUserId(String userId, String search, org.springframework.data.domain.Pageable pageable);
    ProjectResponseDTO updateProject(String id, ProjectRequestDTO request);
    void deleteProject(String id);
    List<ProjectResponseDTO> getDeletedProjectsByUserId(String userId);
    void restoreProject(String id);
    void deleteProjectPermanently(String id);
}
