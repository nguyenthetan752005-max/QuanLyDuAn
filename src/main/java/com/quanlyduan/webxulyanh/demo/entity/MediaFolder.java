package com.quanlyduan.webxulyanh.demo.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "media_folders")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MediaFolder {
    @Id
    private String id;
    
    @Indexed
    private String userId;
    
    @Indexed
    private String name;
    
    private String parentId; // null nếu ở thư mục gốc
    
    private boolean deleted; // Đánh dấu xóa mềm
    private LocalDateTime deletedAt;
    
    @CreatedDate
    private LocalDateTime createdAt;
    
    @LastModifiedDate
    private LocalDateTime updatedAt;
}
