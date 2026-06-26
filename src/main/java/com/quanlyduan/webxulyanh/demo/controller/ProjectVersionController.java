package com.quanlyduan.webxulyanh.demo.controller;

import com.quanlyduan.webxulyanh.demo.entity.Project;
import com.quanlyduan.webxulyanh.demo.entity.ProjectVersion;
import com.quanlyduan.webxulyanh.demo.entity.User;
import com.quanlyduan.webxulyanh.demo.repository.ProjectRepository;
import com.quanlyduan.webxulyanh.demo.repository.ProjectVersionRepository;
import com.quanlyduan.webxulyanh.demo.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/** Project version history (FR07 / US14): snapshot, list and restore. */
@RestController
@RequestMapping("/api/v1/projects/{projectId}/versions")
@RequiredArgsConstructor
public class ProjectVersionController {

    private static final int MAX_VERSIONS = 20;

    private final ProjectVersionRepository versionRepository;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;

    /** Returns the project if owned by the current user, otherwise null. */
    private Project ownedProject(String projectId, Principal principal) {
        if (principal == null) return null;
        User user = userRepository.findByUsername(principal.getName()).orElse(null);
        if (user == null) return null;
        Project project = projectRepository.findById(projectId).orElse(null);
        if (project == null || !user.getId().equals(project.getUserId())) return null;
        return project;
    }

    @PostMapping
    public ResponseEntity<?> createVersion(@PathVariable String projectId,
                                           @RequestBody(required = false) Map<String, String> body,
                                           Principal principal) {
        Project project = ownedProject(projectId, principal);
        if (project == null) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();

        String label = (body != null && body.get("label") != null && !body.get("label").isBlank())
                ? body.get("label").trim()
                : "Phiên bản " + LocalDateTime.now();

        ProjectVersion version = ProjectVersion.builder()
                .projectId(projectId)
                .userId(project.getUserId())
                .label(label)
                .canvasData(project.getCanvasData())
                .timelineData(project.getTimelineData())
                .createdAt(LocalDateTime.now())
                .build();
        versionRepository.save(version);

        // Keep only the most recent MAX_VERSIONS snapshots
        List<ProjectVersion> all = versionRepository.findByProjectIdOrderByCreatedAtAsc(projectId);
        if (all.size() > MAX_VERSIONS) {
            for (int i = 0; i < all.size() - MAX_VERSIONS; i++) {
                versionRepository.deleteById(all.get(i).getId());
            }
        }

        Map<String, Object> result = new HashMap<>();
        result.put("id", version.getId());
        result.put("label", version.getLabel());
        result.put("createdAt", version.getCreatedAt());
        return new ResponseEntity<>(result, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<?> listVersions(@PathVariable String projectId, Principal principal) {
        if (ownedProject(projectId, principal) == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        // Metadata only — exclude heavy canvas/timeline payloads from the list
        List<Map<String, Object>> list = versionRepository.findByProjectIdOrderByCreatedAtDesc(projectId)
                .stream()
                .map(v -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("id", v.getId());
                    m.put("label", v.getLabel());
                    m.put("createdAt", v.getCreatedAt());
                    return m;
                })
                .collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    @PostMapping("/{versionId}/restore")
    public ResponseEntity<?> restoreVersion(@PathVariable String projectId,
                                            @PathVariable String versionId,
                                            Principal principal) {
        Project project = ownedProject(projectId, principal);
        if (project == null) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();

        ProjectVersion version = versionRepository.findById(versionId).orElse(null);
        if (version == null || !projectId.equals(version.getProjectId())) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }

        project.setCanvasData(version.getCanvasData());
        project.setTimelineData(version.getTimelineData());
        projectRepository.save(project);

        Map<String, String> result = new HashMap<>();
        result.put("message", "Đã khôi phục phiên bản.");
        return ResponseEntity.ok(result);
    }
}
