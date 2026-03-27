package com.back.member.adapter.in.web;

import com.back.global.exception.ServiceException;
import com.back.global.rsData.RsData;
import com.back.global.security.adapter.in.AuthenticatedMember;
import com.back.member.adapter.in.web.dto.CreateMemberRequest;
import com.back.member.adapter.in.web.dto.MemberResponse;
import com.back.member.adapter.in.web.dto.UpdateMemberEmailRequest;
import com.back.member.adapter.in.web.dto.UpdateMemberPasswordRequest;
import com.back.member.adapter.in.web.dto.UpdateMemberProfileRequest;
import com.back.member.application.MemberService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 회원 생성/조회/프로필 수정 API를 제공하는 컨트롤러. */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/members")
public class MemberController {

  private static final String CODE_MEMBER_CREATED = "201-1";
  private static final String CODE_MEMBER_FETCHED = "200-1";
  private static final String CODE_PROFILE_UPDATED = "200-2";
  private static final String CODE_RANDOM_SETTING_UPDATED = "200-3";
  private static final String CODE_EMAIL_UPDATED = "200-4";
  private static final String CODE_PASSWORD_UPDATED = "200-5";
  private static final String CODE_MEMBER_WITHDRAWN = "200-6";
  private static final String MSG_MEMBER_CREATED = "Member created.";
  private static final String MSG_MEMBER_FETCHED = "Member fetched.";
  private static final String MSG_PROFILE_UPDATED = "Member profile updated.";
  private static final String MSG_EMAIL_UPDATED = "Member email updated.";
  private static final String MSG_PASSWORD_UPDATED = "Member password updated.";
  private static final String MSG_MEMBER_WITHDRAWN = "Member account withdrawn.";
  private static final String CODE_UNAUTHORIZED = "401-1";
  private static final String MSG_UNAUTHORIZED = "Authentication is required.";
  private static final String MSG_RANDOM_SETTING_UPDATED = "Random letter receipt setting updated.";
  private final MemberService memberService;

  /** 회원 가입 API. */
  @PostMapping
  public RsData<MemberResponse> createMember(@RequestBody CreateMemberRequest request) {
    return memberCreated(memberService.createMember(request));
  }

  /** 본인 회원 정보 조회 엔드포인트. */
  @GetMapping("/me")
  public RsData<MemberResponse> getMyMember(Authentication authentication) {
    Long memberId = resolveAuthenticatedMemberId(authentication);
    return memberFetched(memberService.getMember(memberId));
  }

  /** 타인 조회는 관리자만 허용한다. */
  @Deprecated
  @PreAuthorize("hasRole('ADMIN')")
  @GetMapping("/{memberId}")
  public RsData<MemberResponse> getMember(@PathVariable Long memberId) {
    return memberFetched(memberService.getMember(memberId));
  }

  /** 본인 프로필(닉네임) 수정 엔드포인트. */
  @PatchMapping("/me/profile")
  public RsData<MemberResponse> updateMyProfile(
      Authentication authentication, @RequestBody UpdateMemberProfileRequest request) {
    Long memberId = resolveAuthenticatedMemberId(authentication);
    return profileUpdated(memberService.updateProfile(memberId, request));
  }

  /** 본인 이메일 변경 엔드포인트. */
  @PatchMapping("/me/email")
  public RsData<MemberResponse> updateMyEmail(
      Authentication authentication, @RequestBody UpdateMemberEmailRequest request) {
    Long memberId = resolveAuthenticatedMemberId(authentication);
    return new RsData<>(CODE_EMAIL_UPDATED, MSG_EMAIL_UPDATED, memberService.updateEmail(memberId, request));
  }

  /** 본인 비밀번호 변경 엔드포인트. */
  @PatchMapping("/me/password")
  public RsData<MemberResponse> updateMyPassword(
      Authentication authentication, @RequestBody UpdateMemberPasswordRequest request) {
    Long memberId = resolveAuthenticatedMemberId(authentication);
    return new RsData<>(
        CODE_PASSWORD_UPDATED, MSG_PASSWORD_UPDATED, memberService.updatePassword(memberId, request));
  }

  /** 본인 회원 탈퇴 엔드포인트. */
  @DeleteMapping("/me")
  public RsData<Void> withdrawMyMember(Authentication authentication) {
    Long memberId = resolveAuthenticatedMemberId(authentication);
    memberService.withdrawMember(memberId);
    return new RsData<>(CODE_MEMBER_WITHDRAWN, MSG_MEMBER_WITHDRAWN, null);
  }

  /** memberId 기반 수정은 유지하되 관리자 전용으로 제한한다. */
  @Deprecated
  @PreAuthorize("hasRole('ADMIN')")
  @PatchMapping("/{memberId}/profile")
  public RsData<MemberResponse> updateProfile(
      @PathVariable Long memberId, @RequestBody UpdateMemberProfileRequest request) {
    return profileUpdated(memberService.updateProfile(memberId, request));
  }


  /** 랜덤 편지 수신 설정 토글 API. */
  @PatchMapping("/me/random-setting")
  public RsData<MemberResponse> toggleMyRandomSetting(Authentication authentication) {
    Long memberId = resolveAuthenticatedMemberId(authentication);
    MemberResponse response = memberService.toggleRandomReceive(memberId);
    return new RsData<>(CODE_RANDOM_SETTING_UPDATED, MSG_RANDOM_SETTING_UPDATED, response);
  }


  private Long resolveAuthenticatedMemberId(Authentication authentication) {
    if (authentication == null
        || !(authentication.getPrincipal() instanceof AuthenticatedMember principal)) {
      throw new ServiceException(CODE_UNAUTHORIZED, MSG_UNAUTHORIZED);
    }
    return principal.memberId();
  }

  private RsData<MemberResponse> memberCreated(MemberResponse response) {
    return new RsData<>(CODE_MEMBER_CREATED, MSG_MEMBER_CREATED, response);
  }

  private RsData<MemberResponse> memberFetched(MemberResponse response) {
    return new RsData<>(CODE_MEMBER_FETCHED, MSG_MEMBER_FETCHED, response);
  }

  private RsData<MemberResponse> profileUpdated(MemberResponse response) {
    return new RsData<>(CODE_PROFILE_UPDATED, MSG_PROFILE_UPDATED, response);
  }
}
