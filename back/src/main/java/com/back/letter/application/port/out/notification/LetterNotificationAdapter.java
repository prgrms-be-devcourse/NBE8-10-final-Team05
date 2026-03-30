package com.back.letter.application.port.out.notification;

import com.back.letter.application.port.out.LetterNotificationPort;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class LetterNotificationAdapter implements LetterNotificationPort {
    private final Map<Long, SseEmitter> emitters = new ConcurrentHashMap<>();

    @Override
    public SseEmitter subscribe(Long memberId) {
        SseEmitter emitter = new SseEmitter(60L * 1000 * 60);

        try {
            emitter.send(SseEmitter.event()
                    .id(String.valueOf(System.currentTimeMillis()))
                    .name("connect")
                    .data("connected"));
        } catch (IOException e) {
            emitter.complete();
            return emitter;
        }

        // 콜백 설정 시 emitters에서 제거하는 로직 확인
        emitter.onCompletion(() -> emitters.remove(memberId));
        emitter.onTimeout(() -> {
            emitters.remove(memberId);
            emitter.complete();
        });
        emitter.onError((e) -> {
            emitters.remove(memberId);
            emitter.complete();
        });

        emitters.put(memberId, emitter);
        return emitter;
    }

    @Override
    public void sendNotification(Long receiverId, String eventName, Object data) {
        SseEmitter emitter = emitters.get(receiverId);
        if (emitter != null) {
            try {
                String dataString = (data instanceof String) ? (String) data : data.toString();

                emitter.send(SseEmitter.event()
                        .name(eventName)
                        .data(dataString));
            } catch (IOException | IllegalStateException e) {
                emitters.remove(receiverId);
                emitter.completeWithError(e);
                System.err.println("====> SSE 전송 실패로 인한 연결 종료: " + receiverId);
            }
        }
    }
}
