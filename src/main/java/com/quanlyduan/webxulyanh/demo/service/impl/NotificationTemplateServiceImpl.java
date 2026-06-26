package com.quanlyduan.webxulyanh.demo.service.impl;

import com.quanlyduan.webxulyanh.demo.dto.request.NotificationTemplateRequestDTO;
import com.quanlyduan.webxulyanh.demo.entity.Notification;
import com.quanlyduan.webxulyanh.demo.entity.NotificationTemplate;
import com.quanlyduan.webxulyanh.demo.enums.NotificationChannel;
import com.quanlyduan.webxulyanh.demo.enums.NotificationEvent;
import com.quanlyduan.webxulyanh.demo.enums.NotificationTrigger;
import com.quanlyduan.webxulyanh.demo.repository.NotificationRepository;
import com.quanlyduan.webxulyanh.demo.repository.NotificationTemplateRepository;
import com.quanlyduan.webxulyanh.demo.service.EmailService;
import com.quanlyduan.webxulyanh.demo.service.NotificationTemplateService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationTemplateServiceImpl implements NotificationTemplateService {

    private final NotificationTemplateRepository templateRepository;
    private final NotificationRepository notificationRepository;
    private final EmailService emailService;

    @Override
    public NotificationTemplate createOrUpdateTemplate(NotificationTemplateRequestDTO dto) {
        Optional<NotificationTemplate> existing = templateRepository.findByEvent(dto.getEvent());
        NotificationTemplate template;
        if (existing.isPresent()) {
            template = existing.get();
            template.setSubject(dto.getSubject());
            template.setContentTemplate(dto.getContentTemplate());
            template.setChannel(dto.getChannel());
            template.setActive(dto.isActive());
            template.setUpdatedAt(LocalDateTime.now());
            log.info("Updating existing notification template for event: {}", dto.getEvent());
        } else {
            template = NotificationTemplate.builder()
                    .event(dto.getEvent())
                    .subject(dto.getSubject())
                    .contentTemplate(dto.getContentTemplate())
                    .channel(dto.getChannel())
                    .active(dto.isActive())
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .build();
            log.info("Creating new notification template for event: {}", dto.getEvent());
        }
        return templateRepository.save(template);
    }

    @Override
    public List<NotificationTemplate> getAllTemplates() {
        return templateRepository.findAll();
    }

    @Override
    public Optional<NotificationTemplate> getTemplateByEvent(NotificationEvent event) {
        return templateRepository.findByEvent(event);
    }

    @Override
    public void triggerNotification(NotificationEvent event, Map<String, String> placeholders, String targetUserId, String targetEmail) {
        log.info("Triggering event notification for: {}", event);
        Optional<NotificationTemplate> optTemplate = templateRepository.findByEventAndActive(event, true);
        if (optTemplate.isEmpty()) {
            log.warn("No active notification template found for event: {}. Notification will not be sent.", event);
            return;
        }

        NotificationTemplate template = optTemplate.get();
        String subject = template.getSubject();
        String content = template.getContentTemplate();

        // Compile template by replacing placeholders (e.g. {{username}})
        for (Map.Entry<String, String> entry : placeholders.entrySet()) {
            String placeholder = "{|" + entry.getKey() + "|}"; // Handle both standard and alternative formatting
            String stdPlaceholder = "{{" + entry.getKey() + "}}";
            String value = entry.getValue() != null ? entry.getValue() : "";
            
            subject = subject.replace(placeholder, value).replace(stdPlaceholder, value);
            content = content.replace(placeholder, value).replace(stdPlaceholder, value);
        }

        boolean sendEmail = template.getChannel() == NotificationChannel.EMAIL || template.getChannel() == NotificationChannel.BOTH;
        boolean sendProfile = template.getChannel() == NotificationChannel.PROFILE || template.getChannel() == NotificationChannel.BOTH;

        // 1. Send Email
        if (sendEmail && targetEmail != null && !targetEmail.isEmpty()) {
            try {
                emailService.sendHtmlEmail(targetEmail, subject, content);
                log.info("Successfully sent event-triggered email to {} for event {}", targetEmail, event);
            } catch (Exception e) {
                log.error("Failed to send event-triggered email to {}: {}", targetEmail, e.getMessage(), e);
            }
        }

        // 2. Save In-App Profile Notification
        if (sendProfile && targetUserId != null && !targetUserId.isEmpty()) {
            try {
                // Strip HTML tags for clean display inside user notification panel list
                String plainTextContent = content.replaceAll("<[^>]*>", "")
                        .replaceAll("&nbsp;", " ")
                        .replaceAll("\\s+", " ")
                        .trim();
                
                Notification notification = Notification.builder()
                        .userId(targetUserId)
                        .title(subject)
                        .content(plainTextContent)
                        .channel(NotificationChannel.PROFILE)
                        .trigger(NotificationTrigger.AUTOMATIC)
                        .sent(true)
                        .sentAt(LocalDateTime.now())
                        .isRead(false)
                        .createdAt(LocalDateTime.now())
                        .build();
                
                notificationRepository.save(notification);
                log.info("Successfully saved event-triggered profile notification for user {} on event {}", targetUserId, event);
            } catch (Exception e) {
                log.error("Failed to save event-triggered profile notification for user {}: {}", targetUserId, e.getMessage(), e);
            }
        }
    }
}
