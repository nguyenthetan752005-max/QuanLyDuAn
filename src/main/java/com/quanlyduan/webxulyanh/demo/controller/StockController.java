package com.quanlyduan.webxulyanh.demo.controller;

import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

@RestController
@RequestMapping("/api/stock")
public class StockController {

    @org.springframework.beans.factory.annotation.Value("${unsplash.access-key}")
    private String UNSPLASH_ACCESS_KEY;

    private final String UNSPLASH_API_URL = "https://api.unsplash.com/search/photos";
    private final RestTemplate restTemplate;

    public StockController() {
        this.restTemplate = new RestTemplate();
    }

    @GetMapping("/search")
    public ResponseEntity<String> searchStockImages(
            @RequestParam("q") String query,
            @RequestParam(value = "page", defaultValue = "1") int page,
            @RequestParam(value = "per_page", defaultValue = "20") int perPage) {

        if (UNSPLASH_ACCESS_KEY == null || UNSPLASH_ACCESS_KEY.trim().isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("{\"error\": \"Unsplash API Key is not configured. Please add it to StockController.java\"}");
        }

        String url = String.format("%s?query=%s&page=%d&per_page=%d",
                UNSPLASH_API_URL, query, page, perPage);

        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Client-ID " + UNSPLASH_ACCESS_KEY);

        HttpEntity<String> entity = new HttpEntity<>("parameters", headers);

        try {
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
            return ResponseEntity.status(response.getStatusCode()).body(response.getBody());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("{\"error\": \"Failed to fetch from Unsplash: " + e.getMessage() + "\"}");
        }
    }
}
