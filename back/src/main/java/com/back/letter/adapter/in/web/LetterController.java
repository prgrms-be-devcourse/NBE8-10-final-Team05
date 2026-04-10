package com.back.letter.adapter.in.web;

import com.back.auth.application.AuthErrorCode;
import com.back.global.exception.ServiceException;
import com.back.global.rsData.RsData;
import com.back.global.security.adapter.in.AuthenticatedMember;
import com.back.letter.adapter.in.web.docs.LetterApiDocs;
import com.back.letter.application.port.in.*; // DTO와 UseCase를 인터페이스 패키지에서 가져옴
import com.back.letter.application.port.in.dto.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/v1/letters")
@RequiredArgsConstructor
public class LetterController implements LetterApiDocs {

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

    @PostMapping("/{id}/accept")
    public ResponseEntity<RsData<Void>> acceptLetter(@PathVariable long id, @AuthenticationPrincipal AuthenticatedMember authMember) {
        if (authMember == null) throw AuthErrorCode.AUTHENTICATION_REQUIRED.toException();
        sendLetterUseCase.acceptLetter(id, authMember.memberId());
        return ResponseEntity.ok(new RsData<>("200-5", "편지 수락 성공", null));
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<RsData<Void>> rejectLetter(
            @PathVariable long id,
            @AuthenticationPrincipal AuthenticatedMember authMember
    ) {
        if (authMember == null) throw AuthErrorCode.AUTHENTICATION_REQUIRED.toException();

        sendLetterUseCase.rejectLetter(id, authMember.memberId());
        return ResponseEntity.ok(new RsData<>("200-8", "편지를 거절하여 새로운 수신자에게 전달되었습니다."));
    }

    @PostMapping("/{id}/writing")
    public ResponseEntity<RsData<Void>> updateWritingStatus(
            @PathVariable long id,
            @AuthenticationPrincipal AuthenticatedMember authMember
    ) {
        System.out.println("====> [컨트롤러] 작성 중 요청 도달! ID: " + id);

        if (authMember == null) {
            System.out.println("====> [컨트롤러] 인증 실패 (authMember is null)");
            throw AuthErrorCode.AUTHENTICATION_REQUIRED.toException();
        }

        sendLetterUseCase.updateWritingStatus(id);
        return ResponseEntity.ok(new RsData<>("200-6", "작성 중 상태 변경 완료", null));
    }

    @GetMapping("/{id}/status")
    public ResponseEntity<RsData<String>> getStatus(@PathVariable long id) {
        String status = inquiryLetterUseCase.getLiveStatus(id);
        return ResponseEntity.ok(new RsData<>("200-7", "상태 조회 성공", status));
    }

    @GetMapping("/stats")
    public ResponseEntity<RsData<LettersStatsRes>> getMailboxStats(
            @AuthenticationPrincipal AuthenticatedMember authMember
    ) {
        if (authMember == null) throw new ServiceException("401-1", "인증이 필요합니다.");

        LettersStatsRes stats = inquiryLetterUseCase.getMailboxStats(authMember.memberId());
        return ResponseEntity.ok(new RsData<>("200", "통계 조회 성공", stats));
    }
}
