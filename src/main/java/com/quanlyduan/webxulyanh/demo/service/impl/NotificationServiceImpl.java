package com.quanlyduan.webxulyanh.demo.service.impl;

import com.quanlyduan.webxulyanh.demo.dto.request.NotificationRequestDTO;
import com.quanlyduan.webxulyanh.demo.entity.Notification;
import com.quanlyduan.webxulyanh.demo.entity.User;
import com.quanlyduan.webxulyanh.demo.enums.NotificationChannel;
import com.quanlyduan.webxulyanh.demo.enums.NotificationTrigger;
import com.quanlyduan.webxulyanh.demo.exception.ResourceNotFoundException;
import com.quanlyduan.webxulyanh.demo.repository.NotificationRepository;
import com.quanlyduan.webxulyanh.demo.repository.UserRepository;
import com.quanlyduan.webxulyanh.demo.service.EmailService;
import com.quanlyduan.webxulyanh.demo.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;
    private final TemplateEngine templateEngine;

    @Override
    public Notification createNotification(NotificationRequestDTO request) {
        Notification notification = Notification.builder()
                .userId(request.getUserId())
                .title(request.getTitle())
                .content(request.getContent())
                .channel(request.getChannel())
                .trigger(request.getTrigger())
                .scheduledTime(request.getScheduledTime())
                .sent(false)
                .isRead(false)
                .createdAt(LocalDateTime.now())
                .build();

        // Nếu trigger là ADMIN (gửi ngay lập tức), tiến hành gửi luôn
        if (notification.getTrigger() == NotificationTrigger.ADMIN) {
            notificationRepository.save(notification); // lưu trước để lấy ID
            sendNotification(notification);
        } else {
            // Đối với AUTOMATIC, chỉ lưu lại để Scheduler quét sau
            notificationRepository.save(notification);
            log.info("Đã lưu thông báo tự động (hẹn giờ gửi: {})", notification.getScheduledTime());
        }

        return notification;
    }

    @Override
    public List<Notification> getNotificationsForUser(String userId) {
        // Lấy thông báo gửi riêng cho User này (bao gồm cả các bản clone từ Broadcast "ALL")
        List<Notification> notifications = notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
        
        // Lọc chỉ lấy những thông báo đã gửi thành công và có cấu hình hiện PROFILE/BOTH
        return notifications.stream()
                .filter(n -> n.isSent() && (n.getChannel() == NotificationChannel.PROFILE || n.getChannel() == NotificationChannel.BOTH))
                .sorted((n1, n2) -> n2.getCreatedAt().compareTo(n1.getCreatedAt()))
                .toList();
    }

    @Override
    public void sendNotification(Notification notification) {
        log.info("Bắt đầu xử lý gửi thông báo ID: {}", notification.getId());
        
        boolean sendEmail = notification.getChannel() == NotificationChannel.EMAIL || notification.getChannel() == NotificationChannel.BOTH;
        boolean sendInApp = notification.getChannel() == NotificationChannel.PROFILE || notification.getChannel() == NotificationChannel.BOTH;
        
        List<User> allUsers = null;
        if ("ALL".equalsIgnoreCase(notification.getUserId())) {
            allUsers = userRepository.findAll();
        }

        if (sendEmail) {
            Context context = new Context();
            context.setVariable("title", notification.getTitle());
            context.setVariable("content", notification.getContent().replace("\n", "<br>"));
            String htmlContent = templateEngine.process("email/system-notification", context);

            if ("ALL".equalsIgnoreCase(notification.getUserId()) && allUsers != null) {
                log.info("Gửi email quảng bá tới {} người dùng.", allUsers.size());
                for (User user : allUsers) {
                    if (user.getEmail() != null && user.isEmailVerified()) {
                        emailService.sendHtmlEmail(user.getEmail(), notification.getTitle(), htmlContent);
                    }
                }
            } else {
                User user = userRepository.findById(notification.getUserId()).orElse(null);
                if (user != null && user.getEmail() != null) {
                    emailService.sendHtmlEmail(user.getEmail(), notification.getTitle(), htmlContent);
                } else {
                    log.warn("Không thể gửi email: Không tìm thấy người dùng hoặc thiếu email cho ID {}", notification.getUserId());
                }
            }
        }

        if ("ALL".equalsIgnoreCase(notification.getUserId()) && sendInApp && allUsers != null) {
            List<Notification> clones = new java.util.ArrayList<>();
            LocalDateTime now = LocalDateTime.now();
            for (User user : allUsers) {
                Notification clone = Notification.builder()
                        .userId(user.getId())
                        .title(notification.getTitle())
                        .content(notification.getContent())
                        .channel(notification.getChannel())
                        .trigger(notification.getTrigger())
                        .scheduledTime(notification.getScheduledTime())
                        .sent(true)
                        .isRead(false)
                        .createdAt(notification.getCreatedAt())
                        .sentAt(now)
                        .build();
                clones.add(clone);
            }
            notificationRepository.saveAll(clones);
            log.info("Đã tạo {} bản sao thông báo In-App cho toàn bộ người dùng.", clones.size());
            notificationRepository.delete(notification);
        } else {
            notification.setSent(true);
            notification.setSentAt(LocalDateTime.now());
            notificationRepository.save(notification);
            log.info("Đã gửi thành công thông báo ID: {}", notification.getId());
        }
    }

    @Override
    public void processScheduledNotifications() {
        // Tìm toàn bộ thông báo AUTOMATIC chưa gửi
        List<Notification> unsent = notificationRepository.findByTriggerAndSent(NotificationTrigger.AUTOMATIC, false);
        if (unsent.isEmpty()) return;

        // Định dạng thời gian hiện tại "HH:mm"
        String nowTimeStr = LocalTime.now().format(DateTimeFormatter.ofPattern("HH:mm"));
        log.debug("Scheduler quét thông báo tự động. Giờ hiện tại: {}", nowTimeStr);

        for (Notification notification : unsent) {
            if (nowTimeStr.equals(notification.getScheduledTime())) {
                log.info("Phát hiện thông báo tự động khớp giờ hẹn ({}): {}", notification.getScheduledTime(), notification.getTitle());
                try {
                    sendNotification(notification);
                } catch (Exception e) {
                    log.error("Lỗi khi xử lý gửi thông báo tự động ID {}: {}", notification.getId(), e.getMessage(), e);
                }
            }
        }
    }

    @Override
    public void markAsRead(String notificationId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông báo với ID: " + notificationId));
        notification.setRead(true);
        notificationRepository.save(notification);
    }
}
