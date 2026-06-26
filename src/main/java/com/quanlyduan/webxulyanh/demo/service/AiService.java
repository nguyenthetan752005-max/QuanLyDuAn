package com.quanlyduan.webxulyanh.demo.service;

import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@Service
public class AiService {

    private final String WORKER_URL = "http://localhost:8000/api/worker";
    private final RestTemplate restTemplate;

    public AiService() {
        this.restTemplate = new RestTemplate();
    }

    public byte[] removeBackground(MultipartFile file) throws IOException {
        String url = WORKER_URL + "/remove-bg";
        return sendFileToWorker(url, file, byte[].class);
    }

    public String detectFaces(MultipartFile file) throws IOException {
        String url = WORKER_URL + "/detect-faces";
        return sendFileToWorker(url, file, String.class);
    }

    private <T> T sendFileToWorker(String url, MultipartFile file, Class<T> responseType) throws IOException {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("image", new ByteArrayResource(file.getBytes()) {
            @Override
            public String getFilename() {
                return file.getOriginalFilename() != null ? file.getOriginalFilename() : "image.jpg";
            }
        });

        HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);
        ResponseEntity<T> response = restTemplate.postForEntity(url, requestEntity, responseType);
        
        if (response.getStatusCode().is2xxSuccessful()) {
            return response.getBody();
        } else {
            throw new RuntimeException("AI Worker processing failed with status: " + response.getStatusCode());
        }
    }
}
