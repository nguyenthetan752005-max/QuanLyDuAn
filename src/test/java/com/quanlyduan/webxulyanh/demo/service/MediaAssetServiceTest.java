package com.quanlyduan.webxulyanh.demo.service;

import com.quanlyduan.webxulyanh.demo.entity.MediaAsset;
import com.quanlyduan.webxulyanh.demo.repository.MediaAssetRepository;
import com.quanlyduan.webxulyanh.demo.service.impl.MediaAssetServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class MediaAssetServiceTest {

    @Mock
    private MediaAssetRepository mediaAssetRepository;

    @Mock
    private StorageService storageService;

    @Mock
    private com.quanlyduan.webxulyanh.demo.service.ActivityLogService activityLogService;

    @InjectMocks
    private MediaAssetServiceImpl mediaAssetService;

    @Test
    void uploadAsset_ShouldSaveAsset() throws Exception {
        MultipartFile file = new MockMultipartFile("file", "test.jpg", "image/jpeg", "test data".getBytes());

        when(storageService.store(any(MultipartFile.class))).thenReturn("uploaded-test.jpg");

        MediaAsset asset = new MediaAsset();
        asset.setId("asset1");
        asset.setFileName("test.jpg");
        asset.setFilePath("uploaded-test.jpg");

        when(mediaAssetRepository.save(any(MediaAsset.class))).thenReturn(asset);

        var result = mediaAssetService.uploadAsset(file, "user1", null);

        assertNotNull(result);
        assertEquals("test.jpg", result.getFileName());
        verify(storageService).store(any(MultipartFile.class));
        verify(mediaAssetRepository).save(any(MediaAsset.class));
    }
}
