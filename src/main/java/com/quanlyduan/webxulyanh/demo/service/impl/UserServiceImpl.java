package com.quanlyduan.webxulyanh.demo.service.impl;

import com.quanlyduan.webxulyanh.demo.dto.request.ChangePasswordRequestDTO;
import com.quanlyduan.webxulyanh.demo.dto.request.UserRequestDTO;
import com.quanlyduan.webxulyanh.demo.dto.response.LoginResponseDTO;
import com.quanlyduan.webxulyanh.demo.dto.response.UserResponseDTO;
import com.quanlyduan.webxulyanh.demo.entity.User;
import com.quanlyduan.webxulyanh.demo.enums.AuthProvider;
import com.quanlyduan.webxulyanh.demo.exception.ResourceNotFoundException;
import com.quanlyduan.webxulyanh.demo.entity.Notification;
import com.quanlyduan.webxulyanh.demo.enums.NotificationChannel;
import com.quanlyduan.webxulyanh.demo.enums.NotificationTrigger;
import com.quanlyduan.webxulyanh.demo.enums.NotificationEvent;
import com.quanlyduan.webxulyanh.demo.service.NotificationTemplateService;
import com.quanlyduan.webxulyanh.demo.repository.NotificationRepository;
import com.quanlyduan.webxulyanh.demo.entity.MediaAsset;
import com.quanlyduan.webxulyanh.demo.entity.Project;
import com.quanlyduan.webxulyanh.demo.entity.MediaFolder;
import com.quanlyduan.webxulyanh.demo.repository.ProjectRepository;
import com.quanlyduan.webxulyanh.demo.repository.MediaFolderRepository;
import com.quanlyduan.webxulyanh.demo.repository.MediaAssetRepository;
import com.quanlyduan.webxulyanh.demo.service.StorageService;
import com.quanlyduan.webxulyanh.demo.repository.UserRepository;
import com.quanlyduan.webxulyanh.demo.security.JwtTokenProvider;
import com.quanlyduan.webxulyanh.demo.service.EmailService;
import com.quanlyduan.webxulyanh.demo.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;
    private final EmailService emailService;
    private final NotificationRepository notificationRepository;
    private final NotificationTemplateService notificationTemplateService;
    private final ProjectRepository projectRepository;
    private final MediaFolderRepository mediaFolderRepository;
    private final MediaAssetRepository mediaAssetRepository;
    private final StorageService storageService;

    @Value("${google.client-id:}")
    private String googleClientId;

    @Override
    public UserResponseDTO createUser(UserRequestDTO request) {
        if (userRepository.findByUsername(request.getUsername()).isPresent()) {
            throw new RuntimeException("Username already exists: " + request.getUsername());
        }
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new RuntimeException("Email already exists: " + request.getEmail());
        }

        String token = UUID.randomUUID().toString();
        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .provider(AuthProvider.LOCAL)
                .emailVerified(false)
                .verificationToken(token)
                .verificationTokenExpiry(LocalDateTime.now().plusHours(24))
                .build();
        User savedUser = userRepository.save(user);

        // Trigger template-based email confirmation
        Map<String, String> placeholders = new HashMap<>();
        placeholders.put("username", savedUser.getUsername());
        placeholders.put("verification_link", "http://localhost:8081/confirm-email?token=" + token);
        notificationTemplateService.triggerNotification(NotificationEvent.USER_REGISTERED, placeholders, null, savedUser.getEmail());

        return mapToResponse(savedUser);
    }

    @Override
    public UserResponseDTO getUserById(String id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
        return mapToResponse(user);
    }

    @Override
    public List<UserResponseDTO> getAllUsers() {
        return userRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public UserResponseDTO updateUser(String id, UserRequestDTO request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));

        if (!user.getUsername().equals(request.getUsername()) && userRepository.findByUsername(request.getUsername()).isPresent()) {
            throw new RuntimeException("Username already exists: " + request.getUsername());
        }
        
        if (!user.getEmail().equals(request.getEmail()) && userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new RuntimeException("Email already exists: " + request.getEmail());
        }

        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        if (request.getPassword() != null && !request.getPassword().isEmpty()) {
            user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        }
        User updatedUser = userRepository.save(user);
        return mapToResponse(updatedUser);
    }

    @Override
    public void changePassword(String id, ChangePasswordRequestDTO request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new RuntimeException("Mật khẩu hiện tại không chính xác.");
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }

    @Override
    public void deleteUser(String id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));

        // 1. Delete physical files from StorageService
        List<MediaAsset> userAssets = mediaAssetRepository.findByUserId(id);
        for (MediaAsset asset : userAssets) {
            try {
                if (asset.getFilePath() != null && asset.getFilePath().contains("/")) {
                    String fileName = asset.getFilePath().substring(asset.getFilePath().lastIndexOf("/") + 1);
                    storageService.delete(fileName);
                }
            } catch (Exception e) {
                // Ignore delete errors for individual files to ensure we can still delete the user
            }
        }
        
        // 2. Delete all records from DB
        mediaAssetRepository.deleteAll(userAssets);
        
        List<Project> userProjects = projectRepository.findByUserId(id);
        projectRepository.deleteAll(userProjects);
        
        // We don't have findByUserId in MediaFolderRepository but we can just use findAll and filter, or add the query method.
        // Actually, MediaFolderRepository might not have findByUserId, let's use findAll and filter for now to avoid compiling errors if we forget to add it.
        List<MediaFolder> userFolders = mediaFolderRepository.findAll().stream()
                .filter(f -> id.equals(f.getUserId()))
                .collect(Collectors.toList());
        mediaFolderRepository.deleteAll(userFolders);

        List<Notification> userNotifications = notificationRepository.findByUserIdOrderByCreatedAtDesc(id);
        notificationRepository.deleteAll(userNotifications);

        // 3. Delete the user
        userRepository.delete(user);
    }

    @Override
    public LoginResponseDTO loginOrRegisterGoogleUser(String idToken) {
        // Verify Google token with Google api
        Map<String, Object> tokenInfo = verifyGoogleToken(idToken);
        
        String sub = (String) tokenInfo.get("sub");
        String email = (String) tokenInfo.get("email");
        String name = (String) tokenInfo.get("name");

        if (email == null) {
            throw new RuntimeException("Google token does not contain email");
        }

        // Find or create user
        User user = userRepository.findByEmail(email)
                .map(existingUser -> {
                    boolean updated = false;
                    if (existingUser.getProvider() != AuthProvider.GOOGLE) {
                        existingUser.setProvider(AuthProvider.GOOGLE);
                        existingUser.setProviderId(sub);
                        updated = true;
                    }
                    if (!existingUser.isEmailVerified()) {
                        existingUser.setEmailVerified(true);
                        updated = true;
                    }
                    if (updated) {
                        return userRepository.save(existingUser);
                    }
                    return existingUser;
                })
                .orElseGet(() -> {
                    // Create new Google User
                    User newUser = User.builder()
                            .username(email) // Fallback to email as username for uniqueness
                            .email(email)
                            .passwordHash(null)
                            .provider(AuthProvider.GOOGLE)
                            .providerId(sub)
                            .createdAt(LocalDateTime.now())
                            .emailVerified(true)
                            .build();
                    return userRepository.save(newUser);
                });

        // Generate our JWT token
        String jwtToken = tokenProvider.generateToken(user.getUsername());

        return LoginResponseDTO.builder()
                .token(jwtToken)
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .role(user.getRole())
                .build();
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> verifyGoogleToken(String idToken) {
        try {
            RestTemplate restTemplate = new RestTemplate();
            String url = "https://oauth2.googleapis.com/tokeninfo?id_token=" + idToken;
            Map<String, Object> response = restTemplate.getForObject(url, Map.class);
            if (response == null || !response.containsKey("sub")) {
                throw new RuntimeException("Invalid Google ID Token");
            }

            String aud = (String) response.get("aud");
            if (aud == null || !aud.equals(googleClientId)) {
                throw new RuntimeException("Google token audience mismatch");
            }

            String iss = (String) response.get("iss");
            if (iss == null || !(iss.equals("https://accounts.google.com") || iss.equals("accounts.google.com"))) {
                throw new RuntimeException("Google token issuer invalid");
            }

            Object emailVerified = response.get("email_verified");
            if (emailVerified == null || !("true".equals(emailVerified) || Boolean.TRUE.equals(emailVerified))) {
                throw new RuntimeException("Google email not verified");
            }

            return response;
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Google ID Token verification failed: " + e.getMessage(), e);
        }
    }

    private UserResponseDTO mapToResponse(User user) {
        UserResponseDTO response = new UserResponseDTO();
        response.setId(user.getId());
        response.setUsername(user.getUsername());
        response.setEmail(user.getEmail());
        response.setRole(user.getRole());
        response.setCreatedAt(user.getCreatedAt());
        return response;
    }

    @Override
    public void initiatePasswordReset(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng với email: " + email));

        // Generate reset token and set 1 hour expiry
        String token = UUID.randomUUID().toString();
        user.setResetToken(token);
        user.setResetTokenExpiry(LocalDateTime.now().plusHours(1));
        userRepository.save(user);

        // Trigger template-based password reset email
        Map<String, String> placeholders = new HashMap<>();
        placeholders.put("username", user.getUsername());
        placeholders.put("reset_link", "http://localhost:8081/reset-password?token=" + token);
        notificationTemplateService.triggerNotification(NotificationEvent.PASSWORD_RESET, placeholders, null, user.getEmail());
    }

    @Override
    public void resetPassword(String token, String newPassword) {
        User user = userRepository.findByResetToken(token)
                .orElseThrow(() -> new RuntimeException("Invalid or expired reset token"));

        if (user.getResetTokenExpiry() == null || user.getResetTokenExpiry().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Reset token has expired");
        }

        // Update password and clear reset token info
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setResetToken(null);
        user.setResetTokenExpiry(null);
        userRepository.save(user);
    }

    @Override
    public void verifyEmail(String token) {
        User user = userRepository.findByVerificationToken(token)
                .orElseThrow(() -> new RuntimeException("Mã xác thực không hợp lệ hoặc đã qua sử dụng."));

        if (user.getVerificationTokenExpiry() == null || user.getVerificationTokenExpiry().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Mã xác thực đã hết hạn.");
        }

        user.setEmailVerified(true);
        user.setVerificationToken(null);
        user.setVerificationTokenExpiry(null);
        User savedUser = userRepository.save(user);

        // Trigger template-based welcome email & profile notification
        Map<String, String> placeholders = new HashMap<>();
        placeholders.put("username", savedUser.getUsername());
        notificationTemplateService.triggerNotification(NotificationEvent.USER_VERIFIED, placeholders, savedUser.getId(), savedUser.getEmail());
    }
}
