package com.back.diary.adapter.application.port.in;// package com.back.diary.adapter.application.port.in;

import com.back.diary.adapter.application.port.in.dto.DiaryCreateReq;
import com.back.diary.adapter.application.port.in.dto.DiaryRes;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;

public interface DiaryUseCase {
    Long write(DiaryCreateReq req, MultipartFile image, Long memberId);
    DiaryRes getDiary(Long diaryId, Long currentMemberId);
    Page<DiaryRes> getMyDiaries(Long memberId, Pageable pageable);
    Page<DiaryRes> getPublicDiaries(Pageable pageable);
    void modify(Long diaryId, DiaryCreateReq req, MultipartFile image, Long currentMemberId);
    void delete(Long diaryId, Long currentMemberId);
}
