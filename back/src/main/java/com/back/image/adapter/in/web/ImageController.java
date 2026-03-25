package com.back.image.adapter.in.web;

import com.back.global.rsData.RsData;
import com.back.image.application.service.ImageService;
import com.back.image.domain.Image;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.Map;


@RestController
@RequestMapping("/api/v1/images")
@RequiredArgsConstructor
public class ImageController {
    private final ImageService imageService;

    @PostMapping("/upload")
    public RsData<Map<String, String>> uploadFile(@RequestParam("image") MultipartFile file) {
        Image savedImage = imageService.upload(file, "DIARY");
        Map<String, String> data = new HashMap<>();
        data.put("imageUrl", savedImage.getAccessUrl());
        return new RsData<>("200-1", "업로드 성공", data);
    }
}
