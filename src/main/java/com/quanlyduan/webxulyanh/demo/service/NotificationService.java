package com.quanlyduan.webxulyanh.demo.service;

import com.quanlyduan.webxulyanh.demo.dto.request.NotificationRequestDTO;
import com.quanlyduan.webxulyanh.demo.entity.Notification;

import java.util.List;

public interface NotificationService {
    Notification createNotification(NotificationRequestDTO request);
    List<Notification> getNotificationsForUser(String userId);
    void sendNotification(Notification notification);
    void processScheduledNotifications();
    void markAsRead(String notificationId);
}
