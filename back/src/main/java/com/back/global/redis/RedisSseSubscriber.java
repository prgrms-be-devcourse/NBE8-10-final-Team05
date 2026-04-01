package com.back.global.redis;

import com.back.consultation.adapter.out.sse.ConsultationSseAdapter;
import com.back.notification.adapter.out.sse.SseAdapter;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Slf4j
@Component
@RequiredArgsConstructor
public class RedisSseSubscriber implements MessageListener {
    private final ObjectMapper objectMapper;
    private final SseAdapter sseAdapter;
    private final ConsultationSseAdapter consultationSseAdapter;

    @Override
    public void onMessage(Message message, byte[] pattern) {
        try {
            RedisSseMessage sseMessage = objectMapper.readValue(message.getBody(), RedisSseMessage.class);

            if ("NOTIFICATION".equals(sseMessage.type())) {
                sseAdapter.sendToLocal(sseMessage.userId(), sseMessage.eventName(), sseMessage.data());
            } else if ("CONSULTATION".equals(sseMessage.type())) {
                consultationSseAdapter.sendToLocal(sseMessage.userId(), sseMessage.eventName(), sseMessage.data());
            }
        } catch (IOException e) {
            log.error("Redis 메시지 파싱 중 에러가 발생했습니다: {}", e.getMessage());
        }
    }
}