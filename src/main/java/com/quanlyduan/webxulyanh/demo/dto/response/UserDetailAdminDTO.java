package com.quanlyduan.webxulyanh.demo.dto.response;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class UserDetailAdminDTO {
    private String id;
    private String username;
    private String email;
    private String role;
    private LocalDateTime createdAt;
    private long totalProjects;
    private double totalStorageMb;
}
