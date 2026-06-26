package com.quanlyduan.webxulyanh.demo.service;

import com.quanlyduan.webxulyanh.demo.dto.request.UserRequestDTO;
import com.quanlyduan.webxulyanh.demo.entity.User;
import com.quanlyduan.webxulyanh.demo.repository.UserRepository;
import com.quanlyduan.webxulyanh.demo.security.JwtTokenProvider;
import com.quanlyduan.webxulyanh.demo.service.impl.UserServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtTokenProvider tokenProvider;

    @Mock
    private EmailService emailService;

    @Mock
    private com.quanlyduan.webxulyanh.demo.repository.NotificationRepository notificationRepository;

    @Mock
    private com.quanlyduan.webxulyanh.demo.service.NotificationTemplateService notificationTemplateService;

    @Mock
    private com.quanlyduan.webxulyanh.demo.repository.ProjectRepository projectRepository;

    @Mock
    private com.quanlyduan.webxulyanh.demo.repository.MediaFolderRepository mediaFolderRepository;

    @Mock
    private com.quanlyduan.webxulyanh.demo.repository.MediaAssetRepository mediaAssetRepository;

    @Mock
    private com.quanlyduan.webxulyanh.demo.service.StorageService storageService;

    @InjectMocks
    private UserServiceImpl userService;

    @Test
    void createUser_ShouldSaveUser_WhenValidRequest() {
        UserRequestDTO req = new UserRequestDTO();
        req.setUsername("testuser");
        req.setEmail("test@test.com");
        req.setPassword("password123");

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("test@test.com")).thenReturn(Optional.empty());
        when(passwordEncoder.encode(anyString())).thenReturn("hashed_password");
        
        User savedUser = new User();
        savedUser.setId("1");
        savedUser.setUsername("testuser");
        savedUser.setEmail("test@test.com");
        
        when(userRepository.save(any(User.class))).thenReturn(savedUser);

        var result = userService.createUser(req);

        assertNotNull(result);
        assertEquals("testuser", result.getUsername());
        verify(userRepository).save(any(User.class));
    }

    @Test
    void createUser_ShouldThrowException_WhenUsernameExists() {
        UserRequestDTO req = new UserRequestDTO();
        req.setUsername("testuser");
        req.setEmail("test@test.com");
        req.setPassword("password123");

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(new User()));

        assertThrows(RuntimeException.class, () -> userService.createUser(req));
        verify(userRepository, never()).save(any(User.class));
    }
}
