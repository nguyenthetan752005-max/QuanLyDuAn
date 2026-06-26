package com.quanlyduan.webxulyanh.demo.dto.request;

import com.quanlyduan.webxulyanh.demo.enums.NotificationChannel;
import com.quanlyduan.webxulyanh.demo.enums.NotificationEvent;
import lombok.Data;

@Data
public class NotificationTemplateRequestDTO {
    private NotificationEvent event;
    private String subject;
    private String contentTemplate;
    private NotificationChannel channel;
    private boolean active;
}
