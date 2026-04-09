package com.back.member.adapter.in.web;

import com.back.global.rsData.RsData;
import com.back.global.security.adapter.in.AuthenticatedMember;
import com.back.member.adapter.in.web.dto.AdminRevokeMemberSessionsRequest;
import com.back.member.adapter.in.web.dto.AdminMemberDetailResponse;
import com.back.member.adapter.in.web.dto.AdminMemberListResponse;
import com.back.member.adapter.in.web.dto.AdminUpdateMemberRoleRequest;
import com.back.member.adapter.in.web.dto.AdminUpdateMemberStatusRequest;
import com.back.member.adapter.in.web.dto.UpdateMemberProfileRequest;
import com.back.member.application.MemberService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/admin/members")
@PreAuthorize("hasRole('ADMIN')")
public class AdminMemberController {

  private final MemberService memberService;

  @GetMapping
  public RsData<AdminMemberListResponse> getMembers(
      @RequestParam(required = false) String query,
      @RequestParam(required = false) String status,
      @RequestParam(required = false) String role,
      @RequestParam(required = false) String provider,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size) {
    return new RsData<>(
        "200-7",
        "관리자 회원 목록을 조회했습니다.",
        memberService.getAdminMembers(query, status, role, provider, page, size));
  }

  @GetMapping("/{memberId}")
  public RsData<AdminMemberDetailResponse> getMemberDetail(@PathVariable Long memberId) {
    return new RsData<>(
        "200-8",
        "관리자 회원 상세를 조회했습니다.",
        memberService.getAdminMemberDetail(memberId));
  }

  @PatchMapping("/{memberId}/profile")
  public RsData<AdminMemberDetailResponse> updateMemberProfile(
      @PathVariable Long memberId, @RequestBody UpdateMemberProfileRequest request) {
    memberService.updateProfile(memberId, request);
    return new RsData<>(
        "200-9",
        "관리자 회원 프로필을 수정했습니다.",
        memberService.getAdminMemberDetail(memberId));
  }

  @PatchMapping("/{memberId}/status")
  public RsData<AdminMemberDetailResponse> updateMemberStatus(
      @PathVariable Long memberId,
      @RequestBody AdminUpdateMemberStatusRequest request,
      @AuthenticationPrincipal AuthenticatedMember authMember) {
    return new RsData<>(
        "200-10",
        "관리자 회원 상태를 변경했습니다.",
        memberService.updateAdminMemberStatus(memberId, authMember.memberId(), request));
  }

  @PatchMapping("/{memberId}/role")
  public RsData<AdminMemberDetailResponse> updateMemberRole(
      @PathVariable Long memberId,
      @RequestBody AdminUpdateMemberRoleRequest request,
      @AuthenticationPrincipal AuthenticatedMember authMember) {
    return new RsData<>(
        "200-11",
        "관리자 회원 권한을 변경했습니다.",
        memberService.updateAdminMemberRole(memberId, authMember.memberId(), request));
  }

  @PostMapping("/{memberId}/sessions/revoke")
  public RsData<AdminMemberDetailResponse> revokeMemberSessions(
      @PathVariable Long memberId,
      @RequestBody(required = false) AdminRevokeMemberSessionsRequest request,
      @AuthenticationPrincipal AuthenticatedMember authMember) {
    return new RsData<>(
        "200-12",
        "관리자 회원 세션을 만료했습니다.",
        memberService.revokeAdminMemberSessions(memberId, authMember.memberId(), request));
  }
}
