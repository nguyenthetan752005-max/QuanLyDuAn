package com.quanlyduan.webxulyanh.demo.controller;

import com.quanlyduan.webxulyanh.demo.dto.request.NotificationTemplateRequestDTO;
import com.quanlyduan.webxulyanh.demo.entity.NotificationTemplate;
import com.quanlyduan.webxulyanh.demo.enums.NotificationEvent;
import com.quanlyduan.webxulyanh.demo.service.NotificationTemplateService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import com.quanlyduan.webxulyanh.demo.entity.User;
import com.quanlyduan.webxulyanh.demo.repository.UserRepository;
import org.springframework.http.HttpStatus;
import java.security.Principal;

@RestController
@RequestMapping("/api/v1/notification-templates")
@RequiredArgsConstructor
public class NotificationTemplateController {

    private final NotificationTemplateService templateService;
    private final UserRepository userRepository;

    private boolean isAdmin(Principal principal) {
        if (principal == null) return false;
        User user = userRepository.findByUsername(principal.getName()).orElse(null);
        if (user == null) return false;
        return "ADMIN".equalsIgnoreCase(user.getRole());
    }

    @GetMapping
    public ResponseEntity<?> getAllTemplates(Principal principal) {
        if (!isAdmin(principal)) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        return ResponseEntity.ok(templateService.getAllTemplates());
    }

    @GetMapping("/{event}")
    public ResponseEntity<?> getTemplateByEvent(@PathVariable NotificationEvent event, Principal principal) {
        if (!isAdmin(principal)) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        return templateService.getTemplateByEvent(event)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> createOrUpdateTemplate(@RequestBody NotificationTemplateRequestDTO request, Principal principal) {
        if (!isAdmin(principal)) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        return ResponseEntity.ok(templateService.createOrUpdateTemplate(request));
    }
}
