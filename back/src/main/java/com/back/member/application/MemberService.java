package com.back.member.application;

import com.back.global.exception.ServiceException;
import com.back.member.adapter.in.web.dto.CreateMemberRequest;
import com.back.member.adapter.in.web.dto.MemberResponse;
import com.back.member.adapter.in.web.dto.UpdateMemberProfileRequest;
import com.back.member.domain.Member;
import com.back.member.domain.MemberRepository;
import java.util.Locale;
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

  private static final String ERROR_CODE_BAD_REQUEST = "400-1";
  private static final String ERROR_CODE_NOT_FOUND = "404-1";
  private static final String ERROR_CODE_CONFLICT = "409-1";
  private static final String ERROR_MSG_EMAIL_EXISTS = "Member email already exists.";
  private static final String ERROR_MSG_MEMBER_NOT_FOUND = "Member not found.";
  private static final String ERROR_MSG_EMAIL_BLANK = "email must not be blank.";
  private static final String ERROR_MSG_PASSWORD_BLANK = "password must not be blank.";

  private final MemberRepository memberRepository;
  private final PasswordEncoder passwordEncoder;

  /** 신규 회원을 생성하고 응답 DTO로 반환한다. */
  @Transactional
  public MemberResponse createMember(CreateMemberRequest request) {
    String email = normalizeEmail(request.email());
    validateEmailNotDuplicated(email);
    String passwordHash = encodePassword(request.password());
    Member member = Member.create(email, passwordHash, request.nickname());
    return MemberResponse.from(memberRepository.save(member));
  }

  /** memberId로 회원 단건 조회를 수행한다. */
  public MemberResponse getMember(Long memberId) {
    return MemberResponse.from(findMemberById(memberId));
  }

  /** 회원 프로필(현재는 닉네임)을 수정한다. */
  @Transactional
  public MemberResponse updateProfile(Long memberId, UpdateMemberProfileRequest request) {
    Member member = findMemberById(memberId);
    member.updateNickname(request.nickname());
    return MemberResponse.from(member);
  }

  private Member findMemberById(Long memberId) {
    return memberRepository
        .findById(memberId)
        .orElseThrow(() -> new ServiceException(ERROR_CODE_NOT_FOUND, ERROR_MSG_MEMBER_NOT_FOUND));
  }

  private String normalizeEmail(String email) {
    if (email == null || email.isBlank()) {
      throw new ServiceException(ERROR_CODE_BAD_REQUEST, ERROR_MSG_EMAIL_BLANK);
    }
    return email.trim().toLowerCase(Locale.ROOT);
  }

  private void validateEmailNotDuplicated(String email) {
    if (memberRepository.existsByEmail(email)) {
      throw new ServiceException(ERROR_CODE_CONFLICT, ERROR_MSG_EMAIL_EXISTS);
    }
  }

  private String encodePassword(String rawPassword) {
    validateRawPassword(rawPassword);
    return passwordEncoder.encode(rawPassword);
  }

  private void validateRawPassword(String password) {
    if (password == null || password.isBlank()) {
      throw new ServiceException(ERROR_CODE_BAD_REQUEST, ERROR_MSG_PASSWORD_BLANK);
    }
  }
}
