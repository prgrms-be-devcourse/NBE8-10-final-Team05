package com.back.member.adapter.in.web;

import com.back.global.rsData.RsData;
import com.back.member.adapter.in.web.dto.CreateMemberRequest;
import com.back.member.adapter.in.web.dto.MemberResponse;
import com.back.member.adapter.in.web.dto.UpdateMemberProfileRequest;
import com.back.member.application.MemberService;
import lombok.RequiredArgsConstructor;
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

  @GetMapping("/{memberId}")
  public RsData<MemberResponse> getMember(@PathVariable Integer memberId) {
    return new RsData<>("200-1", "Member fetched.", memberService.getMember(memberId));
  }

  @PatchMapping("/{memberId}/profile")
  public RsData<MemberResponse> updateProfile(
      @PathVariable Integer memberId, @RequestBody UpdateMemberProfileRequest request) {
    return new RsData<>(
        "200-2", "Member profile updated.", memberService.updateProfile(memberId, request));
  }
}
