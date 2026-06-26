package com.quanlyduan.webxulyanh.demo.dto.request;

import lombok.Data;
import jakarta.validation.constraints.NotBlank;

@Data
public class SocialImportRequest {
    @NotBlank(message = "URL không được để trống")
    private String url;
    
    private String folderId;
}
