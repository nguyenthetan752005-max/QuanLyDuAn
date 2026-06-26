package com.quanlyduan.webxulyanh.demo.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.Map;

/** A saved snapshot of a project's content (FR07 / US14 — lịch sử thao tác). */
@Document(collection = "project_versions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProjectVersion {
    @Id
    private String id;

    @Indexed
    private String projectId;
    private String userId;
    private String label;

    private Map<String, Object> canvasData;
    private Map<String, Object> timelineData;

    private LocalDateTime createdAt;
}
