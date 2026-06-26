package com.quanlyduan.webxulyanh.demo.service;

import com.quanlyduan.webxulyanh.demo.dto.request.SocialImportRequest;
import com.quanlyduan.webxulyanh.demo.dto.request.WorkerCallbackRequest;
import com.quanlyduan.webxulyanh.demo.entity.AsyncTask;

public interface WorkerService {
    AsyncTask submitSocialImportJob(String userId, String projectId, SocialImportRequest request);
    void handleWorkerCallback(WorkerCallbackRequest callback);
}
