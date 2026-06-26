package com.quanlyduan.webxulyanh.demo.repository;

import com.quanlyduan.webxulyanh.demo.entity.Project;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ProjectRepository extends MongoRepository<Project, String> {
    List<Project> findByUserId(String userId);
    List<Project> findByUserIdAndDeleted(String userId, boolean deleted);
    
    org.springframework.data.domain.Page<Project> findByUserIdAndDeleted(String userId, boolean deleted, org.springframework.data.domain.Pageable pageable);
    
    @org.springframework.data.mongodb.repository.Query("{ 'userId': ?0, 'deleted': ?1, 'projectName': { $regex: ?2, $options: 'i' } }")
    org.springframework.data.domain.Page<Project> findByUserIdAndDeletedAndProjectNameRegex(String userId, boolean deleted, String search, org.springframework.data.domain.Pageable pageable);
}
