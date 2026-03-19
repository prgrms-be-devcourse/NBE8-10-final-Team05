package com.back.letter.controller;


import com.back.global.rsData.RsData;
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
            @RequestBody @Valid CreateLetterReq req
    ){
        /*Auth(인증)도메인 미구현 상태로 테스트를 위해
        로그인 유저의 ID를 1번으로 고정하여 처리
        */
        int memeberId = 1;

        int id = letterService.createLetterAndDirectSendLetter(req, memeberId);
        return ResponseEntity.ok(new RsData<>("200-1","편지가 전송되었습니다.", id));
    }

    @GetMapping("/received")
    public ResponseEntity<RsData<LetterListRes>> getReceivedLetters(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        int memberId = 2;
        LetterListRes data = letterService.getMyInbox(memberId, page, size);
        return ResponseEntity.ok(new RsData<>("200-2", "받은 편지 보관함 조회 성공", data));
    }

    @GetMapping("/sent")
    public ResponseEntity<RsData<LetterListRes>> getSentLetters(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ){
        int memberId = 1;

        LetterListRes data = letterService.getMySentBox(memberId, page, size);
        return ResponseEntity.ok(new RsData<>("200-3", "보낸 편지 보관함 조회 성공", data));
    }

    @GetMapping("/{id}")
    public ResponseEntity<RsData<LetterInfoRes>> getDetail(@PathVariable int id){
        LetterInfoRes data = letterService.getLetter(id);
        return ResponseEntity.ok(new RsData<>("200-4","편지 상세 조회 성공", data));
    }

    @PostMapping("/{id}/reply")
    public ResponseEntity<RsData<Void>> reply(@PathVariable int id, @RequestBody @Valid ReplyLetterReq req){
        letterService.replyLetter(id, req);
        return ResponseEntity.ok(new RsData<>("200-5", "답장이 등록되었습니다."));
    }
}
