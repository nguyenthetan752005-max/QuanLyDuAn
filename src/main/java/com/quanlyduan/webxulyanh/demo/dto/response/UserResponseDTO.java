package com.quanlyduan.webxulyanh.demo.dto.response;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class UserResponseDTO {
    private String id;
    private String username;
    private String email;
    private String role;
    private LocalDateTime createdAt;
}
