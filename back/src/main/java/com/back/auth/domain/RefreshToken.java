package com.back.auth.domain;

import com.back.global.jpa.entity.BaseEntity;
import com.back.member.domain.Member;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** 리프레시 토큰 회전/폐기 이력을 DB에 추적하기 위한 엔티티. */
@Getter
@Entity
@Table(
    name = "refresh_tokens",
    uniqueConstraints = {@UniqueConstraint(name = "uk_refresh_tokens_jti", columnNames = "jti")})
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RefreshToken extends BaseEntity {

  /** 토큰 소유 회원. */
  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "member_id", nullable = false)
  private Member member;

  /** 토큰 1개를 식별하는 고유 ID(JWT jti). */
  @Column(nullable = false, length = 80)
  private String jti;

  /** 리프레시 토큰 원문이 아닌 해시 저장값. */
  @Column(name = "token", nullable = false, length = 255)
  private String tokenHash;

  /** 토큰 만료 시각. */
  @Column(name = "expires_at", nullable = false)
  private LocalDateTime expiresAt;

  /** 토큰 폐기 시각(폐기 전에는 null). */
  @Column(name = "revoked_at")
  private LocalDateTime revokedAt;

  /** 같은 회전 체인(세션 라인)을 식별하는 ID. */
  @Column(name = "token_family_id", nullable = false, length = 80)
  private String familyId;

  /** 회전으로 대체된 다음 토큰의 jti. */
  @Column(name = "replaced_by", length = 80)
  private String replacedBy;

  private RefreshToken(
      Member member,
      String jti,
      String tokenHash,
      LocalDateTime expiresAt,
      String familyId,
      LocalDateTime revokedAt,
      String replacedBy) {
    this.member = member;
    this.jti = jti;
    this.tokenHash = tokenHash;
    this.expiresAt = expiresAt;
    this.familyId = familyId;
    this.revokedAt = revokedAt;
    this.replacedBy = replacedBy;
  }

  /** 새 리프레시 토큰 발급 엔트리 생성. familyId가 없으면 현재 jti를 familyId로 사용한다. */
  public static RefreshToken issue(
      Member member, String jti, String tokenHash, LocalDateTime expiresAt, String familyId) {
    return new RefreshToken(
        member, jti, tokenHash, expiresAt, normalizeFamilyId(familyId, jti), null, null);
  }

  /** 토큰을 폐기하고, 회전 케이스면 대체 토큰 jti를 기록한다. */
  public void revoke(LocalDateTime revokedAt, String replacedBy) {
    if (this.revokedAt == null) {
      this.revokedAt = revokedAt;
    }
    this.replacedBy = replacedBy;
  }

  /** 현재 시점 기준 활성 토큰인지 판별한다. */
  public boolean isActive(LocalDateTime now) {
    return revokedAt == null && expiresAt.isAfter(now);
  }

  private static String normalizeFamilyId(String familyId, String jti) {
    if (familyId == null || familyId.isBlank()) {
      return jti;
    }
    return familyId;
  }
}
