package com.quanlyduan.webxulyanh.demo.repository;

import com.quanlyduan.webxulyanh.demo.entity.MediaAsset;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface MediaAssetRepository extends MongoRepository<MediaAsset, String> {
    List<MediaAsset> findByUserId(String userId);
    List<MediaAsset> findByUserIdAndDeleted(String userId, boolean deleted);
    List<MediaAsset> findByUserIdAndFolderIdAndDeleted(String userId, String folderId, boolean deleted);
    List<MediaAsset> findByFolderIdIn(List<String> folderIds);

    org.springframework.data.domain.Page<MediaAsset> findByUserIdAndDeleted(String userId, boolean deleted, org.springframework.data.domain.Pageable pageable);

    @org.springframework.data.mongodb.repository.Query("{ 'userId': ?0, 'deleted': ?1, 'fileName': { $regex: ?2, $options: 'i' } }")
    org.springframework.data.domain.Page<MediaAsset> findByUserIdAndDeletedAndFileNameRegex(String userId, boolean deleted, String search, org.springframework.data.domain.Pageable pageable);

    org.springframework.data.domain.Page<MediaAsset> findByUserIdAndFolderIdAndDeleted(String userId, String folderId, boolean deleted, org.springframework.data.domain.Pageable pageable);

    @org.springframework.data.mongodb.repository.Query("{ 'userId': ?0, 'folderId': ?1, 'deleted': ?2, 'fileName': { $regex: ?3, $options: 'i' } }")
    org.springframework.data.domain.Page<MediaAsset> findByUserIdAndFolderIdAndDeletedAndFileNameRegex(String userId, String folderId, boolean deleted, String search, org.springframework.data.domain.Pageable pageable);
}
