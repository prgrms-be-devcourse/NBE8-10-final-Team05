package com.back.letter.adapter.in.web;

import com.back.auth.application.AuthErrorCode;
import com.back.global.rsData.RsData;
import com.back.global.security.adapter.in.AuthenticatedMember;
import com.back.letter.application.port.in.*; // DTO와 UseCase를 인터페이스 패키지에서 가져옴
import com.back.letter.application.port.in.dto.CreateLetterReq;
import com.back.letter.application.port.in.dto.LetterInfoRes;
import com.back.letter.application.port.in.dto.LetterListRes;
import com.back.letter.application.port.in.dto.ReplyLetterReq;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/letters")
@RequiredArgsConstructor
public class LetterController {

    private final SendLetterUseCase sendLetterUseCase;
    private final InquiryLetterUseCase inquiryLetterUseCase;

    @PostMapping
    public ResponseEntity<RsData<Long>> create(
            @RequestBody @Valid CreateLetterReq req,
            @AuthenticationPrincipal AuthenticatedMember authMember
    ){
        if(authMember == null) throw AuthErrorCode.AUTHENTICATION_REQUIRED.toException();

        long id = sendLetterUseCase.createLetterAndDirectSendLetter(req, authMember.memberId());
        return ResponseEntity.ok(new RsData<>("200-1", "편지가 전송되었습니다.", id));
    }

    @GetMapping("/received")
    public ResponseEntity<RsData<LetterListRes>> getReceivedLetters(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @AuthenticationPrincipal AuthenticatedMember authMember
    ) {
        if(authMember == null) throw AuthErrorCode.AUTHENTICATION_REQUIRED.toException();

        LetterListRes data = inquiryLetterUseCase.getMyInbox(authMember.memberId(), page, size);
        return ResponseEntity.ok(new RsData<>("200-2", "받은 편지 보관함 조회 성공", data));
    }

    @GetMapping("/sent")
    public ResponseEntity<RsData<LetterListRes>> getSentLetters(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @AuthenticationPrincipal AuthenticatedMember authMember
    ){
        if(authMember == null) throw AuthErrorCode.AUTHENTICATION_REQUIRED.toException();

        LetterListRes data = inquiryLetterUseCase.getMySentBox(authMember.memberId(), page, size);
        return ResponseEntity.ok(new RsData<>("200-3", "보낸 편지 보관함 조회 성공", data));
    }

    @GetMapping("/{id}")
    public ResponseEntity<RsData<LetterInfoRes>> getDetail(
            @PathVariable long id,
            @AuthenticationPrincipal AuthenticatedMember authMember
    ){
        if(authMember == null) throw AuthErrorCode.AUTHENTICATION_REQUIRED.toException();

        LetterInfoRes data = inquiryLetterUseCase.getLetter(id, authMember.memberId());
        return ResponseEntity.ok(new RsData<>("200-4", "편지 상세 조회 성공", data));
    }

    @PostMapping("/{id}/reply")
    public ResponseEntity<RsData<Void>> reply(
            @PathVariable long id,
            @RequestBody @Valid ReplyLetterReq req,
            @AuthenticationPrincipal AuthenticatedMember authMember
    ){
        if(authMember == null) throw AuthErrorCode.AUTHENTICATION_REQUIRED.toException();

        sendLetterUseCase.replyLetter(id, req, authMember.memberId());
        return ResponseEntity.ok(new RsData<>("200-5", "답장이 등록되었습니다."));
    }
}
