package com.back.auth.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.back.member.domain.Member;
import com.back.member.domain.MemberRepository;
import java.time.LocalDateTime;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(RefreshTokenDomainService.class)
@DisplayName("리프레시 토큰 도메인 서비스 테스트")
class RefreshTokenDomainServiceTest {

  @Autowired private RefreshTokenDomainService refreshTokenDomainService;
  @Autowired private RefreshTokenRepository refreshTokenRepository;
  @Autowired private MemberRepository memberRepository;

  @Test
  @DisplayName("토큰 회전 시 기존 토큰은 폐기되고 replacedBy가 기록된다")
  void rotateTracksRevokedAndReplacementState() {
    LocalDateTime now = LocalDateTime.now();
    Member member =
        memberRepository.save(Member.create("member1@test.com", "$2a$10$hashValue", "m1"));

    refreshTokenDomainService.saveIssuedToken(
        member, "jti-1", "token-hash-1", now.plusDays(30), "family-1");

    RefreshToken rotated =
        refreshTokenDomainService.rotate(
            "jti-1", "jti-2", "token-hash-2", now.plusDays(60), now.plusSeconds(1));

    RefreshToken previous = refreshTokenRepository.findByJti("jti-1").orElseThrow();
    assertThat(previous.getRevokedAt()).isNotNull();
    assertThat(previous.getReplacedBy()).isEqualTo("jti-2");

    assertThat(rotated.getJti()).isEqualTo("jti-2");
    assertThat(rotated.getFamilyId()).isEqualTo("family-1");
    assertThat(rotated.getRevokedAt()).isNull();
    assertThat(refreshTokenDomainService.findActiveByJti("jti-1", now.plusSeconds(2))).isEmpty();
    assertThat(refreshTokenDomainService.findActiveByJti("jti-2", now.plusSeconds(2))).isPresent();
  }

  @Test
  @DisplayName("토큰 폐기 시 revokedAt이 기록되고 활성 조회에서 제외된다")
  void revokeTracksRevokedAtState() {
    LocalDateTime now = LocalDateTime.now();
    Member member =
        memberRepository.save(Member.create("member2@test.com", "$2a$10$hashValue", "m2"));

    refreshTokenDomainService.saveIssuedToken(
        member, "jti-3", "token-hash-3", now.plusDays(30), null);
    refreshTokenDomainService.revoke("jti-3", now.plusMinutes(10));

    RefreshToken revoked = refreshTokenRepository.findByJti("jti-3").orElseThrow();
    assertThat(revoked.getRevokedAt()).isNotNull();
    assertThat(refreshTokenDomainService.findActiveByJti("jti-3", now.plusMinutes(11))).isEmpty();
  }

  @Test
  @DisplayName("jti는 DB 유니크 제약을 만족해야 한다")
  void jtiMustBeUnique() {
    Member member =
        memberRepository.save(Member.create("member3@test.com", "$2a$10$hashValue", "m3"));
    LocalDateTime expiresAt = LocalDateTime.now().plusDays(30);

    refreshTokenRepository.saveAndFlush(
        RefreshToken.issue(member, "duplicate-jti", "token-hash-4", expiresAt, "family-2"));

    assertThatThrownBy(
            () ->
                refreshTokenRepository.saveAndFlush(
                    RefreshToken.issue(
                        member, "duplicate-jti", "token-hash-5", expiresAt, "family-2")))
        .isInstanceOf(DataIntegrityViolationException.class);
  }
}
