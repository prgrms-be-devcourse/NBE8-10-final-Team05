package com.back.auth.application;

import com.back.auth.adapter.in.web.dto.AuthLoginRequest;
import com.back.auth.adapter.in.web.dto.AuthMemberResponse;
import com.back.auth.adapter.in.web.dto.AuthSignupRequest;
import com.back.auth.adapter.in.web.dto.AuthTokenResponse;
import com.back.auth.domain.RefreshToken;
import com.back.auth.domain.RefreshTokenDomainService;
import com.back.global.exception.ServiceException;
import com.back.global.security.adapter.in.AuthenticatedMember;
import com.back.global.security.jwt.JwtProperties;
import com.back.global.security.jwt.JwtRefreshSubject;
import com.back.global.security.jwt.JwtTokenService;
import com.back.member.domain.Member;
import com.back.member.domain.MemberRepository;
import com.back.member.domain.MemberStatus;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/** 회원 가입/로그인/재발급/로그아웃/내 정보 조회 인증 유스케이스를 담당하는 서비스. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AuthService {

  private final MemberRepository memberRepository;
  private final PasswordEncoder passwordEncoder;
  private final JwtTokenService jwtTokenService;
  private final JwtProperties jwtProperties;
  private final RefreshTokenDomainService refreshTokenDomainService;

  /** 회원 가입 처리: 이메일 중복 체크 후 비밀번호 해시를 저장한다. */
  @Transactional
  public AuthMemberResponse signup(AuthSignupRequest request) {
    String email = normalizeEmail(request.email());
    String rawPassword = normalizePassword(request.password());

    if (memberRepository.existsByEmail(email)) {
      throw AuthErrorCode.EMAIL_ALREADY_EXISTS.toException();
    }

    String passwordHash = passwordEncoder.encode(rawPassword);
    Member member = Member.create(email, passwordHash, request.nickname());
    return AuthMemberResponse.from(memberRepository.save(member));
  }

  /** 로그인 처리: 비밀번호 검증 후 access/refresh 토큰을 발급한다. */
  @Transactional
  public AuthTokenIssueResult login(AuthLoginRequest request) {
    String email = normalizeEmail(request.email());
    String rawPassword = normalizePassword(request.password());
    Member member =
        memberRepository
            .findByEmail(email)
            .orElseThrow(AuthErrorCode.INVALID_EMAIL_OR_PASSWORD::toException);

    if (!member.matchesPassword(rawPassword, passwordEncoder)) {
      throw AuthErrorCode.INVALID_EMAIL_OR_PASSWORD.toException();
    }

    assertMemberCanAuthenticate(member);

    String refreshJti = UUID.randomUUID().toString();
    String familyId = UUID.randomUUID().toString();
    String refreshToken =
        jwtTokenService.generateRefreshToken(member.getId(), refreshJti, familyId);
    String refreshTokenHash = passwordEncoder.encode(refreshToken);
    LocalDateTime now = LocalDateTime.now();

    refreshTokenDomainService.saveIssuedToken(
        member,
        refreshJti,
        refreshTokenHash,
        now.plusSeconds(jwtProperties.refreshTokenExpireSeconds()),
        familyId);

    String accessToken = generateAccessToken(member);
    return new AuthTokenIssueResult(toTokenResponse(accessToken, member), refreshToken);
  }

  /** refresh 회전 처리: 기존 토큰 폐기 + 신규 refresh/access 토큰 발급. */
  @Transactional
  public AuthTokenIssueResult refresh(String rawRefreshToken) {
    if (!StringUtils.hasText(rawRefreshToken)) {
      throw AuthErrorCode.REFRESH_TOKEN_REQUIRED.toException();
    }
    if (!jwtTokenService.validate(rawRefreshToken)) {
      throw AuthErrorCode.REFRESH_TOKEN_INVALID.toException();
    }

    JwtRefreshSubject refreshSubject = parseRefreshSubject(rawRefreshToken);
    LocalDateTime now = LocalDateTime.now();
    RefreshToken current =
        refreshTokenDomainService
            .findByJti(refreshSubject.jti())
            .orElseThrow(AuthErrorCode.REFRESH_TOKEN_INVALID::toException);

    if (!passwordEncoder.matches(rawRefreshToken, current.getTokenHash())) {
      throw AuthErrorCode.REFRESH_TOKEN_INVALID.toException();
    }

    if (current.getRevokedAt() != null) {
      refreshTokenDomainService.revokeFamily(current.getFamilyId(), now);
      throw AuthErrorCode.REFRESH_TOKEN_REUSE_DETECTED.toException();
    }

    if (!current.getExpiresAt().isAfter(now)) {
      throw AuthErrorCode.REFRESH_TOKEN_INVALID.toException();
    }

    Member member = current.getMember();
    if (member.getId() != refreshSubject.memberId()) {
      throw AuthErrorCode.REFRESH_TOKEN_INVALID.toException();
    }
    assertMemberCanAuthenticate(member);

    String nextJti = UUID.randomUUID().toString();
    String nextRefreshToken =
        jwtTokenService.generateRefreshToken(member.getId(), nextJti, current.getFamilyId());
    String nextRefreshTokenHash = passwordEncoder.encode(nextRefreshToken);


    refreshTokenDomainService.rotate(
        current.getJti(),
        nextJti,
        nextRefreshTokenHash,
        now.plusSeconds(jwtProperties.refreshTokenExpireSeconds()),
        now);

    String accessToken = generateAccessToken(member);
    return new AuthTokenIssueResult(toTokenResponse(accessToken, member), nextRefreshToken);
  }

  /** 로그아웃 처리: refresh 토큰이 유효하면 폐기한다(없거나 무효면 무시). */
  @Transactional
  public void logout(String rawRefreshToken) {
    if (!StringUtils.hasText(rawRefreshToken) || !jwtTokenService.validate(rawRefreshToken)) {
      return;
    }

    JwtRefreshSubject refreshSubject;
    try {
      refreshSubject = jwtTokenService.parseRefreshToken(rawRefreshToken);
    } catch (IllegalArgumentException exception) {
      return;
    }

    refreshTokenDomainService
        .findByJti(refreshSubject.jti())
        .filter(stored -> passwordEncoder.matches(rawRefreshToken, stored.getTokenHash()))
        .filter(stored -> stored.getRevokedAt() == null)
        .filter(stored -> stored.getExpiresAt().isAfter(LocalDateTime.now()))
        .ifPresent(
            stored -> refreshTokenDomainService.revoke(stored.getJti(), LocalDateTime.now()));
  }

  /** 현재 로그인한 사용자 정보 조회. */
  public AuthMemberResponse me(AuthenticatedMember authenticatedMember) {
    if (authenticatedMember == null || authenticatedMember.memberId() == null) {
      throw AuthErrorCode.AUTHENTICATION_REQUIRED.toException();
    }

    Member member =
        memberRepository
            .findById(authenticatedMember.memberId())
            .orElseThrow(AuthErrorCode.MEMBER_NOT_FOUND::toException);
    return AuthMemberResponse.from(member);
  }

  private JwtRefreshSubject parseRefreshSubject(String rawRefreshToken) {
    try {
      return jwtTokenService.parseRefreshToken(rawRefreshToken);
    } catch (IllegalArgumentException exception) {
      throw AuthErrorCode.REFRESH_TOKEN_INVALID.toException();
    }
  }

  private String generateAccessToken(Member member) {
    return jwtTokenService.generateAccessToken(
        member.getId(), member.getEmail(), List.of("ROLE_" + member.getRole().name()));
  }

  private AuthTokenResponse toTokenResponse(String accessToken, Member member) {
    return new AuthTokenResponse(
        accessToken,
        "Bearer",
        jwtProperties.accessTokenExpireSeconds(),
        AuthMemberResponse.from(member));
  }

  private void assertMemberCanAuthenticate(Member member) {
    if (member.getStatus() == MemberStatus.BLOCKED) {
      throw AuthErrorCode.MEMBER_BLOCKED.toException();
    }
    if (member.getStatus() == MemberStatus.WITHDRAWN) {
      throw AuthErrorCode.MEMBER_WITHDRAWN.toException();
    }
  }

  private String normalizeEmail(String email) {
    if (!StringUtils.hasText(email)) {
      throw new ServiceException("400-1", "email must not be blank.");
    }
    return email.trim().toLowerCase();
  }

  private String normalizePassword(String password) {
    if (!StringUtils.hasText(password)) {
      throw new ServiceException("400-1", "password must not be blank.");
    }
    return password;
  }

  /** 컨트롤러에서 쿠키 발급을 위해 사용하는 access/refresh 발급 결과 DTO. */
  public record AuthTokenIssueResult(AuthTokenResponse response, String refreshToken) {}
}
