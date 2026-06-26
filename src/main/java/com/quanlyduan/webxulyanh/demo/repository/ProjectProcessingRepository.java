package com.quanlyduan.webxulyanh.demo.repository;

import com.quanlyduan.webxulyanh.demo.entity.ProjectProcessing;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface ProjectProcessingRepository extends MongoRepository<ProjectProcessing, String> {
    List<ProjectProcessing> findByProjectId(String projectId);
    Optional<ProjectProcessing> findTopByProjectIdOrderByCreatedAtDesc(String projectId);
}
