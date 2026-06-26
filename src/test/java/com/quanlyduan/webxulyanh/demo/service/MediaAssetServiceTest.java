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
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class MediaAssetServiceTest {

    @Mock
    private MediaAssetRepository mediaAssetRepository;

    @Mock
    private com.quanlyduan.webxulyanh.demo.repository.MediaFolderRepository mediaFolderRepository;

    @Mock
    private com.quanlyduan.webxulyanh.demo.repository.ProjectRepository projectRepository;

    @Mock
    private StorageService storageService;

    @Mock
    private com.quanlyduan.webxulyanh.demo.service.SystemSettingService systemSettingService;

    @InjectMocks
    private MediaAssetServiceImpl mediaAssetService;

    @Test
    void createMediaAsset_ShouldSaveAsset() {
        com.quanlyduan.webxulyanh.demo.dto.request.MediaAssetRequestDTO req = new com.quanlyduan.webxulyanh.demo.dto.request.MediaAssetRequestDTO();
        req.setFileName("test.jpg");
        req.setUserId("user1");
        req.setFolderId("root");
        req.setFilePath("/uploads/test.jpg");
        req.setType(com.quanlyduan.webxulyanh.demo.enums.MediaType.IMAGE);
        
        MediaAsset asset = new MediaAsset();
        asset.setId("asset1");
        asset.setFileName("test.jpg");
        asset.setFilePath("/uploads/test.jpg");
        
        when(mediaAssetRepository.findByUserIdAndFolderIdAndDeleted(anyString(), any(), anyBoolean())).thenReturn(java.util.Collections.emptyList());
        when(mediaAssetRepository.save(any(MediaAsset.class))).thenReturn(asset);

        var result = mediaAssetService.createMediaAsset(req);

        assertNotNull(result);
        assertEquals("test.jpg", result.getFileName());
        verify(mediaAssetRepository).save(any(MediaAsset.class));
    }
}
