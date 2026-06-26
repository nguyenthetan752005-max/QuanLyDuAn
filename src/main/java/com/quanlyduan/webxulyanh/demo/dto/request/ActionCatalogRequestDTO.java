package com.quanlyduan.webxulyanh.demo.dto.request;

import com.quanlyduan.webxulyanh.demo.enums.ActionType;
import lombok.Data;

@Data
public class ActionCatalogRequestDTO {
    private String actionCode;
    private String actionName;
    private ActionType type;
    private Double baseRamMb;
    private boolean requiresGpu;
    private boolean isActive;
}
