package com.back.image.application.service;

import com.back.image.domain.Image;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface ImageService {
    Image upload(MultipartFile file, String refType);
    void delete(String fileUrl);
    void confirmUsage(List<String> imageUrls, String refType, Long refId);
}
