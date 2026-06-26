package com.quanlyduan.webxulyanh.demo.service.impl;

import com.quanlyduan.webxulyanh.demo.dto.request.ActionCatalogRequestDTO;
import com.quanlyduan.webxulyanh.demo.dto.response.ActionCatalogResponseDTO;
import com.quanlyduan.webxulyanh.demo.entity.ActionCatalog;
import com.quanlyduan.webxulyanh.demo.exception.ResourceNotFoundException;
import com.quanlyduan.webxulyanh.demo.repository.ActionCatalogRepository;
import com.quanlyduan.webxulyanh.demo.service.ActionCatalogService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ActionCatalogServiceImpl implements ActionCatalogService {

    private final ActionCatalogRepository actionCatalogRepository;

    @Override
    public ActionCatalogResponseDTO createActionCatalog(ActionCatalogRequestDTO request) {
        ActionCatalog catalog = ActionCatalog.builder()
                .actionCode(request.getActionCode())
                .actionName(request.getActionName())
                .type(request.getType())
                .baseRamMb(request.getBaseRamMb())
                .requiresGpu(request.isRequiresGpu())
                .isActive(request.isActive())
                .build();
        ActionCatalog saved = actionCatalogRepository.save(catalog);
        return mapToResponse(saved);
    }

    @Override
    public ActionCatalogResponseDTO getActionCatalogById(String id) {
        ActionCatalog catalog = actionCatalogRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ActionCatalog not found with id: " + id));
        return mapToResponse(catalog);
    }

    @Override
    public List<ActionCatalogResponseDTO> getAllActionCatalogs() {
        return actionCatalogRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public ActionCatalogResponseDTO updateActionCatalog(String id, ActionCatalogRequestDTO request) {
        ActionCatalog catalog = actionCatalogRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ActionCatalog not found with id: " + id));
        catalog.setActionCode(request.getActionCode());
        catalog.setActionName(request.getActionName());
        catalog.setType(request.getType());
        catalog.setBaseRamMb(request.getBaseRamMb());
        catalog.setRequiresGpu(request.isRequiresGpu());
        catalog.setActive(request.isActive());
        ActionCatalog updated = actionCatalogRepository.save(catalog);
        return mapToResponse(updated);
    }

    @Override
    public void deleteActionCatalog(String id) {
        ActionCatalog catalog = actionCatalogRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ActionCatalog not found with id: " + id));
        actionCatalogRepository.delete(catalog);
    }

    private ActionCatalogResponseDTO mapToResponse(ActionCatalog catalog) {
        ActionCatalogResponseDTO response = new ActionCatalogResponseDTO();
        response.setId(catalog.getId());
        response.setActionCode(catalog.getActionCode());
        response.setActionName(catalog.getActionName());
        response.setType(catalog.getType());
        response.setBaseRamMb(catalog.getBaseRamMb());
        response.setRequiresGpu(catalog.isRequiresGpu());
        response.setActive(catalog.isActive());
        return response;
    }
}
