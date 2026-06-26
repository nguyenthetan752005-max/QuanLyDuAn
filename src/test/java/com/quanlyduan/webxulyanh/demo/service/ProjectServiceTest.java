package com.quanlyduan.webxulyanh.demo.service;

import com.quanlyduan.webxulyanh.demo.dto.request.ProjectRequestDTO;
import com.quanlyduan.webxulyanh.demo.entity.Project;
import com.quanlyduan.webxulyanh.demo.repository.ProjectRepository;
import com.quanlyduan.webxulyanh.demo.service.impl.ProjectServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class ProjectServiceTest {

    @Mock
    private ProjectRepository projectRepository;

    @Mock
    private com.quanlyduan.webxulyanh.demo.service.StorageService storageService;

    @Mock
    private com.quanlyduan.webxulyanh.demo.repository.ProjectProcessingRepository projectProcessingRepository;

    @InjectMocks
    private ProjectServiceImpl projectService;

    @Test
    void createProject_ShouldSaveProject() {
        ProjectRequestDTO req = new ProjectRequestDTO();
        req.setProjectName("Test Project");
        req.setUserId("user1");
        
        Project p = new Project();
        p.setId("proj1");
        p.setProjectName("Test Project");
        p.setUserId("user1");

        when(projectRepository.findByUserIdAndDeleted(anyString(), anyBoolean())).thenReturn(java.util.Collections.emptyList());
        when(projectRepository.save(any(Project.class))).thenReturn(p);

        var result = projectService.createProject(req);

        assertNotNull(result);
        assertEquals("Test Project", result.getProjectName());
        verify(projectRepository).save(any(Project.class));
    }
}
