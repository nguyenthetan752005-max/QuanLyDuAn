package com.quanlyduan.webxulyanh.demo.controller;

import com.quanlyduan.webxulyanh.demo.dto.response.ProjectProcessingResponseDTO;
import com.quanlyduan.webxulyanh.demo.entity.User;
import com.quanlyduan.webxulyanh.demo.repository.UserRepository;
import com.quanlyduan.webxulyanh.demo.service.VideoProcessingService;
import com.quanlyduan.webxulyanh.demo.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@RestController
@RequestMapping("/api/v1/video-processing")
@RequiredArgsConstructor
public class VideoProcessingController {

    private final VideoProcessingService videoProcessingService;
    private final UserRepository userRepository;

    @PostMapping("/render")
    public ResponseEntity<ProjectProcessingResponseDTO> renderVideo(
            @RequestParam String projectId,
            @RequestParam(defaultValue = "mp4") String format,
            @RequestParam(defaultValue = "1.0") Double scale,
            @RequestParam(defaultValue = "30") Integer fps,
            Principal principal) {
            
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        User user = userRepository.findByUsername(principal.getName())
                .orElseGet(() -> userRepository.findByEmail(principal.getName())
                        .orElseThrow(() -> new ResourceNotFoundException("User not found")));

        ProjectProcessingResponseDTO result = videoProcessingService.startVideoRender(projectId, format, scale, fps, user.getId());
        return ResponseEntity.ok(result);
    }

    @PostMapping("/cancel")
    public ResponseEntity<Void> cancelRender(@RequestParam String processingId) {
        videoProcessingService.cancelVideoRender(processingId);
        return ResponseEntity.ok().build();
    }
}
