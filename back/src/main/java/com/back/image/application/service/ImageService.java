package com.back.image.application.service;

import com.back.image.domain.Image;
import java.util.List;
import org.springframework.web.multipart.MultipartFile;

public interface ImageService {
    Image upload(MultipartFile file, String refType);
    void delete(String fileUrl);
    void confirmUsage(List<String> imageUrls, String refType, Long refId);
}
