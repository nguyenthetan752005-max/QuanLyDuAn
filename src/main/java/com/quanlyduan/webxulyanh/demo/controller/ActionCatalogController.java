package com.quanlyduan.webxulyanh.demo.controller;

import com.quanlyduan.webxulyanh.demo.dto.request.ActionCatalogRequestDTO;
import com.quanlyduan.webxulyanh.demo.dto.response.ActionCatalogResponseDTO;
import com.quanlyduan.webxulyanh.demo.service.ActionCatalogService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping({"/api/v1/actions", "/api/v1/action-catalogs"})
@RequiredArgsConstructor
public class ActionCatalogController {

    private final ActionCatalogService actionCatalogService;

    @PostMapping
    public ResponseEntity<ActionCatalogResponseDTO> createActionCatalog(@RequestBody ActionCatalogRequestDTO request) {
        return new ResponseEntity<>(actionCatalogService.createActionCatalog(request), HttpStatus.CREATED);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ActionCatalogResponseDTO> getActionCatalogById(@PathVariable String id) {
        return ResponseEntity.ok(actionCatalogService.getActionCatalogById(id));
    }

    @GetMapping
    public ResponseEntity<List<ActionCatalogResponseDTO>> getAllActionCatalogs() {
        return ResponseEntity.ok(actionCatalogService.getAllActionCatalogs());
    }

    @PutMapping("/{id}")
    public ResponseEntity<ActionCatalogResponseDTO> updateActionCatalog(@PathVariable String id, @RequestBody ActionCatalogRequestDTO request) {
        return ResponseEntity.ok(actionCatalogService.updateActionCatalog(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteActionCatalog(@PathVariable String id) {
        actionCatalogService.deleteActionCatalog(id);
        return ResponseEntity.noContent().build();
    }
}
