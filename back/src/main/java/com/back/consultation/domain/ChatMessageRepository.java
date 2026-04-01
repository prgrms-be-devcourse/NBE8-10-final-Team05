package com.back.consultation.domain;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    // 특정 상담방의 최신 메시지 N개를 가져옴
    List<ChatMessage> findTop10ByConsultationIdOrderByCreateDateDesc(Long consultationId);
}