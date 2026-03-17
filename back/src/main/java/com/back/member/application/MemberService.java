package com.back.member.application;

import com.back.global.exception.ServiceException;
import com.back.member.adapter.in.web.dto.CreateMemberRequest;
import com.back.member.adapter.in.web.dto.MemberResponse;
import com.back.member.adapter.in.web.dto.UpdateMemberProfileRequest;
import com.back.member.domain.Member;
import com.back.member.domain.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MemberService {

  private final MemberRepository memberRepository;

  @Transactional
  public MemberResponse createMember(CreateMemberRequest request) {
    String email = normalizeEmail(request.email());

    if (memberRepository.existsByEmail(email)) {
      throw new ServiceException("409-1", "Member email already exists.");
    }

    String password = normalizePassword(request.password());
    Member member = Member.create(email, password, request.nickname());
    return MemberResponse.from(memberRepository.save(member));
  }

  public MemberResponse getMember(Integer memberId) {
    return MemberResponse.from(findMemberById(memberId));
  }

  @Transactional
  public MemberResponse updateProfile(Integer memberId, UpdateMemberProfileRequest request) {
    Member member = findMemberById(memberId);
    member.updateNickname(request.nickname());
    return MemberResponse.from(member);
  }

  private Member findMemberById(Integer memberId) {
    return memberRepository
        .findById(memberId)
        .orElseThrow(() -> new ServiceException("404-1", "Member not found."));
  }

  private String normalizeEmail(String email) {
    if (email == null || email.isBlank()) {
      throw new ServiceException("400-1", "email must not be blank.");
    }
    return email.trim().toLowerCase();
  }

  private String normalizePassword(String password) {
    if (password == null || password.isBlank()) {
      throw new ServiceException("400-1", "password must not be blank.");
    }
    return password;
  }
}
