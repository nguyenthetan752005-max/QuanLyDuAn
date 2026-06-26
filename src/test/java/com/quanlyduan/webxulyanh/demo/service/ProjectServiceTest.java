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
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class ProjectServiceTest {

    @Mock
    private ProjectRepository projectRepository;

    @Mock
    private com.quanlyduan.webxulyanh.demo.service.ActivityLogService activityLogService;

    @InjectMocks
    private ProjectServiceImpl projectService;

    @Test
    void createProject_ShouldSaveProject() {
        ProjectRequestDTO req = new ProjectRequestDTO();
        req.setProjectName("Test Project");

        Project p = new Project();
        p.setId("proj1");
        p.setProjectName("Test Project");

        when(projectRepository.save(any(Project.class))).thenReturn(p);

        var result = projectService.createProject(req, "user1");

        assertNotNull(result);
        assertEquals("Test Project", result.getProjectName());
        verify(projectRepository).save(any(Project.class));
    }
}
