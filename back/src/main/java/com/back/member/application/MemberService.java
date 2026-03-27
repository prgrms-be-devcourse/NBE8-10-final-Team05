package com.back.member.application;

import com.back.auth.domain.RefreshTokenDomainService;
import com.back.global.exception.ServiceException;
import com.back.member.adapter.in.web.dto.CreateMemberRequest;
import com.back.member.adapter.in.web.dto.MemberResponse;
import com.back.member.adapter.in.web.dto.UpdateMemberEmailRequest;
import com.back.member.adapter.in.web.dto.UpdateMemberPasswordRequest;
import com.back.member.adapter.in.web.dto.UpdateMemberProfileRequest;
import com.back.member.domain.Member;
import com.back.member.domain.MemberRepository;
import com.back.member.domain.MemberStatus;
import java.time.Clock;
import java.time.LocalDateTime;
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
  private static final String ERROR_MSG_CURRENT_PASSWORD_BLANK =
      "currentPassword must not be blank.";
  private static final String ERROR_MSG_INVALID_CURRENT_PASSWORD = "Current password is invalid.";

  private final MemberRepository memberRepository;
  private final PasswordEncoder passwordEncoder;
  private final RefreshTokenDomainService refreshTokenDomainService;
  private final Clock clock;

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

  /** 회원 이메일을 변경한다. */
  @Transactional
  public MemberResponse updateEmail(Long memberId, UpdateMemberEmailRequest request) {
    Member member = findMemberById(memberId);
    String nextEmail = normalizeEmail(request.email());
    validateEmailNotDuplicated(memberId, nextEmail);
    member.updateEmail(nextEmail);
    return MemberResponse.from(member);
  }

  /** 현재 비밀번호 확인 후 새 비밀번호로 교체한다. */
  @Transactional
  public MemberResponse updatePassword(Long memberId, UpdateMemberPasswordRequest request) {
    Member member = findMemberById(memberId);
    validateCurrentPassword(member, request.currentPassword());
    member.updatePasswordHash(encodePassword(request.newPassword()));
    return MemberResponse.from(member);
  }

  /** 회원을 탈퇴 처리하고 해당 회원의 refresh 토큰을 모두 폐기한다. */
  @Transactional
  public void withdrawMember(Long memberId) {
    Member member = findMemberById(memberId);
    member.updateStatus(MemberStatus.WITHDRAWN);
    member.updateRandomReceiveAllowed(false);
    refreshTokenDomainService.revokeAllByMemberId(memberId, LocalDateTime.now(clock));
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

  private void validateEmailNotDuplicated(Long memberId, String email) {
    memberRepository
        .findByEmail(email)
        .filter(existing -> !existing.getId().equals(memberId))
        .ifPresent(existing -> {
          throw new ServiceException(ERROR_CODE_CONFLICT, ERROR_MSG_EMAIL_EXISTS);
        });
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

  private void validateCurrentPassword(Member member, String currentPassword) {
    if (currentPassword == null || currentPassword.isBlank()) {
      throw new ServiceException(ERROR_CODE_BAD_REQUEST, ERROR_MSG_CURRENT_PASSWORD_BLANK);
    }

    if (!member.matchesPassword(currentPassword, passwordEncoder)) {
      throw new ServiceException("401-2", ERROR_MSG_INVALID_CURRENT_PASSWORD);
    }
  }

  @Transactional
  public MemberResponse toggleRandomReceive(Long memberId) {
    Member member = findMemberById(memberId);
    member.updateRandomReceiveAllowed(!member.isRandomReceiveAllowed());
    return MemberResponse.from(member);
  }
}
