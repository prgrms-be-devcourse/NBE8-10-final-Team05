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

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DiaryService implements DiaryUseCase { // 1. Inbound Port 구현

    private final DiaryPort diaryRepositoryPort;
    private final ImageService imageService;

    @Override
    @Transactional
    public Long write(DiaryCreateReq req, MultipartFile image, Long memberId) {
        Image savedImage = null;

        if (image != null && !image.isEmpty()) {
            savedImage = imageService.upload(image, "DIARY");
        }

        Diary diary = Diary.builder()
                .memberId(memberId)
                .nickname("익명")
                .title(req.title())
                .content(req.content())
                .imageUrl(savedImage != null ? savedImage.getAccessUrl() : null)
                .categoryName(req.categoryName())
                .isPrivate(req.isPrivate())
                .build();

        Diary savedDiary = diaryRepositoryPort.save(diary);

        if(savedImage != null){
            savedImage.connectTo("DIARY", savedDiary.getId());
        }
        return savedDiary.getId();
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

    @Override
    @Transactional
    public void delete(Long diaryId, Long currentMemberId) {
        Diary diary = diaryRepositoryPort.findById(diaryId)
                .orElseThrow(() -> new ServiceException("404-1", "존재하지 않는 일기입니다."));

        if (!diary.getMemberId().equals(currentMemberId)) {
            throw new ServiceException("403-1", "삭제 권한이 없습니다.");
        }

        if(diary.getImageUrl() != null){
            imageService.delete(diary.getImageUrl());
        }

        diaryRepositoryPort.delete(diary);
    }
}
