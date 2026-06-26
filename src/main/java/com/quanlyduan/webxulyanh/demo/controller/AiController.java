package com.quanlyduan.webxulyanh.demo.controller;

import com.quanlyduan.webxulyanh.demo.service.AiService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@RestController
@RequestMapping("/api/editor/ai")
public class AiController {

    @Autowired
    private AiService aiService;

    @PostMapping(value = "/remove-bg", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<byte[]> removeBackground(@RequestParam("image") MultipartFile file) {
        try {
            byte[] processedImage = aiService.removeBackground(file);
            return ResponseEntity.ok().contentType(MediaType.IMAGE_PNG).body(processedImage);
        } catch (IOException e) {
            return ResponseEntity.internalServerError().build();
        } catch (RuntimeException e) {
            return ResponseEntity.status(502).build(); // Bad Gateway if worker fails
        }
    }

    @PostMapping(value = "/detect-faces", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> detectFaces(@RequestParam("image") MultipartFile file) {
        try {
            String facesJson = aiService.detectFaces(file);
            return ResponseEntity.ok(facesJson);
        } catch (IOException e) {
            return ResponseEntity.internalServerError().body("{\"error\": \"IO Exception\"}");
        } catch (RuntimeException e) {
            return ResponseEntity.status(502).body("{\"error\": \"Worker failed\"}");
        }
    }
}
