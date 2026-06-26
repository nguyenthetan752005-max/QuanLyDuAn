package com.quanlyduan.webxulyanh.demo.enums;

public enum NotificationEvent {
    USER_REGISTERED,      // Email containing verification token/link sent right after registration
    USER_VERIFIED,        // Welcome email & in-app profile notification sent after successful activation
    PASSWORD_RESET        // Password reset link email
}
