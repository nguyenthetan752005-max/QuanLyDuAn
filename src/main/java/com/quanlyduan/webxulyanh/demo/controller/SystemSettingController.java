package com.quanlyduan.webxulyanh.demo.controller;

import com.quanlyduan.webxulyanh.demo.entity.SystemSetting;
import com.quanlyduan.webxulyanh.demo.service.SystemSettingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/system-settings")
@RequiredArgsConstructor
public class SystemSettingController {

    private final SystemSettingService settingService;

    @GetMapping
    public ResponseEntity<List<SystemSetting>> getAllSettings() {
        return ResponseEntity.ok(settingService.getAllSettings());
    }

    @GetMapping("/{key}")
    public ResponseEntity<SystemSetting> getSettingByKey(@PathVariable String key) {
        return settingService.getSettingByKey(key)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PutMapping("/{key}")
    public ResponseEntity<SystemSetting> updateSetting(@PathVariable String key, @RequestBody Map<String, String> body) {
        String value = body.get("value");
        if (value == null) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(settingService.updateSetting(key, value));
    }
}
