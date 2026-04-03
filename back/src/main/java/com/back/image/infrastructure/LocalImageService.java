package com.back.image.infrastructure; // 패키지 경로 확인 필요

import com.back.global.exception.ServiceException;
import com.back.image.adapter.out.persistence.ImageRepository;

import com.back.image.application.service.ImageService;
import com.back.image.domain.Image;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Optional;
import java.util.UUID;

@Service
@Profile("!prod")
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
        if (!StringUtils.hasText(fileUrl)) {
            System.out.println("삭제 요청된 URL이 비어있습니다.");
            return;
        }

        // 1. 저장된 파일명(storedName)만 안전하게 추출
        // URL이 "http://localhost:8080/gen/abc.png" 이든 "/gen/abc.png" 이든
        // 마지막 '/' 뒤의 문자열만 가져오도록 개선합니다.
        String storedName = fileUrl.contains("/")
                ? fileUrl.substring(fileUrl.lastIndexOf("/") + 1)
                : fileUrl;

        System.out.println("최종 추출된 storedName: " + storedName);

        // 2. DB 조회 시도
        Optional<Image> imageOpt = imageRepository.findByStoredName(storedName);

        if (imageOpt.isEmpty()) {
            System.err.println("DB에서 이미지를 찾을 수 없습니다. (파일명: " + storedName + ")");
            return;
        }

        imageOpt.ifPresent(image -> {
            System.out.println("DB 레코드 확인됨: " + image.getStoredName());

            // DB 레코드 삭제
            imageRepository.delete(image);

            // 3. 물리 파일 삭제
            Path filePath = Paths.get(uploadDir, storedName).toAbsolutePath();
            try {
                boolean deleted = Files.deleteIfExists(filePath);
                if (deleted) {
                    System.out.println("물리 파일 삭제 완료: " + filePath);
                } else {
                    System.err.println("⚠파일이 폴더에 존재하지 않습니다: " + filePath);
                }
            } catch (IOException e) {
                System.err.println("파일 삭제 중 입출력 오류 발생: " + e.getMessage());
                e.printStackTrace();
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
