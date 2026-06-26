package com.quanlyduan.webxulyanh.demo.controller;

import com.quanlyduan.webxulyanh.demo.dto.request.ProjectProcessingRequestDTO;
import com.quanlyduan.webxulyanh.demo.dto.response.ProjectProcessingResponseDTO;
import com.quanlyduan.webxulyanh.demo.service.ProjectProcessingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/project-processings")
@RequiredArgsConstructor
public class ProjectProcessingController {

    private final ProjectProcessingService projectProcessingService;

    @PostMapping
    public ResponseEntity<ProjectProcessingResponseDTO> createProjectProcessing(@RequestBody ProjectProcessingRequestDTO request) {
        return new ResponseEntity<>(projectProcessingService.createProjectProcessing(request), HttpStatus.CREATED);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProjectProcessingResponseDTO> getProjectProcessingById(@PathVariable String id) {
        return ResponseEntity.ok(projectProcessingService.getProjectProcessingById(id));
    }

    @GetMapping
    public ResponseEntity<List<ProjectProcessingResponseDTO>> getAllProjectProcessings() {
        return ResponseEntity.ok(projectProcessingService.getAllProjectProcessings());
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProjectProcessingResponseDTO> updateProjectProcessing(@PathVariable String id, @RequestBody ProjectProcessingRequestDTO request) {
        return ResponseEntity.ok(projectProcessingService.updateProjectProcessing(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProjectProcessing(@PathVariable String id) {
        projectProcessingService.deleteProjectProcessing(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping(value = "/stream/{id}", produces = org.springframework.http.MediaType.TEXT_EVENT_STREAM_VALUE)
    public org.springframework.web.servlet.mvc.method.annotation.SseEmitter streamProjectProcessing(@PathVariable String id) {
        return projectProcessingService.createEmitter(id);
    }
}
