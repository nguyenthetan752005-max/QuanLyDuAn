package com.quanlyduan.webxulyanh.demo.entity;

import com.quanlyduan.webxulyanh.demo.enums.ActionType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "action_catalogs")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ActionCatalog {
    @Id
    private String id;
    private String actionCode;
    private String actionName;
    private ActionType type;
    private Double baseRamMb;
    private boolean requiresGpu;
    private boolean isActive;
}
