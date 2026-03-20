package com.back.member.adapter.in.web;

import com.back.global.exception.ServiceException;
import com.back.global.rsData.RsData;
import com.back.global.security.adapter.in.AuthenticatedMember;
import com.back.member.adapter.in.web.dto.CreateMemberRequest;
import com.back.member.adapter.in.web.dto.MemberResponse;
import com.back.member.adapter.in.web.dto.UpdateMemberProfileRequest;
import com.back.member.application.MemberService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/members")
public class MemberController {

  private final MemberService memberService;

  @PostMapping
  public RsData<MemberResponse> createMember(@RequestBody CreateMemberRequest request) {
    MemberResponse response = memberService.createMember(request);
    return new RsData<>("201-1", "Member created.", response);
  }

  /** 본인 회원 정보 조회 엔드포인트. */
  @GetMapping("/me")
  public RsData<MemberResponse> getMyMember(Authentication authentication) {
    Integer memberId = resolveAuthenticatedMemberId(authentication);
    return new RsData<>("200-1", "Member fetched.", memberService.getMember(memberId));
  }

  /** 타인 조회는 관리자만 허용한다. */
  @Deprecated
  @PreAuthorize("hasRole('ADMIN')")
  @GetMapping("/{memberId}")
  public RsData<MemberResponse> getMember(@PathVariable Integer memberId) {
    return new RsData<>("200-1", "Member fetched.", memberService.getMember(memberId));
  }

  /** 본인 프로필(닉네임) 수정 엔드포인트. */
  @PatchMapping("/me/profile")
  public RsData<MemberResponse> updateMyProfile(
      Authentication authentication, @RequestBody UpdateMemberProfileRequest request) {
    Integer memberId = resolveAuthenticatedMemberId(authentication);
    return new RsData<>(
        "200-2", "Member profile updated.", memberService.updateProfile(memberId, request));
  }

  /** memberId 기반 수정은 유지하되 관리자 전용으로 제한한다. */
  @Deprecated
  @PreAuthorize("hasRole('ADMIN')")
  @PatchMapping("/{memberId}/profile")
  public RsData<MemberResponse> updateProfile(
      @PathVariable Integer memberId, @RequestBody UpdateMemberProfileRequest request) {
    return new RsData<>(
        "200-2", "Member profile updated.", memberService.updateProfile(memberId, request));
  }

  private Integer resolveAuthenticatedMemberId(Authentication authentication) {
    if (authentication == null
        || !(authentication.getPrincipal() instanceof AuthenticatedMember principal)) {
      throw new ServiceException("401-1", "Authentication is required.");
    }
    return principal.memberId();
  }
}
