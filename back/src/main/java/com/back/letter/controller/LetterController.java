package com.back.letter.controller;


import com.back.auth.application.AuthErrorCode;
import com.back.global.rsData.RsData;
import com.back.global.security.adapter.in.AuthenticatedMember;
import com.back.letter.dto.CreateLetterReq;
import com.back.letter.dto.LetterInfoRes;
import com.back.letter.dto.LetterListRes;
import com.back.letter.dto.ReplyLetterReq;
import com.back.letter.service.LetterService;
import com.back.member.domain.Member;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/letters")
@RequiredArgsConstructor
public class LetterController {

    private final LetterService letterService;

    @PostMapping
    public ResponseEntity<RsData<Integer>> create(
            @RequestBody @Valid CreateLetterReq req,
            @AuthenticationPrincipal AuthenticatedMember authMember
            ){

        int id = letterService.createLetterAndDirectSendLetter(req, authMember.memberId());
        return ResponseEntity.ok(new RsData<>("200-1","편지가 전송되었습니다.", id));
    }

    @GetMapping("/received")
    public ResponseEntity<RsData<LetterListRes>> getReceivedLetters(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @AuthenticationPrincipal AuthenticatedMember authMember
    ) {
        LetterListRes data = letterService.getMyInbox(authMember.memberId(), page, size);
        return ResponseEntity.ok(new RsData<>("200-2", "받은 편지 보관함 조회 성공", data));
    }

    @GetMapping("/sent")
    public ResponseEntity<RsData<LetterListRes>> getSentLetters(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @AuthenticationPrincipal AuthenticatedMember authMember
    ){
        LetterListRes data = letterService.getMySentBox(authMember.memberId(), page, size);
        return ResponseEntity.ok(new RsData<>("200-3", "보낸 편지 보관함 조회 성공", data));
    }

    @GetMapping("/{id}")
    public ResponseEntity<RsData<LetterInfoRes>> getDetail(
            @PathVariable int id,
            @AuthenticationPrincipal AuthenticatedMember authMember
    ){
        if(authMember == null) throw AuthErrorCode.AUTHENTICATION_REQUIRED.toException();
        LetterInfoRes data = letterService.getLetter(id, authMember.memberId());
        return ResponseEntity.ok(new RsData<>("200-4","편지 상세 조회 성공", data));
    }

    @PostMapping("/{id}/reply")
    public ResponseEntity<RsData<Void>> reply(
            @PathVariable int id,
            @RequestBody @Valid ReplyLetterReq req,
            @AuthenticationPrincipal AuthenticatedMember authMember
    ){
        if(authMember == null) throw AuthErrorCode.AUTHENTICATION_REQUIRED.toException();
        letterService.replyLetter(id, req, authMember.memberId());
        return ResponseEntity.ok(new RsData<>("200-5", "답장이 등록되었습니다."));
    }
}
