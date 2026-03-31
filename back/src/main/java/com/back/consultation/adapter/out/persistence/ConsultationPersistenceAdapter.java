package com.back.consultation.adapter.out.persistence;

import com.back.consultation.application.port.out.ConsultationPersistencePort;
import com.back.consultation.domain.ChatMessage;
import com.back.consultation.domain.ChatMessageRepository;
import com.back.consultation.domain.Consultation;
import com.back.consultation.domain.ConsultationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class ConsultationPersistenceAdapter implements ConsultationPersistencePort {
    private final ConsultationRepository consultationRepository;
    private final ChatMessageRepository chatMessageRepository;

    @Override
    public Consultation save(Consultation consultation) {
        return consultationRepository.save(consultation);
    }

    @Override
    public Optional<Consultation> findByMemberId(Long memberId) {
        return consultationRepository.findByMemberId(memberId);
    }

    @Override
    public void saveMessage(ChatMessage message) {
        chatMessageRepository.save(message); //
    }

    @Override
    public List<ChatMessage> findLastMessages(Long consultationId, int limit) {
        // 과거 메시지를 역순으로 가져와 다시 정렬
        List<ChatMessage> messages = chatMessageRepository.findTop10ByConsultationIdOrderByCreateDateDesc(consultationId);
        Collections.reverse(messages);
        return messages;
    }
}