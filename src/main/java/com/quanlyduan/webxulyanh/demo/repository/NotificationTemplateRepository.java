package com.quanlyduan.webxulyanh.demo.repository;

import com.quanlyduan.webxulyanh.demo.entity.NotificationTemplate;
import com.quanlyduan.webxulyanh.demo.enums.NotificationEvent;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface NotificationTemplateRepository extends MongoRepository<NotificationTemplate, String> {
    Optional<NotificationTemplate> findByEventAndActive(NotificationEvent event, boolean active);
    Optional<NotificationTemplate> findByEvent(NotificationEvent event);
}
