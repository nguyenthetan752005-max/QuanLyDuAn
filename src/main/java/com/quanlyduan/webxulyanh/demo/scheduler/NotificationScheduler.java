package com.quanlyduan.webxulyanh.demo.scheduler;

import com.quanlyduan.webxulyanh.demo.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class NotificationScheduler {

    private final NotificationService notificationService;

    // Chạy mỗi phút (giây số 0) để quét các thông báo tự động chưa gửi
    @Scheduled(cron = "0 * * * * *")
    public void runScheduledNotifications() {
        log.debug("Bắt đầu quét hàng đợi thông báo tự động (Scheduled)...");
        notificationService.processScheduledNotifications();
    }
}
