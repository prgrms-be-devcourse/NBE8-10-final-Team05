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
import org.springframework.util.StringUtils;

/** 외부 OAuth/OIDC 계정과 내부 회원(Member) 매핑 정보. */
@Getter
@Entity
@Table(
    name = "oauth_accounts",
    uniqueConstraints = {
      @UniqueConstraint(
          name = "uk_oauth_accounts_provider_user",
          columnNames = {"provider", "provider_user_id"}),
      @UniqueConstraint(
          name = "uk_oauth_accounts_member_provider",
          columnNames = {"member_id", "provider"})
    })
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class OAuthAccount extends BaseEntity {

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "member_id", nullable = false)
  private Member member;

  @Column(nullable = false, length = 40)
  private String provider;

  @Column(name = "provider_user_id", nullable = false, length = 120)
  private String providerUserId;

  @Column(name = "email_at_provider", length = 120)
  private String emailAtProvider;

  @Column(name = "connected_at", nullable = false)
  private LocalDateTime connectedAt;

  @Column(name = "last_login_at", nullable = false)
  private LocalDateTime lastLoginAt;

  private OAuthAccount(
      Member member,
      String provider,
      String providerUserId,
      String emailAtProvider,
      LocalDateTime connectedAt,
      LocalDateTime lastLoginAt) {
    this.member = member;
    this.provider = provider;
    this.providerUserId = providerUserId;
    this.emailAtProvider = emailAtProvider;
    this.connectedAt = connectedAt;
    this.lastLoginAt = lastLoginAt;
  }

  /** 신규 외부 계정 연결 엔트리 생성. */
  public static OAuthAccount connect(
      Member member, String provider, String providerUserId, String emailAtProvider) {
    LocalDateTime now = LocalDateTime.now();
    return new OAuthAccount(
        member,
        normalizeProvider(provider),
        normalizeProviderUserId(providerUserId),
        normalizeEmail(emailAtProvider),
        now,
        now);
  }

  /** 로그인 성공 시 마지막 로그인 시각을 갱신한다. */
  public void touchLastLoginAt(LocalDateTime now) {
    if (now == null) {
      throw new IllegalArgumentException("last login time must not be null");
    }
    this.lastLoginAt = now;
  }

  public void updateEmailAtProvider(String emailAtProvider) {
    this.emailAtProvider = normalizeEmail(emailAtProvider);
  }

  private static String normalizeProvider(String provider) {
    if (!StringUtils.hasText(provider)) {
      throw new IllegalArgumentException("provider must not be blank");
    }
    return provider.trim().toLowerCase();
  }

  private static String normalizeProviderUserId(String providerUserId) {
    if (!StringUtils.hasText(providerUserId)) {
      throw new IllegalArgumentException("providerUserId must not be blank");
    }
    return providerUserId.trim();
  }

  private static String normalizeEmail(String email) {
    if (!StringUtils.hasText(email)) {
      return null;
    }
    return email.trim().toLowerCase();
  }
}
