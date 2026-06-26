package com.quanlyduan.webxulyanh.demo.controller;

import com.quanlyduan.webxulyanh.demo.entity.MediaFolder;
import com.quanlyduan.webxulyanh.demo.entity.User;
import com.quanlyduan.webxulyanh.demo.repository.UserRepository;
import com.quanlyduan.webxulyanh.demo.service.MediaFolderService;
import com.quanlyduan.webxulyanh.demo.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/media-folders")
@RequiredArgsConstructor
public class MediaFolderController {

    private final MediaFolderService mediaFolderService;
    private final UserRepository userRepository;

    @PostMapping
    public ResponseEntity<MediaFolder> createFolder(
            @RequestBody Map<String, String> body,
            Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        User user = getCurrentUser(principal);
        String name = body.get("name");
        String parentId = body.get("parentId");
        if (name == null || name.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        
        // Convert empty string or "root" to null parentId
        if (parentId == null || parentId.trim().isEmpty() || "root".equalsIgnoreCase(parentId)) {
            parentId = null;
        }

        MediaFolder folder = mediaFolderService.createFolder(user.getId(), name, parentId);
        return new ResponseEntity<>(folder, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<MediaFolder>> getFolders(
            @RequestParam(value = "isDeleted", defaultValue = "false") boolean isDeleted,
            Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        User user = getCurrentUser(principal);
        List<MediaFolder> folders = isDeleted 
                ? mediaFolderService.getDeletedFolders(user.getId()) 
                : mediaFolderService.getActiveFolders(user.getId());
        return ResponseEntity.ok(folders);
    }

    @PutMapping("/{id}")
    public ResponseEntity<MediaFolder> updateFolder(
            @PathVariable String id,
            @RequestBody Map<String, String> body,
            Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        User user = getCurrentUser(principal);
        
        String name = body.get("name");
        String parentId = body.get("parentId");

        MediaFolder folder = null;
        if (name != null && !name.trim().isEmpty()) {
            folder = mediaFolderService.renameFolder(id, user.getId(), name);
        }
        if (body.containsKey("parentId")) {
            if (parentId == null || parentId.trim().isEmpty() || "root".equalsIgnoreCase(parentId)) {
                parentId = null;
            }
            folder = mediaFolderService.moveFolder(id, user.getId(), parentId);
        }

        if (folder == null) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(folder);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> softDeleteFolder(@PathVariable String id, Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        User user = getCurrentUser(principal);
        mediaFolderService.softDeleteFolder(id, user.getId());
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/restore")
    public ResponseEntity<Void> restoreFolder(@PathVariable String id, Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        User user = getCurrentUser(principal);
        mediaFolderService.restoreFolder(id, user.getId());
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}/permanent")
    public ResponseEntity<Void> deleteFolderPermanently(@PathVariable String id, Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        User user = getCurrentUser(principal);
        mediaFolderService.deleteFolderPermanently(id, user.getId());
        return ResponseEntity.noContent().build();
    }

    private User getCurrentUser(Principal principal) {
        return userRepository.findByUsername(principal.getName())
                .orElseGet(() -> userRepository.findByEmail(principal.getName())
                        .orElseThrow(() -> new ResourceNotFoundException("User not found")));
    }
}
