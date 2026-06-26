package com.quanlyduan.webxulyanh.demo.service;

import com.quanlyduan.webxulyanh.demo.entity.ActivityLog;
import com.quanlyduan.webxulyanh.demo.repository.ActivityLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

/** Centralised helper for writing &amp; reading activity rows (C7). */
@Service
@RequiredArgsConstructor
@Slf4j
public class ActivityLogService {

    private final ActivityLogRepository repo;

    /** Fire-and-forget log entry. Failures are swallowed so a logging error never breaks the caller. */
    public void log(String userId, String action, String description, String targetId) {
        if (userId == null) return;
        try {
            repo.save(ActivityLog.builder()
                    .userId(userId)
                    .action(action)
                    .description(description)
                    .targetId(targetId)
                    .createdAt(LocalDateTime.now())
                    .build());
        } catch (Exception e) {
            log.warn("Failed to write activity log: {}", e.getMessage());
        }
    }

    public List<ActivityLog> recentForUser(String userId, int limit) {
        return repo.findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(0, Math.max(1, Math.min(200, limit))));
    }
}
