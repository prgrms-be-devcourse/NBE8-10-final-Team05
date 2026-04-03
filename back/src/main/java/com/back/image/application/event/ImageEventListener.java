package com.back.image.application.event;

import com.back.image.application.service.ImageService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ImageEventListener {

    private final ImageService imageService;

    @Async
    @EventListener
    public void handleImageDelete(ImageDeleteEvent event) {
        for (String url : event.imageUrls()) {
            imageService.delete(url);
        }
    }
}
