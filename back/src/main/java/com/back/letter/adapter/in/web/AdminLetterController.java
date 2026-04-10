package com.back.letter.adapter.in.web;

import com.back.global.rsData.RsData;
import com.back.global.security.adapter.in.AuthenticatedMember;
import com.back.letter.adapter.in.web.docs.AdminLetterApiDocs;
import com.back.letter.application.port.in.AdminLetterUseCase;
import com.back.letter.application.port.in.dto.AdminLetterDetailRes;
import com.back.letter.application.port.in.dto.AdminLetterHandleReq;
import com.back.letter.application.port.in.dto.AdminLetterListRes;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/admin/letters")
@PreAuthorize("hasRole('ADMIN')")
public class AdminLetterController implements AdminLetterApiDocs {

  private final AdminLetterUseCase adminLetterUseCase;

  @GetMapping
  public RsData<AdminLetterListRes> getList(
      @RequestParam(required = false) String status,
      @RequestParam(required = false) String query,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size) {
    return new RsData<>(
        "200-1",
        "관리자 편지 목록을 조회했습니다.",
        adminLetterUseCase.getAdminLetters(status, query, page, size));
  }

  @GetMapping("/{id}")
  public RsData<AdminLetterDetailRes> getDetail(@PathVariable Long id) {
    return new RsData<>("200-2", "관리자 편지 상세를 조회했습니다.", adminLetterUseCase.getAdminLetter(id));
  }

  @PostMapping("/{id}/actions")
  public RsData<Void> handle(
      @PathVariable Long id,
      @RequestBody AdminLetterHandleReq req,
      @AuthenticationPrincipal AuthenticatedMember authMember) {
    adminLetterUseCase.handleAdminLetter(id, req, authMember.memberId());
    return new RsData<>("200-3", "관리자 편지 조치를 기록했습니다.");
  }
}
