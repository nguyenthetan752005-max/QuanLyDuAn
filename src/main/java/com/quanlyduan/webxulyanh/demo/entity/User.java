package com.quanlyduan.webxulyanh.demo.entity;

import com.quanlyduan.webxulyanh.demo.enums.AuthProvider;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "users")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User {
    @Id
    private String id;
    
    @Indexed(unique = true)
    private String username;
    
    @Indexed(unique = true)
    private String email;
    private String passwordHash;
    
    @Builder.Default
    private AuthProvider provider = AuthProvider.LOCAL;
    private String providerId;

    // Authorization role: "USER" (default) or "ADMIN"
    @Builder.Default
    private String role = "USER";
    
    @CreatedDate
    private LocalDateTime createdAt;
    
    @Builder.Default
    private boolean emailVerified = false;
    private String verificationToken;
    private LocalDateTime verificationTokenExpiry;

    private String resetToken;
    private LocalDateTime resetTokenExpiry;
}
