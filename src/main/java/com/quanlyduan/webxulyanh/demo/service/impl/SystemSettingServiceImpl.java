package com.quanlyduan.webxulyanh.demo.service.impl;

import com.quanlyduan.webxulyanh.demo.entity.SystemSetting;
import com.quanlyduan.webxulyanh.demo.exception.ResourceNotFoundException;
import com.quanlyduan.webxulyanh.demo.repository.SystemSettingRepository;
import com.quanlyduan.webxulyanh.demo.service.SystemSettingService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class SystemSettingServiceImpl implements SystemSettingService {

    private final SystemSettingRepository settingRepository;

    @Override
    public List<SystemSetting> getAllSettings() {
        return settingRepository.findAll();
    }

    @Override
    public Optional<SystemSetting> getSettingByKey(String key) {
        return settingRepository.findBySettingKey(key);
    }

    @Override
    public SystemSetting updateSetting(String key, String value) {
        SystemSetting setting = settingRepository.findBySettingKey(key)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy cài đặt hệ thống với khóa: " + key));
        setting.setSettingValue(value);
        setting.setUpdatedAt(LocalDateTime.now());
        return settingRepository.save(setting);
    }

    @Override
    public SystemSetting updateSettingDetails(String key, String value, String displayName, String description, String category) {
        SystemSetting setting = settingRepository.findBySettingKey(key)
                .orElseGet(() -> SystemSetting.builder().settingKey(key).build());
        
        setting.setSettingValue(value);
        if (displayName != null) setting.setDisplayName(displayName);
        if (description != null) setting.setDescription(description);
        if (category != null) setting.setCategory(category);
        setting.setUpdatedAt(LocalDateTime.now());
        
        return settingRepository.save(setting);
    }
}
