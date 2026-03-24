package com.back.diary.service;

import org.springframework.web.multipart.MultipartFile;

public interface ImageService {
    String upload(MultipartFile file);
    void delete(String fileUrl);
}
