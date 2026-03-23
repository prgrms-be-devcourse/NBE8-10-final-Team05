package com.back.diary.service;

import com.back.diary.dto.DiaryCreateReq;
import com.back.diary.dto.DiaryRes;
import com.back.diary.entity.Diary;
import com.back.diary.repository.DiaryRepository;
import com.back.global.exception.ServiceException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DiaryService {

    private final DiaryRepository diaryRepository;

    @Transactional
    public Long write(DiaryCreateReq req, Long memberId) {
        Diary diary = req.toEntity(memberId);
        return diaryRepository.save(diary).getId();
    }

    /** 일기 단건 조회 (보안 체크 포함) */
    public DiaryRes getDiary(Long diaryId, Long currentMemberId) {
        Diary diary = diaryRepository.findById(diaryId)
                .orElseThrow(() -> new ServiceException("404-1", "존재하지 않는 일기입니다."));

        if (!diary.getMemberId().equals(currentMemberId)) {
            // 보안상 403 대신 404를 던져 해당 리소스의 존재 유무를 숨길 수 있습니다.
            throw new ServiceException("404-1", "존재하지 않는 일기입니다.");
        }

        return DiaryRes.from(diary);
    }

    public List<DiaryRes> getMyDiaries(Long memberId) {
        return diaryRepository.findAllByMemberIdOrderByCreateDateDesc(memberId)
                .stream()
                .map(DiaryRes::from) // Entity -> DTO 변환
                .toList();
    }

    @Transactional
    public void modify(Long diaryId, DiaryCreateReq req, Long currentMemberId) {
        Diary diary = diaryRepository.findById(diaryId)
                .orElseThrow(() -> new ServiceException("404-1", "존재하지 않는 일기입니다."));

        if (!diary.getMemberId().equals(currentMemberId)) {
            throw new ServiceException("403-1", "수정 권한이 없습니다.");
        }

        diary.modify(req.title(), req.content(), req.categoryName());
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
