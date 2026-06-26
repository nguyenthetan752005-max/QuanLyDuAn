package com.quanlyduan.webxulyanh.demo.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "system_settings")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SystemSetting {
    @Id
    private String id;

    @Indexed(unique = true)
    private String settingKey;

    private String settingValue;
    private String displayName;
    private String description;
    private String category;

    @LastModifiedDate
    private LocalDateTime updatedAt;
}
