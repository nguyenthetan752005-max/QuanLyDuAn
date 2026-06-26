package com.quanlyduan.webxulyanh.demo.service;

import com.quanlyduan.webxulyanh.demo.dto.request.ActionCatalogRequestDTO;
import com.quanlyduan.webxulyanh.demo.dto.response.ActionCatalogResponseDTO;

import java.util.List;

public interface ActionCatalogService {
    ActionCatalogResponseDTO createActionCatalog(ActionCatalogRequestDTO request);
    ActionCatalogResponseDTO getActionCatalogById(String id);
    List<ActionCatalogResponseDTO> getAllActionCatalogs();
    ActionCatalogResponseDTO updateActionCatalog(String id, ActionCatalogRequestDTO request);
    void deleteActionCatalog(String id);
}
