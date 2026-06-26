package com.quanlyduan.webxulyanh.demo.controller;

import com.quanlyduan.webxulyanh.demo.dto.request.NotificationRequestDTO;
import com.quanlyduan.webxulyanh.demo.entity.Notification;
import com.quanlyduan.webxulyanh.demo.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import com.quanlyduan.webxulyanh.demo.entity.User;
import com.quanlyduan.webxulyanh.demo.repository.UserRepository;
import java.security.Principal;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;
    private final UserRepository userRepository;

    private boolean isAdmin(Principal principal) {
        if (principal == null) return false;
        User user = userRepository.findByUsername(principal.getName()).orElse(null);
        if (user == null) return false;
        return "ADMIN".equalsIgnoreCase(user.getRole());
    }

    @PostMapping
    public ResponseEntity<?> createNotification(@RequestBody NotificationRequestDTO request, Principal principal) {
        if (!isAdmin(principal)) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        Notification created = notificationService.createNotification(request);
        return new ResponseEntity<>(created, HttpStatus.CREATED);
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Notification>> getNotificationsForUser(@PathVariable String userId) {
        return ResponseEntity.ok(notificationService.getNotificationsForUser(userId));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<Void> markAsRead(@PathVariable String id) {
        notificationService.markAsRead(id);
        return ResponseEntity.ok().build();
    }
}
