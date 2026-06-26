package com.quanlyduan.webxulyanh.demo.dto.request;

import com.quanlyduan.webxulyanh.demo.enums.NotificationChannel;
import com.quanlyduan.webxulyanh.demo.enums.NotificationTrigger;
import lombok.Data;

@Data
public class NotificationRequestDTO {
    private String userId; // Target user or "ALL"
    private String title;
    private String content;
    private NotificationChannel channel;
    private NotificationTrigger trigger;
    private String scheduledTime; // "HH:mm" (e.g., "14:15")
}
