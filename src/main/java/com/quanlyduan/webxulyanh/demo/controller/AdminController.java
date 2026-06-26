package com.quanlyduan.webxulyanh.demo.controller;

import com.quanlyduan.webxulyanh.demo.dto.response.UserResponseDTO;
import com.quanlyduan.webxulyanh.demo.entity.MediaAsset;
import com.quanlyduan.webxulyanh.demo.entity.Project;
import com.quanlyduan.webxulyanh.demo.entity.User;
import com.quanlyduan.webxulyanh.demo.enums.MediaType;
import com.quanlyduan.webxulyanh.demo.repository.MediaAssetRepository;
import com.quanlyduan.webxulyanh.demo.repository.ProjectRepository;
import com.quanlyduan.webxulyanh.demo.repository.UserRepository;
import com.quanlyduan.webxulyanh.demo.service.UserService;
import com.quanlyduan.webxulyanh.demo.entity.SystemSetting;
import com.quanlyduan.webxulyanh.demo.repository.SystemSettingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Admin-only endpoints (US11 quản lý tài khoản, US15 thống kê).
 * Quyền truy cập được kiểm tra thủ công theo role ADMIN của người dùng đang đăng nhập.
 */
@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class AdminController {

    private final UserRepository userRepository;
    private final UserService userService;
    private final ProjectRepository projectRepository;
    private final MediaAssetRepository mediaAssetRepository;
    private final SystemSettingRepository systemSettingRepository;
    private final org.springframework.security.authentication.AuthenticationManager authenticationManager;
    private final com.quanlyduan.webxulyanh.demo.security.JwtTokenProvider tokenProvider;
    private final com.quanlyduan.webxulyanh.demo.service.ActivityLogService activityLogService;

    @PostMapping("/login")
    public ResponseEntity<com.quanlyduan.webxulyanh.demo.dto.response.LoginResponseDTO> authenticateAdmin(@RequestBody com.quanlyduan.webxulyanh.demo.dto.request.LoginRequestDTO request, jakarta.servlet.http.HttpServletResponse httpServletResponse) {
        org.springframework.security.core.Authentication authentication = authenticationManager.authenticate(
                new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
        );

        String authenticatedUsername = authentication.getName();
        User user = userRepository.findByUsername(authenticatedUsername)
                .orElseThrow(() -> new RuntimeException("User not found: " + authenticatedUsername));

        if (!"ADMIN".equalsIgnoreCase(user.getRole())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = tokenProvider.generateToken(authentication);
        String refreshToken = tokenProvider.generateRefreshToken(authenticatedUsername);

        jakarta.servlet.http.Cookie cookie = new jakarta.servlet.http.Cookie("refreshToken", refreshToken);
        cookie.setHttpOnly(true);
        cookie.setSecure(false);
        cookie.setPath("/");
        cookie.setMaxAge(7 * 24 * 60 * 60);
        httpServletResponse.addCookie(cookie);

        com.quanlyduan.webxulyanh.demo.dto.response.LoginResponseDTO response = com.quanlyduan.webxulyanh.demo.dto.response.LoginResponseDTO.builder()
                .token(jwt)
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .role(user.getRole())
                .build();

        activityLogService.log(user.getId(), "LOGIN", "Đăng nhập trang quản trị", null);
        return ResponseEntity.ok(response);
    }

    /** Returns the current user if they are an ADMIN, otherwise null. */
    private User currentAdmin(Principal principal) {
        if (principal == null) return null;
        User user = userRepository.findByUsername(principal.getName()).orElse(null);
        if (user == null) return null;
        return "ADMIN".equalsIgnoreCase(user.getRole()) ? user : null;
    }

    @GetMapping("/stats")
    public ResponseEntity<?> getStats(Principal principal) {
        if (currentAdmin(principal) == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        List<Project> projects = projectRepository.findAll();
        long imageProjects = projects.stream().filter(p -> p.getProjectType() == MediaType.IMAGE).count();
        long videoProjects = projects.stream().filter(p -> p.getProjectType() == MediaType.VIDEO).count();

        List<MediaAsset> assets = mediaAssetRepository.findAll();
        double totalStorageMb = assets.stream()
                .map(MediaAsset::getFileSizeMb)
                .filter(java.util.Objects::nonNull)
                .mapToDouble(Double::doubleValue)
                .sum();

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalUsers", userRepository.count());
        stats.put("totalProjects", projects.size());
        stats.put("imageProjects", imageProjects);
        stats.put("videoProjects", videoProjects);
        stats.put("totalAssets", assets.size());
        stats.put("totalStorageMb", Math.round(totalStorageMb * 100.0) / 100.0);
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/users")
    public ResponseEntity<?> getAllUsers(Principal principal) {
        if (currentAdmin(principal) == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        List<UserResponseDTO> users = userService.getAllUsers();
        return ResponseEntity.ok(users);
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable String id, Principal principal) {
        User admin = currentAdmin(principal);
        if (admin == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        // An admin cannot delete their own account from here
        if (admin.getId().equals(id)) {
            Map<String, String> err = new HashMap<>();
            err.put("message", "Không thể tự xóa tài khoản quản trị đang đăng nhập.");
            return ResponseEntity.badRequest().body(err);
        }
        // Prevent deleting other admins for safety
        User target = userRepository.findById(id).orElse(null);
        if (target != null && "ADMIN".equalsIgnoreCase(target.getRole())) {
            Map<String, String> err = new HashMap<>();
            err.put("message", "Không thể xóa một tài khoản quản trị khác.");
            return ResponseEntity.badRequest().body(err);
        }
        userService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/users/{id}")
    public ResponseEntity<?> getUserDetail(@PathVariable String id, Principal principal) {
        if (currentAdmin(principal) == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        User user = userRepository.findById(id).orElse(null);
        if (user == null) {
            return ResponseEntity.notFound().build();
        }

        long totalProjects = projectRepository.findByUserId(id).size();

        java.util.List<MediaAsset> assets = mediaAssetRepository.findByUserId(id);
        double totalMb = assets.stream()
                .map(MediaAsset::getFileSizeMb)
                .filter(java.util.Objects::nonNull)
                .mapToDouble(Double::doubleValue)
                .sum();

        com.quanlyduan.webxulyanh.demo.dto.response.UserDetailAdminDTO detail = com.quanlyduan.webxulyanh.demo.dto.response.UserDetailAdminDTO.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .role(user.getRole())
                .createdAt(user.getCreatedAt())
                .totalProjects(totalProjects)
                .totalStorageMb(Math.round(totalMb * 100.0) / 100.0)
                .build();

        return ResponseEntity.ok(detail);
    }

    // ===== System Settings Management (0.5.5) =====
    
    @GetMapping("/settings")
    public ResponseEntity<?> getAllSettings(Principal principal) {
        if (currentAdmin(principal) == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(systemSettingRepository.findAll());
    }

    @PostMapping("/settings")
    public ResponseEntity<?> updateSetting(@RequestBody SystemSetting updatedSetting, Principal principal) {
        if (currentAdmin(principal) == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        SystemSetting existing = systemSettingRepository.findBySettingKey(updatedSetting.getSettingKey()).orElse(null);
        if (existing != null) {
            existing.setSettingValue(updatedSetting.getSettingValue());
            existing.setUpdatedAt(java.time.LocalDateTime.now());
            systemSettingRepository.save(existing);
            return ResponseEntity.ok(existing);
        } else {
            // Create new setting if not exist (optional, but good for dynamic configs)
            updatedSetting.setUpdatedAt(java.time.LocalDateTime.now());
            systemSettingRepository.save(updatedSetting);
            return ResponseEntity.ok(updatedSetting);
        }
    }
}
