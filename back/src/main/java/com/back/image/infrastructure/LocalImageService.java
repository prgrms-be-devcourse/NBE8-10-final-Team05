package com.back.image.infrastructure; // 패키지 경로 확인 필요

import com.back.global.exception.ServiceException;
import com.back.image.adapter.out.persistence.ImageRepository;

import com.back.image.application.service.ImageService;
import com.back.image.domain.Image;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

@Service
@Primary
@RequiredArgsConstructor
public class LocalImageService implements ImageService {

    @Value("${custom.file.upload-dir}")
    private String uploadDir;

    private final ImageRepository imageRepository;

    @Override
    @Transactional
    public Image upload(MultipartFile file, String refType) {
        if (file == null || file.isEmpty()) return null;

        String originName = file.getOriginalFilename();
        String ext = extractExt(originName);
        String storedName = UUID.randomUUID() + "." + ext;
        Path filePath = Paths.get(uploadDir, storedName);
        System.out.println("실제 파일 저장 절대 경로: " + filePath.toAbsolutePath());
        try {
            // 폴더가 없으면 생성
            Files.createDirectories(filePath.getParent());
            // 파일 실제 저장
            Files.write(filePath, file.getBytes());
        } catch (IOException e) {
            throw new ServiceException("500-1", "로컬 파일 저장 중 오류가 발생했습니다.");
        }

        // Image 엔티티 생성 및 DB 저장
        Image image = Image.builder()
                .originName(originName)
                .storedName(storedName)
                .accessUrl("/gen/" + storedName)
                .extension(ext)
                .fileSize(file.getSize())
                .referenceType(refType)
                .build();

        return imageRepository.save(image);
    }

    @Override
    @Transactional
    public void delete(String fileUrl) {
        if (!StringUtils.hasText(fileUrl)) return;

        String storedName = fileUrl.replace("/gen/", "");

        // 2. DB 레코드 삭제
        imageRepository.findByStoredName(storedName).ifPresent(image -> {
            imageRepository.delete(image);

            // 3. 물리 파일 삭제
            Path filePath = Paths.get(uploadDir, storedName);
            try {
                Files.deleteIfExists(filePath);
            } catch (IOException e) {
                // 로그를 남기거나 예외 처리를 하지만, DB가 지워졌다면 로직은 계속 진행 가능
                System.err.println("파일 삭제 실패: " + e.getMessage());
            }
        });
    }

    // 파일 확장자 추출 로직 (추가된 메서드)
    private String extractExt(String fileName) {
        if (!StringUtils.hasText(fileName)) return "";
        int pos = fileName.lastIndexOf(".");
        return fileName.substring(pos + 1);
    }
}
