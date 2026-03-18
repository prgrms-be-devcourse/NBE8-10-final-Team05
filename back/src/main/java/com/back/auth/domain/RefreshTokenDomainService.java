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

  /** 리프레시 토큰 회전: 기존 토큰 폐기 후 같은 familyId로 새 토큰을 저장한다. */
  @Transactional
  public RefreshToken rotate(
      String currentJti,
      String nextJti,
      String nextTokenHash,
      LocalDateTime nextExpiresAt,
      LocalDateTime now) {
    RefreshToken current =
        refreshTokenRepository
            .findByJti(currentJti)
            .orElseThrow(() -> new ServiceException("404-2", "Refresh token not found."));

    if (!current.isActive(now)) {
      throw new ServiceException("409-2", "Refresh token is not active.");
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
    RefreshToken refreshToken =
        refreshTokenRepository
            .findByJti(jti)
            .orElseThrow(() -> new ServiceException("404-2", "Refresh token not found."));

    refreshToken.revoke(revokedAt, null);
  }
}
