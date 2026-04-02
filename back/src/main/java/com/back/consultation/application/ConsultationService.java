package com.back.consultation.application;

import com.back.consultation.application.port.out.*;
import com.back.consultation.domain.*;
import com.back.global.exception.ServiceException;
import com.back.member.domain.Member;
import com.back.member.domain.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ConsultationService {

    private final AiConsultationPort aiConsultationPort;
    private final ConsultationPersistencePort persistencePort;
    private final ConsultationSsePort ssePort;
    private final MemberRepository memberRepository;

    public SseEmitter subscribe(Long userId) {
        return ssePort.subscribe(userId);
    }

    @Transactional
    public void chat(Long userId, String userMessage) {
        // 상담방 찾기/생성
        Consultation consultation = persistencePort.findByMemberId(userId)
                .orElseGet(() -> {
                    Member member = memberRepository.findById(userId)
                            .orElseThrow(() -> new ServiceException("404-1", "회원을 찾을 수 없습니다."));
                    return persistencePort.save(Consultation.create(member));
                });

        // 사용자 질문 저장
        persistencePort.saveMessage(ChatMessage.create(consultation, MessageRole.USER, userMessage));

        // 문맥 파악을 위한 과거 이력 로드
        List<ChatMessage> history = persistencePort.findLastMessages(consultation.getId(), 10);

        StringBuilder fullResponse = new StringBuilder();
        try {
            aiConsultationPort.generateStreamingResponse(history, userMessage, chunk -> {
                fullResponse.append(chunk);
                ssePort.sendStreaming(userId, chunk);
            });

            // AI의 최종 답변 DB 저장
            persistencePort.saveMessage(ChatMessage.create(consultation, MessageRole.ASSISTANT, fullResponse.toString()));
            ssePort.sendCompleted(userId);
        } catch (RuntimeException exception) {
            ssePort.sendError(userId, "상담 응답 생성 중 오류가 발생했습니다.");
            throw exception;
        }
    }
}
