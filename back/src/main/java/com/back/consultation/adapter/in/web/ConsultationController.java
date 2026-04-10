package com.back.consultation.adapter.in.web;

import com.back.auth.application.AuthErrorCode;
import com.back.consultation.adapter.in.web.docs.ConsultationApiDocs;
import com.back.consultation.adapter.in.web.dto.ConsultationRequest;
import com.back.consultation.application.ConsultationService;
import com.back.global.rsData.RsData;
import com.back.global.security.adapter.in.AuthenticatedMember;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/consultations")
public class ConsultationController implements ConsultationApiDocs {

    private final ConsultationService consultationService;

    // SSE 연결
    @GetMapping(value = "/connect", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter subscribe(@AuthenticationPrincipal AuthenticatedMember authMember) {
        return consultationService.subscribe(requiredMemberId(authMember));
    }

    // 채팅 전송
    @PostMapping("/chat")
    public RsData<Void> chat(
            @AuthenticationPrincipal AuthenticatedMember authMember,
            @RequestBody @Valid ConsultationRequest request
    ) {
        consultationService.chat(requiredMemberId(authMember), request.message());
        return new RsData<>("200-1", "메시지가 전송되었습니다.");
    }

    private Long requiredMemberId(AuthenticatedMember authMember) {
        if (authMember == null || authMember.memberId() == null) {
            throw AuthErrorCode.AUTHENTICATION_REQUIRED.toException();
        }
        return authMember.memberId();
    }
}
