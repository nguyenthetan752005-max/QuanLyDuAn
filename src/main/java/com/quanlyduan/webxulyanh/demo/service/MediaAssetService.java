package com.quanlyduan.webxulyanh.demo.service;

import com.quanlyduan.webxulyanh.demo.dto.request.MediaAssetRequestDTO;
import com.quanlyduan.webxulyanh.demo.dto.response.MediaAssetResponseDTO;

import java.util.List;

public interface MediaAssetService {
    MediaAssetResponseDTO createMediaAsset(MediaAssetRequestDTO request);
    MediaAssetResponseDTO getMediaAssetById(String id);
    List<MediaAssetResponseDTO> getAllMediaAssets();
    MediaAssetResponseDTO updateMediaAsset(String id, String userId, MediaAssetRequestDTO request);
    void deleteMediaAsset(String id, String userId);
    
    void softDeleteMediaAsset(String id, String userId);
    void restoreMediaAsset(String id, String userId);
    void deleteMediaAssetPermanently(String id, String userId);
    List<MediaAssetResponseDTO> getActiveMediaAssets(String userId, String folderId);
    org.springframework.data.domain.Page<MediaAssetResponseDTO> getActiveMediaAssets(String userId, String folderId, String search, org.springframework.data.domain.Pageable pageable);
    List<MediaAssetResponseDTO> getDeletedMediaAssets(String userId);
    org.springframework.data.domain.Page<MediaAssetResponseDTO> getDeletedMediaAssets(String userId, String search, org.springframework.data.domain.Pageable pageable);
    List<java.util.Map<String, String>> getMediaAssetUsage(String id, String userId);
    MediaAssetResponseDTO extractAudio(String assetId, String folderId, String userId);
}
