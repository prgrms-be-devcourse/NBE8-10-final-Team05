package com.back.letter.controller;


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
    public ResponseEntity<Integer> create(
            @RequestBody @Valid CreateLetterReq req,
            @RequestHeader("User-Id") String senderId
                                          ){
        return ResponseEntity.ok(letterService.createLetterAndDirectSendLetter(req, senderId));
    }

    @GetMapping("/received")
    public ResponseEntity<LetterListRes> getReceivedLetters(
            @RequestHeader("User-Id") String userId
    ) {
        return ResponseEntity.ok(letterService.getMyInbox(userId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<LetterInfoRes> getDetail(@PathVariable int id){
        return ResponseEntity.ok(letterService.getLetter(id));
    }

    @PostMapping("/{id}/reply")
    public ResponseEntity<Void> reply(@PathVariable int id, @RequestBody @Valid ReplyLetterReq req){
        letterService.replyLetter(id, req);
        return ResponseEntity.ok().build();
    }
}
