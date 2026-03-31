package com.back.consultation.application.port.out;

import com.back.consultation.domain.ChatMessage;
import java.util.List;
import java.util.function.Consumer;

public interface AiConsultationPort {
    void generateStreamingResponse(List<ChatMessage> history, String userMessage, Consumer<String> onNext);
}