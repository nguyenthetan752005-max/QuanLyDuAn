package com.quanlyduan.webxulyanh.demo.service.impl;

import com.quanlyduan.webxulyanh.demo.service.EmailService;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EmailServiceImpl implements EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailServiceImpl.class);
    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Value("${app.mail.from-name:Lily Image Editor}")
    private String fromName;

    @Override
    @Async
    public void sendHtmlEmail(String to, String subject, String content) {
        log.info("Bắt đầu gửi email tới {} với tiêu đề: '{}' bất đồng bộ", to, subject);
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            
            // Cấu hình email gửi đi kèm tên hiển thị tùy chọn (display name)
            if (fromEmail != null && !fromEmail.isEmpty()) {
                helper.setFrom(fromEmail, fromName);
            }
            
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(content, true);
            mailSender.send(message);
            log.info("Gửi email tới {} thành công", to);
        } catch (Exception e) {
            log.error("Gửi email tới {} thất bại: {}", to, e.getMessage(), e);
            // In ra console log dự phòng để phục vụ mục đích kiểm thử
            System.err.println("EMAIL ERROR: Gửi email tới " + to + " thất bại. Nội dung email là:");
            System.err.println(content);
        }
    }
}
