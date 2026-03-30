package com.back.auth.domain;

import com.back.global.exception.ServiceException;
import com.back.member.domain.Member;
import java.time.LocalDateTime;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 리프레시 토큰의 발급/조회/회전/폐기 도메인 규칙을 담당하는 서비스. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RefreshTokenDomainService {

  private static final String ERROR_CODE_REFRESH_TOKEN_NOT_FOUND = "404-2";
  private static final String ERROR_MSG_REFRESH_TOKEN_NOT_FOUND = "Refresh token not found.";
  private static final String ERROR_CODE_REFRESH_TOKEN_INACTIVE = "409-2";
  private static final String ERROR_MSG_REFRESH_TOKEN_INACTIVE = "Refresh token is not active.";

  private final RefreshTokenRepository refreshTokenRepository;

  /** 새 리프레시 토큰을 저장한다. */
  @Transactional
  public RefreshToken saveIssuedToken(
      Member member, String jti, String tokenHash, LocalDateTime expiresAt, String familyId) {
    RefreshToken refreshToken = RefreshToken.issue(member, jti, tokenHash, expiresAt, familyId);
    return refreshTokenRepository.save(refreshToken);
  }

  /** 활성 상태인 리프레시 토큰만 조회한다. */
  public Optional<RefreshToken> findActiveByJti(String jti, LocalDateTime now) {
    return refreshTokenRepository.findByJtiAndRevokedAtIsNullAndExpiresAtAfter(jti, now);
  }

  /** jti 기준으로 토큰을 상태와 무관하게 조회한다(재사용 탐지용). */
  public Optional<RefreshToken> findByJti(String jti) {
    return refreshTokenRepository.findByJti(jti);
  }

  /** refresh 회전 직전 현재 토큰을 배타 잠금으로 조회한다. */
  public Optional<RefreshToken> findByJtiForUpdate(String jti) {
    return refreshTokenRepository.findByJtiForUpdate(jti);
  }

  /** 리프레시 토큰 회전: 기존 토큰 폐기 후 같은 familyId로 새 토큰을 저장한다. */
  @Transactional
  public RefreshToken rotate(
      String currentJti,
      String nextJti,
      String nextTokenHash,
      LocalDateTime nextExpiresAt,
      LocalDateTime now) {
    RefreshToken current = findByJtiForUpdateOrThrow(currentJti);
    return rotate(current, nextJti, nextTokenHash, nextExpiresAt, now);
  }

  /** 이미 잠금으로 확보한 현재 토큰 기준으로 회전을 완료한다. */
  @Transactional
  public RefreshToken rotate(
      RefreshToken current,
      String nextJti,
      String nextTokenHash,
      LocalDateTime nextExpiresAt,
      LocalDateTime now) {
    if (current == null) {
      throw new ServiceException(ERROR_CODE_REFRESH_TOKEN_NOT_FOUND, ERROR_MSG_REFRESH_TOKEN_NOT_FOUND);
    }

    if (!current.isActive(now)) {
      throw new ServiceException(ERROR_CODE_REFRESH_TOKEN_INACTIVE, ERROR_MSG_REFRESH_TOKEN_INACTIVE);
    }

    current.revoke(now, nextJti);

    RefreshToken next =
        RefreshToken.issue(
            current.getMember(), nextJti, nextTokenHash, nextExpiresAt, current.getFamilyId());
    return refreshTokenRepository.save(next);
  }

  /** 단일 리프레시 토큰을 폐기한다. */
  @Transactional
  public void revoke(String jti, LocalDateTime revokedAt) {
    RefreshToken refreshToken = findByJtiOrThrow(jti);

    refreshToken.revoke(revokedAt, null);
  }

  /** 같은 familyId 체인에 속한 토큰들을 일괄 폐기한다(재사용 탐지 대응). */
  @Transactional
  public void revokeFamily(String familyId, LocalDateTime revokedAt) {
    refreshTokenRepository
        .findAllByFamilyIdOrderByIdAsc(familyId)
        .forEach(token -> token.revoke(revokedAt, null));
  }

  /** 특정 회원이 가진 활성 refresh 토큰들을 전부 폐기한다. */
  @Transactional
  public void revokeAllByMemberId(Long memberId, LocalDateTime revokedAt) {
    refreshTokenRepository
        .findAllByMember_IdAndRevokedAtIsNull(memberId)
        .forEach(token -> token.revoke(revokedAt, null));
  }

  private RefreshToken findByJtiOrThrow(String jti) {
    return refreshTokenRepository
        .findByJti(jti)
        .orElseThrow(
            () ->
                new ServiceException(
                    ERROR_CODE_REFRESH_TOKEN_NOT_FOUND, ERROR_MSG_REFRESH_TOKEN_NOT_FOUND));
  }

  private RefreshToken findByJtiForUpdateOrThrow(String jti) {
    return refreshTokenRepository
        .findByJtiForUpdate(jti)
        .orElseThrow(
            () ->
                new ServiceException(
                    ERROR_CODE_REFRESH_TOKEN_NOT_FOUND, ERROR_MSG_REFRESH_TOKEN_NOT_FOUND));
  }
}
