package com.quanlyduan.webxulyanh.demo.repository;

import com.quanlyduan.webxulyanh.demo.entity.ProjectVersion;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProjectVersionRepository extends MongoRepository<ProjectVersion, String> {
    List<ProjectVersion> findByProjectIdOrderByCreatedAtDesc(String projectId);
    List<ProjectVersion> findByProjectIdOrderByCreatedAtAsc(String projectId);
    long countByProjectId(String projectId);
    void deleteByProjectId(String projectId);
}
