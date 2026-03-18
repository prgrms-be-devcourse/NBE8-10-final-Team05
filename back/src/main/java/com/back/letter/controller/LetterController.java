package com.back.letter.controller;


import com.back.global.rsData.RsData;
import com.back.letter.dto.CreateLetterReq;
import com.back.letter.dto.LetterInfoRes;
import com.back.letter.dto.LetterListRes;
import com.back.letter.dto.ReplyLetterReq;
import com.back.letter.service.LetterService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/letters")
@RequiredArgsConstructor
public class LetterController {

    private final LetterService letterService;

    @PostMapping
    public ResponseEntity<RsData<Integer>> create(
            @RequestBody @Valid CreateLetterReq req,
            @RequestHeader("User-Id") String senderId
    ){
        int id = letterService.createLetterAndDirectSendLetter(req, senderId);
        return ResponseEntity.ok(new RsData<>("200-1","편지가 전송되었습니다.", id));
    }

    @GetMapping("/received")
    public ResponseEntity<RsData<LetterListRes>> getReceivedLetters(
            @RequestHeader("User-Id") String userId
    ) {
        LetterListRes data = letterService.getMyInbox(userId);
        return ResponseEntity.ok(new RsData<>("200-2", "받은 편지 보관함 조회 성공", data));
    }

    @GetMapping("/{id}")
    public ResponseEntity<RsData<LetterInfoRes>> getDetail(@PathVariable int id){
        LetterInfoRes data = letterService.getLetter(id);
        return ResponseEntity.ok(new RsData<>("200-3","편지 상세 조회 성공", data));
    }

    @PostMapping("/{id}/reply")
    public ResponseEntity<RsData<Void>> reply(@PathVariable int id, @RequestBody @Valid ReplyLetterReq req){
        letterService.replyLetter(id, req);
        return ResponseEntity.ok(new RsData<>("200-4", "답장이 등록되었습니다."));
    }
}
