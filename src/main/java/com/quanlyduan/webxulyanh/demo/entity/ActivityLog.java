package com.quanlyduan.webxulyanh.demo.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

/** Lightweight per-user activity log (C7). One row per significant action. */
@Document(collection = "activity_logs")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ActivityLog {
    @Id
    private String id;

    @Indexed
    private String userId;

    /** Stable machine code: PROJECT_CREATE, PROJECT_DELETE, ASSET_UPLOAD, ASSET_DELETE, LOGIN, etc. */
    private String action;

    /** Human-readable Vietnamese description shown to the user. */
    private String description;

    /** Optional id of the affected entity (project/asset/...) — useful for future linking. */
    private String targetId;

    private LocalDateTime createdAt;
}
