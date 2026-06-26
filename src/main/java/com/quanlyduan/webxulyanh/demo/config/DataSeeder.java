package com.quanlyduan.webxulyanh.demo.config;

import com.quanlyduan.webxulyanh.demo.entity.ActionCatalog;
import com.quanlyduan.webxulyanh.demo.entity.SystemSetting;
import com.quanlyduan.webxulyanh.demo.enums.ActionType;
import com.quanlyduan.webxulyanh.demo.entity.NotificationTemplate;
import com.quanlyduan.webxulyanh.demo.enums.NotificationChannel;
import com.quanlyduan.webxulyanh.demo.enums.NotificationEvent;
import com.quanlyduan.webxulyanh.demo.entity.User;
import com.quanlyduan.webxulyanh.demo.repository.ActionCatalogRepository;
import com.quanlyduan.webxulyanh.demo.repository.NotificationTemplateRepository;
import com.quanlyduan.webxulyanh.demo.repository.SystemSettingRepository;
import com.quanlyduan.webxulyanh.demo.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.util.StreamUtils;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements CommandLineRunner {

    private final ActionCatalogRepository actionCatalogRepository;
    private final SystemSettingRepository systemSettingRepository;
    private final NotificationTemplateRepository notificationTemplateRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        // Seed a default ADMIN account if none exists (US11 — admin management)
        boolean hasAdmin = userRepository.findAll().stream()
                .anyMatch(u -> "ADMIN".equalsIgnoreCase(u.getRole()));
        if (!hasAdmin && userRepository.findByUsername("admin").isEmpty()) {
            User admin = User.builder()
                    .username("admin")
                    .email("admin@lily.local")
                    .passwordHash(passwordEncoder.encode("admin123"))
                    .role("ADMIN")
                    .emailVerified(true)
                    .createdAt(LocalDateTime.now())
                    .build();
            userRepository.save(admin);
            log.info("Seeded default ADMIN account: username='admin', password='admin123' (hãy đổi mật khẩu sau khi đăng nhập).");
        }

        if (actionCatalogRepository.count() == 0) {
            log.info("Seeding default action catalogs...");
            List<ActionCatalog> defaults = Arrays.asList(
                ActionCatalog.builder()
                    .actionCode("BLUR_GAUSSIAN")
                    .actionName("Làm mờ Gaussian (Gaussian Blur Server)")
                    .type(ActionType.IMAGE)
                    .baseRamMb(256.0)
                    .requiresGpu(false)
                    .isActive(true)
                    .build(),
                ActionCatalog.builder()
                    .actionCode("DETECT_EDGE")
                    .actionName("Phát hiện cạnh biên (Edge Detection Server)")
                    .type(ActionType.IMAGE)
                    .baseRamMb(128.0)
                    .requiresGpu(false)
                    .isActive(true)
                    .build(),
                ActionCatalog.builder()
                    .actionCode("SHARPEN")
                    .actionName("Làm sắc nét (Sharpen Server)")
                    .type(ActionType.IMAGE)
                    .baseRamMb(128.0)
                    .requiresGpu(false)
                    .isActive(true)
                    .build(),
                ActionCatalog.builder()
                    .actionCode("AI_REMOVE_BG")
                    .actionName("Tách nền bằng AI (AI Remove Background)")
                    .type(ActionType.IMAGE)
                    .baseRamMb(512.0)
                    .requiresGpu(true)
                    .isActive(true)
                    .build(),
                ActionCatalog.builder()
                    .actionCode("HISTOGRAM_EQUALIZATION")
                    .actionName("Cân bằng biểu đồ sáng (Histogram Equalization Server)")
                    .type(ActionType.IMAGE)
                    .baseRamMb(256.0)
                    .requiresGpu(false)
                    .isActive(true)
                    .build()
            );
            actionCatalogRepository.saveAll(defaults);
            log.info("Successfully seeded {} default action catalogs.", defaults.size());
        } else {
            log.info("Action catalogs already exist. Skipping seeding.");
        }

        if (systemSettingRepository.count() == 0) {
            log.info("Seeding default system settings...");
            List<SystemSetting> defaultSettings = Arrays.asList(
                SystemSetting.builder()
                    .settingKey("session_timeout_seconds")
                    .settingValue("3600")
                    .displayName("Thời gian hết hạn phiên (giây)")
                    .description("Thời gian tối đa trước khi phiên làm việc của người dùng hết hạn và bắt buộc đăng nhập lại.")
                    .category("SECURITY")
                    .build(),
                SystemSetting.builder()
                    .settingKey("max_file_size_mb")
                    .settingValue("50")
                    .displayName("Dung lượng tải lên tối đa (MB)")
                    .description("Giới hạn tối đa kích thước của một tệp tin hình ảnh/tài nguyên tải lên hệ thống.")
                    .category("UPLOAD")
                    .build(),
                SystemSetting.builder()
                    .settingKey("max_request_size_mb")
                    .settingValue("50")
                    .displayName("Dung lượng request tối đa (MB)")
                    .description("Giới hạn tối đa kích thước của toàn bộ gói request tải lên hệ thống.")
                    .category("UPLOAD")
                    .build(),
                SystemSetting.builder()
                    .settingKey("allow_user_registration")
                    .settingValue("true")
                    .displayName("Cho phép đăng ký mới")
                    .description("Bật hoặc tắt chức năng đăng ký tài khoản tự do trên hệ thống.")
                    .category("SYSTEM")
                    .build(),
                SystemSetting.builder()
                    .settingKey("trash_auto_delete_days")
                    .settingValue("30")
                    .displayName("Thời gian tự động dọn Thùng rác (ngày)")
                    .description("Số ngày lưu trữ tệp tin/thư mục/dự án trong Thùng rác trước khi bị tự động xóa vĩnh viễn khỏi hệ thống và ổ đĩa.")
                    .category("SYSTEM")
                    .build(),
                SystemSetting.builder()
                    .settingKey("trash_cleanup_cron")
                    .settingValue("0 0 2 * * *")
                    .displayName("Chu kỳ dọn dẹp Thùng rác (Cron)")
                    .description("Biểu thức Cron cấu hình thời gian chạy tự động quét và xóa sạch dữ liệu quá hạn trong thùng rác.")
                    .category("SYSTEM")
                    .build(),
                SystemSetting.builder()
                    .settingKey("max_social_download_duration_seconds")
                    .settingValue("600")
                    .displayName("Thời lượng tải video tối đa (giây)")
                    .description("Thời lượng tối đa của video được phép tải từ mạng xã hội về hệ thống.")
                    .category("SYSTEM")
                    .build()
            );
            systemSettingRepository.saveAll(defaultSettings);
            log.info("Successfully seeded {} default system settings.", defaultSettings.size());
        } else {
            log.info("System settings already exist. Skipping seeding.");
        }
        
        // Storage quota per user (C5) — default 500MB. Admins can change qua API system-settings.
        if (systemSettingRepository.findBySettingKey("storage_quota_mb").isEmpty()) {
            systemSettingRepository.save(SystemSetting.builder()
                .settingKey("storage_quota_mb")
                .settingValue("500")
                .displayName("Hạn mức lưu trữ mỗi người dùng (MB)")
                .description("Tổng dung lượng tối đa mỗi người dùng được lưu trữ tệp tin. Khi vượt quá, hệ thống sẽ chặn tải lên.")
                .category("UPLOAD")
                .build());
            log.info("Successfully seeded storage_quota_mb setting.");
        }

        if (systemSettingRepository.findBySettingKey("max_social_download_duration_seconds").isEmpty()) {
            systemSettingRepository.save(SystemSetting.builder()
                .settingKey("max_social_download_duration_seconds")
                .settingValue("600")
                .displayName("Thời lượng tải video tối đa (giây)")
                .description("Thời lượng tối đa của video được phép tải từ mạng xã hội về hệ thống.")
                .category("SYSTEM")
                .build());
            log.info("Successfully seeded max_social_download_duration_seconds setting.");
        }

        if (notificationTemplateRepository.count() == 0) {
            log.info("Seeding default notification templates from classpath HTML resources...");
            try {
                // 1. USER_REGISTERED (Xác thực đăng ký)
                String regContent = StreamUtils.copyToString(
                        new ClassPathResource("templates/email/user-registered.html").getInputStream(),
                        StandardCharsets.UTF_8
                );
                NotificationTemplate regTemplate = NotificationTemplate.builder()
                        .event(NotificationEvent.USER_REGISTERED)
                        .subject("Xác thực tài khoản Lily Image Editor")
                        .contentTemplate(regContent)
                        .channel(NotificationChannel.EMAIL)
                        .active(true)
                        .createdAt(LocalDateTime.now())
                        .updatedAt(LocalDateTime.now())
                        .build();

                // 2. USER_VERIFIED (Chào mừng kích hoạt thành công)
                String verifiedContent = StreamUtils.copyToString(
                        new ClassPathResource("templates/email/user-verified.html").getInputStream(),
                        StandardCharsets.UTF_8
                );
                NotificationTemplate verifiedTemplate = NotificationTemplate.builder()
                        .event(NotificationEvent.USER_VERIFIED)
                        .subject("Chúc mừng! Kích hoạt tài khoản thành công - Lily Image Editor")
                        .contentTemplate(verifiedContent)
                        .channel(NotificationChannel.BOTH)
                        .active(true)
                        .createdAt(LocalDateTime.now())
                        .updatedAt(LocalDateTime.now())
                        .build();

                // 3. PASSWORD_RESET (Đặt lại mật khẩu)
                String resetContent = StreamUtils.copyToString(
                        new ClassPathResource("templates/email/password-reset.html").getInputStream(),
                        StandardCharsets.UTF_8
                );
                NotificationTemplate resetTemplate = NotificationTemplate.builder()
                        .event(NotificationEvent.PASSWORD_RESET)
                        .subject("Yêu cầu đặt lại mật khẩu - Lily Image Editor")
                        .contentTemplate(resetContent)
                        .channel(NotificationChannel.EMAIL)
                        .active(true)
                        .createdAt(LocalDateTime.now())
                        .updatedAt(LocalDateTime.now())
                        .build();

                notificationTemplateRepository.saveAll(Arrays.asList(regTemplate, verifiedTemplate, resetTemplate));
                log.info("Successfully seeded default notification templates from HTML resources.");
            } catch (IOException e) {
                log.error("Failed to seed default notification templates: {}", e.getMessage(), e);
            }
        } else {
            log.info("Notification templates already exist. Skipping seeding.");
        }
    }
}
