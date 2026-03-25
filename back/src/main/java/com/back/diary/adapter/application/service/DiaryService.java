package com.back.diary.adapter.application.service;

import com.back.diary.adapter.application.port.in.DiaryUseCase;
import com.back.diary.adapter.application.port.in.dto.DiaryCreateReq;
import com.back.diary.adapter.application.port.in.dto.DiaryRes;
import com.back.diary.adapter.application.port.out.DiaryPort;
import com.back.diary.domain.Diary;
import com.back.global.exception.ServiceException;
import com.back.image.application.service.ImageService;
import com.back.image.domain.Image;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DiaryService implements DiaryUseCase { // 1. Inbound Port 구현

    private final DiaryPort diaryRepositoryPort;
    private final ImageService imageService;

   @Override
    @Transactional
    public Long write(DiaryCreateReq req, MultipartFile image, Long memberId) {
        // 1. [develop] 오늘 일기 작성 여부 체크
        LocalDate today = LocalDate.now();
        LocalDateTime startOfToday = today.atStartOfDay();
        LocalDateTime startOfTomorrow = today.plusDays(1).atStartOfDay();

        boolean hasTodayDiary = diaryRepositoryPort.existsByMemberIdAndCreateDateBetween(
                memberId,
                startOfToday,
                startOfTomorrow
        );

        if (hasTodayDiary) {
            throw new ServiceException("409-1", "오늘은 이미 일기를 작성했습니다. 기존 기록을 수정해주세요.");
        }

        // 2. [refactor] 에디터 본문에서 이미지 URL들 추출
        List<String> imageUrls = extractImageUrls(req.content());

        // 3. [refactor] 대표 이미지 결정 (파일 업로드 우선, 없으면 본문 첫 이미지)
        String representativeUrl = null;
        if (image != null && !image.isEmpty()) {
            representativeUrl = imageService.upload(image, "DIARY").getAccessUrl();
        } else if (!imageUrls.isEmpty()) {
            representativeUrl = imageUrls.get(0);
        }

        // 4. 일기 생성 및 저장
        Diary diary = Diary.builder()
                .memberId(memberId)
                .nickname("익명")
                .title(req.title())
                .content(req.content())
                .imageUrl(representativeUrl)
                .categoryName(req.categoryName())
                .isPrivate(req.isPrivate())
                .build();

        return diaryRepositoryPort.save(diary).getId();
    }

    @Override
    public DiaryRes getDiary(Long diaryId, Long currentMemberId) {
        Diary diary = diaryRepositoryPort.findById(diaryId)
                .orElseThrow(() -> new ServiceException("404-1", "존재하지 않는 일기입니다."));

        if (diary.isPrivate()) {
            if (currentMemberId == null || !diary.getMemberId().equals(currentMemberId)) {
                throw new ServiceException("403-1", "비공개 일기입니다. 접근 권한이 없습니다.");
            }
        }

        return DiaryRes.from(diary);
    }

    @Override
    public Page<DiaryRes> getMyDiaries(Long memberId, Pageable pageable) {
        return diaryRepositoryPort.findAllByMemberId(memberId, pageable)
                .map(DiaryRes::from);
    }

    @Override
    public Page<DiaryRes> getPublicDiaries(Pageable pageable) {
        return diaryRepositoryPort.findAllPublic(pageable)
                .map(DiaryRes::from);
    }

    @Override
    @Transactional
    public void modify(Long diaryId, DiaryCreateReq req, MultipartFile image, Long currentMemberId) {
        Diary diary = diaryRepositoryPort.findById(diaryId)
                .orElseThrow(() -> new ServiceException("404-1", "존재하지 않는 일기입니다."));

        if (!diary.getMemberId().equals(currentMemberId)) {
            throw new ServiceException("403-1", "수정 권한이 없습니다.");
        }

        String newImageUrl = diary.getImageUrl();

        // 새 이미지가 업로드된 경우
        if (image != null && !image.isEmpty()) {
            // 기존 이미지가 있다면 삭제 실행 (DB 레코드 + 물리 파일)
            if (diary.getImageUrl() != null) {
                imageService.delete(diary.getImageUrl());
            }
            // 새 이미지 업로드
            Image savedImage = imageService.upload(image, "DIARY");
            newImageUrl = savedImage.getAccessUrl();
        }

        diary.modify(
                req.title(),
                req.content(),
                req.categoryName(),
                newImageUrl,
                req.isPrivate());
    }

    private List<String> extractImageUrls(String content) {
        List<String> urls = new ArrayList<>();
        if (content == null || content.isBlank()) return urls;

        // <img src="URL"> 패턴 추출 (따옴표 종류 상관없이 대응)
        Pattern pattern = Pattern.compile("<img[^>]*src=[\"']([^\"']*)[\"']", Pattern.CASE_INSENSITIVE);
        Matcher matcher = pattern.matcher(content);

        while (matcher.find()) {
            urls.add(matcher.group(1));
        }
        return urls;
    }

    @Override
    @Transactional
    public void delete(Long diaryId, Long currentMemberId) {
        Diary diary = diaryRepositoryPort.findById(diaryId)
                .orElseThrow(() -> new ServiceException("404-1", "존재하지 않는 일기입니다."));

        if (!diary.getMemberId().equals(currentMemberId)) {
            throw new ServiceException("403-1", "삭제 권한이 없습니다.");
        }

        // 1. 본문에 포함된 모든 이미지 URL 추출
        List<String> allImages = extractImageUrls(diary.getContent());

        // 2. 대표 이미지 필드(imageUrl)가 본문에 없을 경우를 대비해 리스트에 추가
        if (diary.getImageUrl() != null && !allImages.contains(diary.getImageUrl())) {
            allImages.add(diary.getImageUrl());
        }

        // 3. 모든 이미지 삭제 실행
        for (String url : allImages) {
            imageService.delete(url);
        }

        diaryRepositoryPort.delete(diary);
    }
}
