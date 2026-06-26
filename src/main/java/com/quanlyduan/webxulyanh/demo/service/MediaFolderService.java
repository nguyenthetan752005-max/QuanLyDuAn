package com.quanlyduan.webxulyanh.demo.service;

import com.quanlyduan.webxulyanh.demo.entity.MediaFolder;
import java.util.List;

public interface MediaFolderService {
    MediaFolder createFolder(String userId, String name, String parentId);
    MediaFolder renameFolder(String id, String userId, String newName);
    MediaFolder moveFolder(String id, String userId, String targetParentId);
    void softDeleteFolder(String id, String userId);
    void restoreFolder(String id, String userId);
    void deleteFolderPermanently(String id, String userId);
    List<MediaFolder> getActiveFolders(String userId);
    List<MediaFolder> getDeletedFolders(String userId);
}
