package com.back.image.adapter.in.web;

import com.back.global.rsData.RsData;
import com.back.image.adapter.in.web.docs.ImageApiDocs;
import com.back.image.adapter.in.web.dto.ImageUploadResponse;
import com.back.image.application.service.ImageService;
import com.back.image.domain.Image;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;


@RestController
@RequestMapping("/api/v1/images")
@RequiredArgsConstructor
public class ImageController implements ImageApiDocs {
    private final ImageService imageService;

    @PostMapping("/upload")
    public RsData<ImageUploadResponse> uploadFile(@RequestParam("image") MultipartFile file) {
        Image savedImage = imageService.upload(file, "DIARY");
        ImageUploadResponse data = new ImageUploadResponse(savedImage.getAccessUrl());
        return new RsData<>("200-1", "업로드 성공", data);
    }

    @DeleteMapping
    public RsData<Void> deleteFile(@RequestParam("url") String url) {
        imageService.delete(url);
        return new RsData<>("200-1", "이미지 삭제 성공", null);
    }
}
