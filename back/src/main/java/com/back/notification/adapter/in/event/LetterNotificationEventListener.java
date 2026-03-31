package com.back.notification.adapter.in.event;

import com.back.global.event.LetterNotificationEvent;
import com.back.notification.application.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class LetterNotificationEventListener {

    private final NotificationService notificationService;

    @EventListener
    public void handleLetterNotification(LetterNotificationEvent event) {
        notificationService.send(
                event.receiverId(),
                event.eventName(),
                event.content()
        );
    }
}
