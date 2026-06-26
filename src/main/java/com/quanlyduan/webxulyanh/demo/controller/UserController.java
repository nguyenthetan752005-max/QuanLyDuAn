package com.quanlyduan.webxulyanh.demo.controller;

import com.quanlyduan.webxulyanh.demo.dto.request.GoogleLoginRequestDTO;
import com.quanlyduan.webxulyanh.demo.dto.request.LoginRequestDTO;
import com.quanlyduan.webxulyanh.demo.dto.request.UserRequestDTO;
import com.quanlyduan.webxulyanh.demo.dto.response.LoginResponseDTO;
import com.quanlyduan.webxulyanh.demo.dto.response.UserResponseDTO;
import com.quanlyduan.webxulyanh.demo.entity.MediaAsset;
import com.quanlyduan.webxulyanh.demo.entity.User;
import com.quanlyduan.webxulyanh.demo.repository.MediaAssetRepository;
import com.quanlyduan.webxulyanh.demo.repository.UserRepository;
import com.quanlyduan.webxulyanh.demo.service.ActivityLogService;
import com.quanlyduan.webxulyanh.demo.service.SystemSettingService;
import com.quanlyduan.webxulyanh.demo.security.JwtTokenProvider;
import com.quanlyduan.webxulyanh.demo.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;
    private final UserRepository userRepository;
    private final MediaAssetRepository mediaAssetRepository;
    private final SystemSettingService systemSettingService;
    private final ActivityLogService activityLogService;

    @PostMapping("/register")
    public ResponseEntity<UserResponseDTO> registerUser(@Valid @RequestBody UserRequestDTO request) {
        return new ResponseEntity<>(userService.createUser(request), HttpStatus.CREATED);
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponseDTO> authenticateUser(@RequestBody LoginRequestDTO request, jakarta.servlet.http.HttpServletResponse httpServletResponse) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = tokenProvider.generateToken(authentication);
        String refreshToken = tokenProvider.generateRefreshToken(authentication.getName());

        jakarta.servlet.http.Cookie cookie = new jakarta.servlet.http.Cookie("refreshToken", refreshToken);
        cookie.setHttpOnly(true);
        cookie.setSecure(false); // Should be true in production with HTTPS
        cookie.setPath("/");
        cookie.setMaxAge(7 * 24 * 60 * 60); // 7 days
        httpServletResponse.addCookie(cookie);

        String authenticatedUsername = authentication.getName();

        User user = userRepository.findByUsername(authenticatedUsername)
                .orElseThrow(() -> new RuntimeException("User not found: " + authenticatedUsername));

        if ("ADMIN".equalsIgnoreCase(user.getRole())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(LoginResponseDTO.builder().build()); // Actually, better to throw exception or return meaningful error
        }

        LoginResponseDTO response = LoginResponseDTO.builder()
                .token(jwt)
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .role(user.getRole())
                .build();

        activityLogService.log(user.getId(), "LOGIN", "Đăng nhập hệ thống", null);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/google-login")
    public ResponseEntity<LoginResponseDTO> googleLogin(@RequestBody GoogleLoginRequestDTO request, jakarta.servlet.http.HttpServletResponse httpServletResponse) {
        LoginResponseDTO response = userService.loginOrRegisterGoogleUser(request.getIdToken());
        
        if ("ADMIN".equalsIgnoreCase(response.getRole())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(LoginResponseDTO.builder().build());
        }

        String refreshToken = tokenProvider.generateRefreshToken(response.getUsername());
        jakarta.servlet.http.Cookie cookie = new jakarta.servlet.http.Cookie("refreshToken", refreshToken);
        cookie.setHttpOnly(true);
        cookie.setSecure(false); // Should be true in production
        cookie.setPath("/");
        cookie.setMaxAge(7 * 24 * 60 * 60);
        httpServletResponse.addCookie(cookie);
        
        return ResponseEntity.ok(response);
    }

    @PostMapping("/refresh")
    public ResponseEntity<java.util.Map<String, String>> refreshToken(jakarta.servlet.http.HttpServletRequest request) {
        String refreshToken = null;
        if (request.getCookies() != null) {
            for (jakarta.servlet.http.Cookie cookie : request.getCookies()) {
                if ("refreshToken".equals(cookie.getName())) {
                    refreshToken = cookie.getValue();
                    break;
                }
            }
        }

        if (refreshToken == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(java.util.Collections.singletonMap("error", "Refresh token is missing"));
        }

        try {
            String username = tokenProvider.getUsernameFromToken(refreshToken);
            User user = userRepository.findByUsername(username).orElseThrow(() -> new RuntimeException("User not found"));
            
            String newAccessToken = tokenProvider.generateToken(username);
            return ResponseEntity.ok(java.util.Collections.singletonMap("token", newAccessToken));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(java.util.Collections.singletonMap("error", "Invalid refresh token"));
        }
    }

    @PostMapping
    public ResponseEntity<UserResponseDTO> createUser(@Valid @RequestBody UserRequestDTO request) {
        return new ResponseEntity<>(userService.createUser(request), HttpStatus.CREATED);
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserResponseDTO> getUserById(@PathVariable String id) {
        return ResponseEntity.ok(userService.getUserById(id));
    }

    @GetMapping
    public ResponseEntity<List<UserResponseDTO>> getAllUsers() {
        return ResponseEntity.ok(userService.getAllUsers());
    }

    @PutMapping("/{id}")
    public ResponseEntity<UserResponseDTO> updateUser(@PathVariable String id, @Valid @RequestBody UserRequestDTO request) {
        return ResponseEntity.ok(userService.updateUser(id, request));
    }

    @PutMapping("/{id}/password")
    public ResponseEntity<java.util.Map<String, String>> changePassword(@PathVariable String id, @Valid @RequestBody com.quanlyduan.webxulyanh.demo.dto.request.ChangePasswordRequestDTO request) {
        userService.changePassword(id, request);
        return ResponseEntity.ok(java.util.Collections.singletonMap("message", "Đổi mật khẩu thành công"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable String id) {
        userService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me/activities")
    public ResponseEntity<java.util.List<com.quanlyduan.webxulyanh.demo.entity.ActivityLog>> getMyActivities(
            @org.springframework.web.bind.annotation.RequestParam(value = "limit", defaultValue = "50") int limit,
            java.security.Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        User user = userRepository.findByUsername(principal.getName()).orElse(null);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        return ResponseEntity.ok(activityLogService.recentForUser(user.getId(), limit));
    }

    @GetMapping("/me/usage")
    public ResponseEntity<java.util.Map<String, Object>> getCurrentUserUsage(java.security.Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        User user = userRepository.findByUsername(principal.getName()).orElse(null);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        java.util.List<MediaAsset> assets = mediaAssetRepository.findByUserIdAndDeleted(user.getId(), false);
        double totalMb = assets.stream()
                .map(MediaAsset::getFileSizeMb)
                .filter(java.util.Objects::nonNull)
                .mapToDouble(Double::doubleValue)
                .sum();
        java.util.Map<String, Object> result = new java.util.HashMap<>();
        result.put("assetCount", assets.size());
        result.put("storageMb", Math.round(totalMb * 100.0) / 100.0);

        // C5 — Include quota so the frontend can render a usage bar
        double quotaMb = 0;
        try {
            quotaMb = Double.parseDouble(systemSettingService.getSettingByKey("storage_quota_mb")
                    .map(s -> s.getSettingValue()).orElse("0"));
        } catch (NumberFormatException ignored) {}
        result.put("quotaMb", quotaMb);
        result.put("usagePercent", quotaMb > 0
                ? Math.round(totalMb / quotaMb * 1000.0) / 10.0  // 1 decimal
                : 0);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<java.util.Map<String, String>> forgotPassword(@RequestBody java.util.Map<String, String> body) {
        String email = body.get("email");
        if (email == null || email.trim().isEmpty()) {
            throw new RuntimeException("Email is required");
        }
        userService.initiatePasswordReset(email);
        java.util.Map<String, String> response = new java.util.HashMap<>();
        response.put("message", "Simulated email sent. Check server console logs.");
        
        User user = userRepository.findByEmail(email).orElse(null);
        if (user != null) {
            response.put("resetLink", "http://localhost:8081/reset-password?token=" + user.getResetToken());
        }
        
        return ResponseEntity.ok(response);
    }

    @PostMapping("/reset-password")
    public ResponseEntity<java.util.Map<String, String>> resetPassword(@RequestBody java.util.Map<String, String> body) {
        String token = body.get("token");
        String newPassword = body.get("newPassword");
        if (token == null || newPassword == null) {
            throw new RuntimeException("Token and newPassword are required");
        }
        userService.resetPassword(token, newPassword);
        java.util.Map<String, String> response = new java.util.HashMap<>();
        response.put("message", "Password has been reset successfully.");
        return ResponseEntity.ok(response);
    }
}

