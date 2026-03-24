package com.back.diary.controller;

import com.back.diary.dto.DiaryCreateReq;
import com.back.diary.dto.DiaryRes;
import com.back.diary.service.DiaryService;
import com.back.global.rsData.RsData;
import com.back.global.security.adapter.in.AuthenticatedMember;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/diaries")
@RequiredArgsConstructor
public class DiaryController {

    private final DiaryService diaryService;

    @PostMapping
    public RsData<Long> create(
            @Valid @RequestBody DiaryCreateReq req,
            @AuthenticationPrincipal AuthenticatedMember authenticatedMember
    ) {
        Long diaryId = diaryService.write(
                req,
                authenticatedMember.memberId()
        );

        return new RsData<>("201-1", "일기가 저장되었습니다.", diaryId);
    }


    @GetMapping("/{id}")
    public RsData<DiaryRes> getOne(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedMember authenticatedMember
    ) {
        DiaryRes diaryRes = diaryService.getDiary(id, authenticatedMember.memberId());

        return new RsData<>("200-1", "일기를 불러왔습니다.", diaryRes);
    }

    @GetMapping
    public RsData<List<DiaryRes>> getMyList(
            @AuthenticationPrincipal AuthenticatedMember authenticatedMember
    ) {
        List<DiaryRes> myDiaries = diaryService.getMyDiaries(authenticatedMember.memberId());

        return new RsData<>("200-2", "일기들을 가져왔습니다.", myDiaries);
    }


    @PutMapping("/{id}")
    public RsData<Void> modify(
            @PathVariable Long id,
            @Valid @RequestBody DiaryCreateReq req,
            @AuthenticationPrincipal AuthenticatedMember authenticatedMember
    ) {
        diaryService.modify(id, req, authenticatedMember.memberId());
        return new RsData<>("200-1", "%d번 일기가 수정되었습니다.".formatted(id));
    }

    @DeleteMapping("/{id}")
    public RsData<Void> delete(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedMember authenticatedMember
    ) {
        diaryService.delete(id, authenticatedMember.memberId());
        return new RsData<>("200-1", "%d번 일기가 삭제되었습니다.".formatted(id));
    }
}
