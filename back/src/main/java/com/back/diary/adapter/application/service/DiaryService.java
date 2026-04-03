package com.back.diary.adapter.application.service;

import com.back.diary.adapter.application.port.in.DiaryUseCase;
import com.back.diary.adapter.application.port.in.dto.DiaryCreateReq;
import com.back.diary.adapter.application.port.in.dto.DiaryRes;
import com.back.diary.adapter.application.port.out.DiaryPort;
import com.back.diary.domain.Diary;
import com.back.global.exception.ServiceException;
import com.back.image.application.event.ImageDeleteEvent;
import com.back.image.application.service.ImageService;
import com.back.image.domain.Image;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
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
    private final ApplicationEventPublisher eventPublisher;

    @Override
    @Transactional
    public Long write(DiaryCreateReq req, MultipartFile image, Long memberId) {
        validateDuplicateTodayDiary(memberId);
        String uploadedUrl = uploadImageIfPresent(image);
        List<String> extractedUrls = extractImageUrls(req.content());

        Diary diary = Diary.create(memberId, "익명", req.title(), req.content(),
                req.categoryName(), null, req.isPrivate());
        diary.updateRepresentativeImage(uploadedUrl, req.imageUrl(), extractedUrls);

        Diary savedDiary = diaryRepositoryPort.save(diary);

        List<String> allUsedImages = new ArrayList<>(extractedUrls);
        if (diary.getImageUrl() != null && !allUsedImages.contains(diary.getImageUrl())) {
            allUsedImages.add(diary.getImageUrl());
        }

        imageService.confirmUsage(allUsedImages, "DIARY", savedDiary.getId());

        return savedDiary.getId();
    }

    @Override
    @Transactional
    public void modify(Long diaryId, DiaryCreateReq req, MultipartFile image, Long currentMemberId) {
        Diary diary = findById(diaryId);
        diary.validateOwner(currentMemberId);

        String newImageUrl = diary.getImageUrl();

        if (image != null && !image.isEmpty()) {
            deleteImageIfExist(diary.getImageUrl());
            newImageUrl = imageService.upload(image, "DIARY").getAccessUrl();
        }
        else if (diary.isImageChanged(req.imageUrl())) {
            deleteImageIfExist(diary.getImageUrl());
            newImageUrl = req.imageUrl();
        }

        diary.modify(req, newImageUrl);
    }

    @Override
    @Transactional
    public void delete(Long diaryId, Long currentMemberId) {
        Diary diary = findById(diaryId);
        diary.validateOwner(currentMemberId);

        List<String> imagesToDelete = extractImageUrls(diary.getContent());
        if (diary.getImageUrl() != null && !imagesToDelete.contains(diary.getImageUrl())) {
            imagesToDelete.add(diary.getImageUrl());
        }

        // 1. DB에서 일기 먼저 삭제
        diaryRepositoryPort.delete(diary);

        // 2. 이미지 삭제는 이벤트를 발행하여 비동기로 처리
        if (!imagesToDelete.isEmpty()) {
            eventPublisher.publishEvent(new ImageDeleteEvent(imagesToDelete));
        }
    }

    private Diary findById(Long id) {
        return diaryRepositoryPort.findById(id)
                .orElseThrow(() -> new ServiceException("404-1", "존재하지 않는 일기입니다."));
    }

    private String uploadImageIfPresent(MultipartFile image) {
        return (image != null && !image.isEmpty())
                ? imageService.upload(image, "DIARY").getAccessUrl()
                : null;
    }

    private void deleteImageIfExist(String url) {
        if (url != null && !url.isBlank()) {
            imageService.delete(url);
        }
    }

    private void validateDuplicateTodayDiary(Long memberId) {
        LocalDate today = LocalDate.now();
        if (diaryRepositoryPort.existsByMemberIdAndCreateDateBetween(
                memberId, today.atStartOfDay(), today.plusDays(1).atStartOfDay())) {
            throw new ServiceException("409-1", "오늘은 이미 일기를 작성했습니다.");
        }
    }

    public DiaryRes getDiary(Long diaryId, Long currentMemberId) {
        Diary diary = diaryRepositoryPort.findById(diaryId)
                .orElseThrow(() -> new ServiceException("404-1", "존재하지 않는 일기입니다."));

        diary.validateAccess(currentMemberId);

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



    private List<String> extractImageUrls(String content) {
        List<String> urls = new ArrayList<>();
        if (content == null || content.isBlank()) return urls;

        Pattern pattern = Pattern.compile("<img[^>]*src=[\"']([^\"']*)[\"']", Pattern.CASE_INSENSITIVE);
        Matcher matcher = pattern.matcher(content);

        while (matcher.find()) {
            urls.add(matcher.group(1));
        }
        return urls;
    }


}
