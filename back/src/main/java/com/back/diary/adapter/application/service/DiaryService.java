package com.back.diary.adapter.application.service;

import com.back.diary.adapter.application.port.in.DiaryUseCase;
import com.back.diary.adapter.application.port.in.dto.DiaryCreateReq;
import com.back.diary.adapter.application.port.in.dto.DiaryRes;
import com.back.diary.adapter.application.port.out.DiaryPort;
import com.back.diary.domain.Diary;
import com.back.global.exception.ServiceException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

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

        String imageUrl = imageService.upload(image);

        Diary diary = Diary.builder()
                .memberId(memberId)
                .nickname("익명")
                .title(req.title())
                .content(req.content())
                .categoryName(req.categoryName())
                .imageUrl(imageUrl)
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

        if (image != null && !image.isEmpty()) {
            if (diary.getImageUrl() != null) {
                imageService.delete(diary.getImageUrl());
            }
            newImageUrl = imageService.upload(image);
        }

        diary.modify(
                req.title(),
                req.content(),
                req.categoryName(),
                newImageUrl,
                req.isPrivate()
        );
        diaryRepositoryPort.save(diary);
    }

    @Override
    @Transactional
    public void delete(Long diaryId, Long currentMemberId) {
        Diary diary = diaryRepositoryPort.findById(diaryId)
                .orElseThrow(() -> new ServiceException("404-1", "존재하지 않는 일기입니다."));

        if (!diary.getMemberId().equals(currentMemberId)) {
            throw new ServiceException("403-1", "삭제 권한이 없습니다.");
        }

        diaryRepositoryPort.delete(diary);
    }
}
