package com.quanlyduan.webxulyanh.demo.repository;

import com.quanlyduan.webxulyanh.demo.entity.AsyncTask;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AsyncTaskRepository extends MongoRepository<AsyncTask, String> {
    List<AsyncTask> findByUserIdAndProjectId(String userId, String projectId);
    List<AsyncTask> findByStatus(String status);
}
