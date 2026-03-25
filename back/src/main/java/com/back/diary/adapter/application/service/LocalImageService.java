package com.back.diary.adapter.application.service;

import com.back.global.exception.ServiceException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

@Service
@Primary
public class LocalImageService implements ImageService {

    @Value("${custom.file.upload-dir}")
    private String uploadDir;

    @Override
    public String upload(MultipartFile file) {
        if (file == null || file.isEmpty()) return null;

        String fileName = UUID.randomUUID() + "_" + file.getOriginalFilename();
        Path filePath = Paths.get(uploadDir, fileName);

        try {
            // 폴더가 없으면 생성
            Files.createDirectories(filePath.getParent());
            // 파일 저장
            Files.write(filePath, file.getBytes());
        } catch (IOException e) {
            throw new ServiceException("500-1", "로컬 파일 저장 중 오류가 발생했습니다.");
        }
        return "/gen/" + fileName;
    }

    @Override
    public void delete(String fileUrl) {
        if (fileUrl == null) return;
        String fileName = fileUrl.replace("/gen/", "");
        try {
            Files.deleteIfExists(Paths.get(uploadDir, fileName));
        } catch (IOException e) {
            System.err.println("파일 삭제 실패: " + e.getMessage());
        }
    }
}
