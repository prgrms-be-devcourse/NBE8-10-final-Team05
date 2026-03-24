package com.back.diary.adapter.in.web;

import com.back.diary.adapter.application.port.in.DiaryUseCase; // 인터페이스 임포트
import com.back.diary.adapter.application.port.in.dto.DiaryCreateReq;
import com.back.diary.adapter.application.port.in.dto.DiaryRes;
import com.back.global.rsData.RsData;
import com.back.global.security.adapter.in.AuthenticatedMember;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/diaries")
@RequiredArgsConstructor
public class DiaryController {

    // 핵심: 구현체인 DiaryService 대신 인터페이스인 DiaryUseCase에 의존합니다.
    private final DiaryUseCase diaryUseCase;

    // 일기 작성
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public RsData<Long> create(
            @Valid @RequestPart("data") DiaryCreateReq req,
            @RequestPart(value = "image", required = false) MultipartFile image,
            @AuthenticationPrincipal AuthenticatedMember authenticatedMember
    ) {
        Long diaryId = diaryUseCase.write(
                req,
                image,
                authenticatedMember.memberId()
        );

        return new RsData<>("201-1", "일기가 저장되었습니다.", diaryId);
    }

    // 공개 허용된 일기 목록 조회
    @GetMapping("/public")
    public RsData<Page<DiaryRes>> getPublicList(
            @PageableDefault(size = 10, sort = "createDate", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        Page<DiaryRes> publicDiaries = diaryUseCase.getPublicDiaries(pageable);

        if (publicDiaries.isEmpty()) {
            return new RsData<>("204-1", "공개된 일기가 없습니다.", Page.empty());
        }

        return new RsData<>("200-3", "공개 일기 목록을 가져왔습니다.", publicDiaries);
    }

    // 일기 단건 조회
    @GetMapping("/{id}")
    public RsData<DiaryRes> getOne(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedMember authenticatedMember
    ) {
        DiaryRes diaryRes = diaryUseCase.getDiary(id, authenticatedMember.memberId());

        return new RsData<>("200-1", "일기를 불러왔습니다.", diaryRes);
    }

    // 내 일기 목록 조회
    @GetMapping
    public RsData<Page<DiaryRes>> getMyList(
            @AuthenticationPrincipal AuthenticatedMember authenticatedMember,
            @PageableDefault(size = 10, sort = "createDate", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        Page<DiaryRes> myDiaries = diaryUseCase.getMyDiaries(authenticatedMember.memberId(), pageable);

        return new RsData<>("200-2", "일기 목록을 가져왔습니다.", myDiaries);
    }

    // 일기 수정
    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public RsData<Void> modify(
            @PathVariable Long id,
            @Valid @RequestPart("data") DiaryCreateReq req,
            @RequestPart(value = "image", required = false) MultipartFile image,
            @AuthenticationPrincipal AuthenticatedMember authenticatedMember
    ) {
        diaryUseCase.modify(id, req, image, authenticatedMember.memberId());
        return new RsData<>("200-1", "%d번 일기가 수정되었습니다.".formatted(id));
    }

    // 일기 삭제
    @DeleteMapping("/{id}")
    public RsData<Void> delete(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedMember authenticatedMember
    ) {
        diaryUseCase.delete(id, authenticatedMember.memberId());
        return new RsData<>("200-1", "%d번 일기가 삭제되었습니다.".formatted(id));
    }
}
