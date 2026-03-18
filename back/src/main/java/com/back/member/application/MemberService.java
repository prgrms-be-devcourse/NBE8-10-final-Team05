package com.back.member.application;

import com.back.global.exception.ServiceException;
import com.back.member.adapter.in.web.dto.CreateMemberRequest;
import com.back.member.adapter.in.web.dto.MemberResponse;
import com.back.member.adapter.in.web.dto.UpdateMemberProfileRequest;
import com.back.member.domain.Member;
import com.back.member.domain.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 회원 도메인의 애플리케이션 서비스.
 *
 * <p>회원 생성, 단건 조회, 프로필(닉네임) 수정 유스케이스를 담당한다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MemberService {

  private final MemberRepository memberRepository;
  private final PasswordEncoder passwordEncoder;

  @Transactional
  public MemberResponse createMember(CreateMemberRequest request) {
    // 이메일 표준화(공백 제거 + 소문자화) 후 중복을 검사한다.
    String email = normalizeEmail(request.email());

    if (memberRepository.existsByEmail(email)) {
      throw new ServiceException("409-1", "Member email already exists.");
    }

    // 비밀번호는 반드시 해시(BCrypt) 후 저장한다.
    String password = normalizePassword(request.password());
    String encodedPassword = passwordEncoder.encode(password);
    Member member = Member.create(email, encodedPassword, request.nickname());
    return MemberResponse.from(memberRepository.save(member));
  }

  public MemberResponse getMember(Integer memberId) {
    // 조회 실패 시 ServiceException(404-1)로 일관된 에러 응답을 만든다.
    return MemberResponse.from(findMemberById(memberId));
  }

  @Transactional
  public MemberResponse updateProfile(Integer memberId, UpdateMemberProfileRequest request) {
    // 현재는 닉네임만 수정한다. 엔티티 변경 감지로 트랜잭션 종료 시 반영된다.
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
    // 이메일은 필수값이며, 비교 일관성을 위해 소문자로 저장한다.
    if (email == null || email.isBlank()) {
      throw new ServiceException("400-1", "email must not be blank.");
    }
    return email.trim().toLowerCase();
  }

  private String normalizePassword(String password) {
    // 비밀번호 공백/NULL 방지. 실제 보안 처리는 createMember에서 인코딩한다.
    if (password == null || password.isBlank()) {
      throw new ServiceException("400-1", "password must not be blank.");
    }
    return password;
  }
}
