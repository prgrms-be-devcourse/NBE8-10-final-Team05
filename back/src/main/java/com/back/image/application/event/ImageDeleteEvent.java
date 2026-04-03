package com.back.image.application.event;

import java.util.List;

// com.back.image.application.event.ImageDeleteEvent.java
public record ImageDeleteEvent(List<String> imageUrls) {
}
