package com.quanlyduan.webxulyanh.demo.service;

import com.quanlyduan.webxulyanh.demo.dto.request.NotificationTemplateRequestDTO;
import com.quanlyduan.webxulyanh.demo.entity.NotificationTemplate;
import com.quanlyduan.webxulyanh.demo.enums.NotificationEvent;

import java.util.List;
import java.util.Map;
import java.util.Optional;

public interface NotificationTemplateService {
    NotificationTemplate createOrUpdateTemplate(NotificationTemplateRequestDTO dto);
    List<NotificationTemplate> getAllTemplates();
    Optional<NotificationTemplate> getTemplateByEvent(NotificationEvent event);
    void triggerNotification(NotificationEvent event, Map<String, String> placeholders, String targetUserId, String targetEmail);
}
