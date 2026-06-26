package com.quanlyduan.webxulyanh.demo;

import com.quanlyduan.webxulyanh.demo.service.StorageService;
// import com.quanlyduan.webxulyanh.demo.service.impl.ImageKitStorageServiceImpl;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;

@SpringBootTest
class DemoApplicationTests {

    @Autowired
    private StorageService storageService;

    @Test
    void contextLoads() {
        Assertions.assertNotNull(storageService);
    }

    @Autowired
    private com.quanlyduan.webxulyanh.demo.repository.ProjectRepository projectRepository;

    @Test
    void printProjects() {
        projectRepository.findAll().forEach(p -> {
            System.out.println("PROJECT_EXPORT_TEST - Project ID: " + p.getId());
            System.out.println("PROJECT_EXPORT_TEST - Project Name: " + p.getProjectName());
            System.out.println("PROJECT_EXPORT_TEST - Canvas Data: " + p.getCanvasData());
        });
    }

    /*
    @Test
    void testLocalStorageFallback() {
        StorageService localService = org.mockito.Mockito.mock(StorageService.class);
        org.mockito.Mockito.when(localService.store(org.mockito.Mockito.any())).thenReturn("local-fallback-uuid.png");
        ImageKitStorageServiceImpl imageKitService = new ImageKitStorageServiceImpl(localService);
        
        org.springframework.test.util.ReflectionTestUtils.setField(imageKitService, "publicKey", "");
        org.springframework.test.util.ReflectionTestUtils.setField(imageKitService, "privateKey", "");
        org.springframework.test.util.ReflectionTestUtils.setField(imageKitService, "urlEndpoint", "");
        
        MockMultipartFile file = new MockMultipartFile(
                "file", 
                "test-fallback.png", 
                "image/png", 
                "test image content".getBytes()
        );
        
        String filename = imageKitService.store(file);
        
        Assertions.assertEquals("local-fallback-uuid.png", filename);
        org.mockito.Mockito.verify(localService, org.mockito.Mockito.times(1)).store(file);
    }
    */

    @Test
    void testAutowiredStorageServiceBehavior() {
        MockMultipartFile file = new MockMultipartFile(
                "file", 
                "test-autowired.png", 
                "image/png", 
                "test image content".getBytes()
        );
        
        String filename = storageService.store(file);
        Assertions.assertNotNull(filename);
        System.out.println("Autowired StorageService stored output: " + filename);
    }

    /*
    @Test
    void testImageKitUploadSuccess() throws Exception {
        StorageService localService = org.mockito.Mockito.mock(StorageService.class);
        ImageKitStorageServiceImpl imageKitService = new ImageKitStorageServiceImpl(localService);
        
        org.springframework.test.util.ReflectionTestUtils.setField(imageKitService, "publicKey", "pub_test");
        org.springframework.test.util.ReflectionTestUtils.setField(imageKitService, "privateKey", "priv_test");
        org.springframework.test.util.ReflectionTestUtils.setField(imageKitService, "urlEndpoint", "https://ik.imagekit.io/test/");
        
        org.springframework.web.client.RestTemplate mockRestTemplate = org.mockito.Mockito.mock(org.springframework.web.client.RestTemplate.class);
        org.springframework.test.util.ReflectionTestUtils.setField(imageKitService, "restTemplate", mockRestTemplate);
        
        java.util.Map<String, Object> mockResponse = new java.util.HashMap<>();
        mockResponse.put("url", "https://ik.imagekit.io/test/test-image.png");
        
        org.springframework.http.ResponseEntity<java.util.Map> responseEntity = new org.springframework.http.ResponseEntity<>(
                mockResponse, 
                org.springframework.http.HttpStatus.OK
        );
        
        org.mockito.Mockito.when(mockRestTemplate.postForEntity(
                org.mockito.Mockito.eq("https://upload.imagekit.io/api/v1/files/upload"),
                org.mockito.Mockito.any(org.springframework.http.HttpEntity.class),
                org.mockito.Mockito.eq(java.util.Map.class)
        )).thenReturn(responseEntity);
        
        MockMultipartFile file = new MockMultipartFile(
                "file", 
                "test-image.png", 
                "image/png", 
                "test image content".getBytes()
        );
        
        String url = imageKitService.store(file);
        
        Assertions.assertEquals("https://ik.imagekit.io/test/test-image.png", url);
        org.mockito.Mockito.verify(localService, org.mockito.Mockito.never()).store(org.mockito.Mockito.any());
    }

    @Test
    void testImageKitUploadFailureFallback() throws Exception {
        StorageService localService = org.mockito.Mockito.mock(StorageService.class);
        ImageKitStorageServiceImpl imageKitService = new ImageKitStorageServiceImpl(localService);
        
        org.springframework.test.util.ReflectionTestUtils.setField(imageKitService, "publicKey", "pub_test");
        org.springframework.test.util.ReflectionTestUtils.setField(imageKitService, "privateKey", "priv_test");
        org.springframework.test.util.ReflectionTestUtils.setField(imageKitService, "urlEndpoint", "https://ik.imagekit.io/test/");
        
        org.springframework.web.client.RestTemplate mockRestTemplate = org.mockito.Mockito.mock(org.springframework.web.client.RestTemplate.class);
        org.springframework.test.util.ReflectionTestUtils.setField(imageKitService, "restTemplate", mockRestTemplate);
        
        org.mockito.Mockito.when(mockRestTemplate.postForEntity(
                org.mockito.Mockito.eq("https://upload.imagekit.io/api/v1/files/upload"),
                org.mockito.Mockito.any(org.springframework.http.HttpEntity.class),
                org.mockito.Mockito.eq(java.util.Map.class)
        )).thenThrow(new org.springframework.web.client.RestClientException("API error"));
        
        org.mockito.Mockito.when(localService.store(org.mockito.Mockito.any())).thenReturn("fallback-uuid.png");
        
        MockMultipartFile file = new MockMultipartFile(
                "file", 
                "test-image.png", 
                "image/png", 
                "test image content".getBytes()
        );
        
        String url = imageKitService.store(file);
        
        Assertions.assertEquals("fallback-uuid.png", url);
        org.mockito.Mockito.verify(localService, org.mockito.Mockito.times(1)).store(file);
    }
    */
}
