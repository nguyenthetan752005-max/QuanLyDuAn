package com.quanlyduan.webxulyanh.demo.entity;

import com.quanlyduan.webxulyanh.demo.enums.NotificationChannel;
import com.quanlyduan.webxulyanh.demo.enums.NotificationTrigger;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "notifications")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Notification {
    @Id
    private String id;

    @Indexed
    private String userId; // Target user (can be "ALL" for all users)

    private String title;
    private String content;

    private NotificationChannel channel;
    private NotificationTrigger trigger;

    private String scheduledTime; // format: "HH:mm" (e.g., "08:30")
    
    @Builder.Default
    private boolean sent = false;
    
    @Builder.Default
    private boolean isRead = false;

    @CreatedDate
    private LocalDateTime createdAt;
    
    private LocalDateTime sentAt;
}
