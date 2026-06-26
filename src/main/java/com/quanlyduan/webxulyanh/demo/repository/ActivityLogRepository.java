package com.quanlyduan.webxulyanh.demo.repository;

import com.quanlyduan.webxulyanh.demo.entity.ActivityLog;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ActivityLogRepository extends MongoRepository<ActivityLog, String> {
    List<ActivityLog> findByUserIdOrderByCreatedAtDesc(String userId, Pageable pageable);
}
