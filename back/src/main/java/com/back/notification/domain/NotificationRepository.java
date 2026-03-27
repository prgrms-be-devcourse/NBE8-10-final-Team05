package com.back.notification.domain;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    // 읽지 않은 알림 목록을 최신순으로 가져오기
    List<Notification> findByReceiverIdOrderByCreateDateDesc(Long receiverId);
}