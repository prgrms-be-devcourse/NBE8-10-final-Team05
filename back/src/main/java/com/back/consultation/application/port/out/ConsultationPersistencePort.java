package com.back.consultation.application.port.out;

import com.back.consultation.domain.ChatMessage;
import com.back.consultation.domain.Consultation;
import java.util.List;
import java.util.Optional;

public interface ConsultationPersistencePort {
    Consultation save(Consultation consultation);
    Optional<Consultation> findByMemberId(Long memberId);
    void saveMessage(ChatMessage message);
    List<ChatMessage> findLastMessages(Long consultationId, int limit);
}