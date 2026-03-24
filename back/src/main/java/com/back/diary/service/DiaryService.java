package com.back.diary.service;

import com.back.diary.dto.DiaryCreateReq;
import com.back.diary.dto.DiaryRes;
import com.back.diary.entity.Diary;
import com.back.diary.repository.DiaryRepository;
import com.back.global.exception.ServiceException;
import com.back.member.domain.Member;
import com.back.member.domain.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DiaryService {

    private final DiaryRepository diaryRepository;
    private final MemberRepository memberRepository;
    private final ImageService imageService;

    @Transactional
    public Long write(DiaryCreateReq req, MultipartFile image, Long memberId) {
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

        return diaryRepository.save(diary).getId();
    }

    /** 일기 단건 조회 (보안 체크 포함) */
    public DiaryRes getDiary(Long diaryId, Long currentMemberId) {
        Diary diary = diaryRepository.findById(diaryId)
                .orElseThrow(() -> new ServiceException("404-1", "존재하지 않는 일기입니다."));

        if (diary.isPrivate()) { // 비공개 일기인 경우
            if (currentMemberId == null || !diary.getMemberId().equals(currentMemberId)) {
                throw new ServiceException("403-1", "비공개 일기입니다. 접근 권한이 없습니다.");
            }
        }

        return DiaryRes.from(diary);
    }

    //내 일기 조회
    public Page<DiaryRes> getMyDiaries(Long memberId, Pageable pageable) {
        return diaryRepository.findAllByMemberIdOrderByCreateDateDesc(memberId, pageable)
                .map(DiaryRes::from);
    }

    //공개 허용 일기 목록 조회
    public Page<DiaryRes> getPublicDiaries(Pageable pageable) {
        return diaryRepository.findAllByIsPrivateFalseOrderByCreateDateDesc(pageable)
                .map(DiaryRes::from);
    }

    @Transactional
    public void modify(Long diaryId, DiaryCreateReq req, MultipartFile image, Long currentMemberId) {

        Diary diary = diaryRepository.findById(diaryId)
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
    }

    @Transactional
    public void delete(Long diaryId, Long currentMemberId) {
        Diary diary = diaryRepository.findById(diaryId)
                .orElseThrow(() -> new ServiceException("404-1", "존재하지 않는 일기입니다."));

        if (!diary.getMemberId().equals(currentMemberId)) {
            throw new ServiceException("403-1", "삭제 권한이 없습니다.");
        }

        diaryRepository.delete(diary);
    }
}
