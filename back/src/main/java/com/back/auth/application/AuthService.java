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
import java.time.Clock;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
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

  private static final String ERROR_CODE_BAD_REQUEST = "400-1";
  private static final String ERROR_MSG_EMAIL_BLANK = "email must not be blank.";
  private static final String ERROR_MSG_PASSWORD_BLANK = "password must not be blank.";
  private static final String ROLE_PREFIX = "ROLE_";
  private static final String DEFAULT_NICKNAME = "anonymous";

  private final MemberRepository memberRepository;
  private final PasswordEncoder passwordEncoder;
  private final JwtTokenService jwtTokenService;
  private final JwtProperties jwtProperties;
  private final RefreshTokenDomainService refreshTokenDomainService;
  private final Clock clock;

  /** 회원 가입 처리: 이메일 중복 체크 후 비밀번호 해시를 저장한다. */
  @Transactional
  public AuthMemberResponse signup(AuthSignupRequest request) {
    String email = normalizeEmail(request.email());
    validateEmailNotDuplicated(email);
    String passwordHash = passwordEncoder.encode(requirePassword(request.password()));
    Member member = Member.create(email, passwordHash, request.nickname());
    return AuthMemberResponse.from(memberRepository.save(member));
  }

  /** 로그인 처리: 비밀번호 검증 후 access/refresh 토큰을 발급한다. */
  @Transactional
  public AuthTokenIssueResult login(AuthLoginRequest request) {
    String email = normalizeEmail(request.email());
    String rawPassword = requirePassword(request.password());
    Member member = findByEmailForLogin(email);

    if (!member.matchesPassword(rawPassword, passwordEncoder)) {
      throw AuthErrorCode.INVALID_EMAIL_OR_PASSWORD.toException();
    }

    assertMemberCanAuthenticate(member);
    return issueTokenPair(member, UUID.randomUUID().toString());
  }

  /** OIDC 로그인 처리: 이메일로 회원을 조회하고 없으면 생성한 뒤 access/refresh 토큰을 발급한다. */
  @Transactional
  public AuthTokenIssueResult oidcLogin(String email, String nickname) {
    String normalizedEmail = normalizeEmail(email);
    String normalizedNickname = normalizeNickname(nickname, normalizedEmail);

    Member member =
        memberRepository
            .findByEmail(normalizedEmail)
            .orElseGet(() -> createOidcMember(normalizedEmail, normalizedNickname));

    assertMemberCanAuthenticate(member);
    return issueTokenPairForMember(member);
  }

  /** 이미 식별된 회원 기준으로 기존 내부 토큰 발급 경로를 재사용한다. */
  @Transactional
  public AuthTokenIssueResult issueTokenPairForMember(Member member) {
    if (member == null) {
      throw AuthErrorCode.MEMBER_NOT_FOUND.toException();
    }
    assertMemberCanAuthenticate(member);
    return issueTokenPair(member, UUID.randomUUID().toString());
  }

  /** refresh 회전 처리: 기존 토큰 폐기 + 신규 refresh/access 토큰 발급. */
  @Transactional(noRollbackFor = ServiceException.class)
  public AuthTokenIssueResult refresh(String rawRefreshToken) {
    if (!StringUtils.hasText(rawRefreshToken)) {
      throw AuthErrorCode.REFRESH_TOKEN_REQUIRED.toException();
    }
    if (!jwtTokenService.validate(rawRefreshToken)) {
      throw AuthErrorCode.REFRESH_TOKEN_INVALID.toException();
    }

    JwtRefreshSubject refreshSubject = parseRefreshSubject(rawRefreshToken);
    LocalDateTime now = currentDateTime();
    RefreshToken current =
        refreshTokenDomainService
            .findByJtiForUpdate(refreshSubject.jti())
            .orElseThrow(AuthErrorCode.REFRESH_TOKEN_INVALID::toException);

    if (!matchesRefreshToken(rawRefreshToken, current.getTokenHash())) {
      throw AuthErrorCode.REFRESH_TOKEN_INVALID.toException();
    }

    if (current.getRevokedAt() != null) {
      if (now.isAfter(current.getRevokedAt().plusSeconds(15))) {
        refreshTokenDomainService.revokeFamily(current.getFamilyId(), now);
        throw AuthErrorCode.REFRESH_TOKEN_REUSE_DETECTED.toException();
      }
      // If within 15 seconds grace period, proceed with rotation to handle concurrent network requests
    }

    if (!current.getExpiresAt().isAfter(now)) {
      throw AuthErrorCode.REFRESH_TOKEN_INVALID.toException();
    }

    Member member = current.getMember();
    if (!Objects.equals(member.getId(), refreshSubject.memberId())) {
      throw AuthErrorCode.REFRESH_TOKEN_INVALID.toException();
    }
    assertMemberCanAuthenticate(member);

    String nextJti = UUID.randomUUID().toString();
    String nextRefreshToken =
        jwtTokenService.generateRefreshToken(member.getId(), nextJti, current.getFamilyId());
    String nextRefreshTokenHash = hashRefreshToken(nextRefreshToken);

    LocalDateTime expiresAt = now.plusSeconds(jwtProperties.refreshTokenExpireSeconds());

    if (current.getRevokedAt() != null) {
      refreshTokenDomainService.saveIssuedToken(
          member, nextJti, nextRefreshTokenHash, expiresAt, current.getFamilyId());
    } else {
      refreshTokenDomainService.rotate(
          current, nextJti, nextRefreshTokenHash, expiresAt, now);
    }

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
        .filter(stored -> matchesRefreshToken(rawRefreshToken, stored.getTokenHash()))
        .filter(stored -> stored.getRevokedAt() == null)
        .filter(stored -> stored.getExpiresAt().isAfter(currentDateTime()))
        .ifPresent(
            stored -> refreshTokenDomainService.revoke(stored.getJti(), currentDateTime()));
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
    assertMemberCanAuthenticate(member);
    return AuthMemberResponse.from(member);
  }

  private JwtRefreshSubject parseRefreshSubject(String rawRefreshToken) {
    try {
      return jwtTokenService.parseRefreshToken(rawRefreshToken);
    } catch (IllegalArgumentException exception) {
      throw AuthErrorCode.REFRESH_TOKEN_INVALID.toException();
    }
  }

  private AuthTokenIssueResult issueTokenPair(Member member, String familyId) {
    String refreshJti = UUID.randomUUID().toString();
    String refreshToken =
        jwtTokenService.generateRefreshToken(member.getId(), refreshJti, familyId);
    String refreshTokenHash = hashRefreshToken(refreshToken);
    LocalDateTime now = currentDateTime();

    refreshTokenDomainService.saveIssuedToken(
        member,
        refreshJti,
        refreshTokenHash,
        now.plusSeconds(jwtProperties.refreshTokenExpireSeconds()),
        familyId);

    String accessToken = generateAccessToken(member);
    return new AuthTokenIssueResult(toTokenResponse(accessToken, member), refreshToken);
  }

  private String generateAccessToken(Member member) {
    return jwtTokenService.generateAccessToken(
        member.getId(), member.getEmail(), List.of(ROLE_PREFIX + member.getRole().name()));
  }

  private AuthTokenResponse toTokenResponse(String accessToken, Member member) {
    return new AuthTokenResponse(
        accessToken,
        "Bearer",
        jwtProperties.accessTokenExpireSeconds(),
        AuthMemberResponse.from(member));
  }

  private Member createOidcMember(String email, String nickname) {
    String generatedPasswordHash = passwordEncoder.encode(UUID.randomUUID().toString());
    Member member = Member.create(email, generatedPasswordHash, nickname);
    return memberRepository.save(member);
  }

  private void assertMemberCanAuthenticate(Member member) {
    if (member.getStatus() == MemberStatus.BLOCKED) {
      throw AuthErrorCode.MEMBER_BLOCKED.toException();
    }
    if (member.getStatus() == MemberStatus.WITHDRAWN) {
      throw AuthErrorCode.MEMBER_WITHDRAWN.toException();
    }
  }

  private LocalDateTime currentDateTime() {
    return LocalDateTime.now(clock);
  }

  private String normalizeEmail(String email) {
    if (!StringUtils.hasText(email)) {
      throw new ServiceException(ERROR_CODE_BAD_REQUEST, ERROR_MSG_EMAIL_BLANK);
    }
    return email.trim().toLowerCase(Locale.ROOT);
  }

  private String requirePassword(String password) {
    if (!StringUtils.hasText(password)) {
      throw new ServiceException(ERROR_CODE_BAD_REQUEST, ERROR_MSG_PASSWORD_BLANK);
    }
    return password;
  }

  private String normalizeNickname(String nickname, String emailFallback) {
    if (StringUtils.hasText(nickname)) {
      return nickname.trim();
    }

    int atIndex = emailFallback.indexOf('@');
    if (atIndex > 0) {
      return emailFallback.substring(0, atIndex);
    }

    return DEFAULT_NICKNAME;
  }

  /**
   * refresh 토큰 저장용 해시를 생성한다.
   *
   * <p>BCrypt(72 bytes 제한) 대신 SHA-256을 사용해 JWT 길이와 무관하게 안정적으로 처리한다.
   */
  private String hashRefreshToken(String rawRefreshToken) {
    try {
      MessageDigest digest = MessageDigest.getInstance("SHA-256");
      byte[] hashBytes = digest.digest(rawRefreshToken.getBytes(StandardCharsets.UTF_8));
      return Base64.getUrlEncoder().withoutPadding().encodeToString(hashBytes);
    } catch (NoSuchAlgorithmException exception) {
      throw new IllegalStateException("SHA-256 algorithm is not available.", exception);
    }
  }

  private boolean matchesRefreshToken(String rawRefreshToken, String storedTokenHash) {
    String calculatedHash = hashRefreshToken(rawRefreshToken);
    return MessageDigest.isEqual(
        calculatedHash.getBytes(StandardCharsets.UTF_8),
        storedTokenHash.getBytes(StandardCharsets.UTF_8));
  }

  private void validateEmailNotDuplicated(String email) {
    if (memberRepository.existsByEmail(email)) {
      throw AuthErrorCode.EMAIL_ALREADY_EXISTS.toException();
    }
  }

  private Member findByEmailForLogin(String email) {
    return memberRepository
        .findByEmail(email)
        .orElseThrow(AuthErrorCode.INVALID_EMAIL_OR_PASSWORD::toException);
  }

  /** 컨트롤러에서 쿠키 발급을 위해 사용하는 access/refresh 발급 결과 DTO. */
  public record AuthTokenIssueResult(AuthTokenResponse response, String refreshToken) {}
}
