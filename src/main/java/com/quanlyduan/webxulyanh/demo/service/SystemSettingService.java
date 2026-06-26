package com.quanlyduan.webxulyanh.demo.service;

import com.quanlyduan.webxulyanh.demo.entity.SystemSetting;
import java.util.List;
import java.util.Optional;

public interface SystemSettingService {
    List<SystemSetting> getAllSettings();
    Optional<SystemSetting> getSettingByKey(String key);
    SystemSetting updateSetting(String key, String value);
    SystemSetting updateSettingDetails(String key, String value, String displayName, String description, String category);
}
