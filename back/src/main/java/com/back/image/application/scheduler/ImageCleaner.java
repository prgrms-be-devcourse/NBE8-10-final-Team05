package com.back.image.application.scheduler;

import com.back.image.adapter.out.persistence.ImageRepository;
import com.back.image.application.service.ImageService;
import com.back.image.domain.Image;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

// com.back.image.application.scheduler.ImageCleaner.java
@Component
@RequiredArgsConstructor
@Slf4j
public class ImageCleaner {

    private final ImageRepository imageRepository;
    private final ImageService imageService;

    // 매일 새벽 3시에 실행 (Cron: 초 분 시 일 월 요일)
    @Scheduled(cron = "0 0 3 * * *")
    @Transactional
    public void cleanupUnusedImages() {
        log.info("유령 이미지 청소 작업을 시작합니다.");
        
        // 24시간 전 기준 시간 계산
        LocalDateTime threshold = LocalDateTime.now().minusHours(24);
        
        // 대상 조회
        List<Image> unusedImages = imageRepository.findAllByStatusAndCreateDateBefore(
                Image.ImageStatus.PENDING,
                threshold
        );

        log.info("삭제 대상 이미지 개수: {}개", unusedImages.size());

        for (Image image : unusedImages) {
            try {
                // 기존에 만들어둔 delete 로직 재활용 (물리 파일 + DB 삭제)
                imageService.delete(image.getAccessUrl());
                log.info("유령 이미지 삭제 완료: {}", image.getStoredName());
            } catch (Exception e) {
                log.error("이미지 삭제 중 오류 발생: {}", image.getStoredName(), e);
            }
        }
        
        log.info("유령 이미지 청소 작업을 마칩니다.");
    }
}
