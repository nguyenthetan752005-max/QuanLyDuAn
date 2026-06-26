package com.quanlyduan.webxulyanh.demo.repository;

import com.quanlyduan.webxulyanh.demo.entity.MediaFolder;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface MediaFolderRepository extends MongoRepository<MediaFolder, String> {
    List<MediaFolder> findByUserIdAndDeleted(String userId, boolean deleted);
    List<MediaFolder> findByUserIdAndParentIdAndDeleted(String userId, String parentId, boolean deleted);
    List<MediaFolder> findByParentIdIn(List<String> parentIds);
}
