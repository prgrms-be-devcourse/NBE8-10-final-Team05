package com.back.auth.domain;

import com.back.auth.application.OidcAuthorizationRequestService;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** OIDC authorize 단계의 state/nonce/codeVerifier를 외부 저장소(DB)에 보관하는 엔티티. */
@Getter
@Entity
@Table(name = "oidc_authorization_states")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class OidcAuthorizationStateEntity {

  /** authorize 요청 1건을 식별하는 자연 키. */
  @Id
  @Column(nullable = false, length = 120)
  private String state;

  /** 등록된 OIDC provider 식별자. */
  @Column(nullable = false, length = 80)
  private String provider;

  /** callback 완료 후 프론트로 복귀시킬 redirect URI. */
  @Column(name = "redirect_uri", nullable = false, length = 500)
  private String redirectUri;

  /** ID Token nonce 검증용 값. */
  @Column(nullable = false, length = 120)
  private String nonce;

  /** PKCE code_verifier 원문. */
  @Column(name = "code_verifier", nullable = false, length = 200)
  private String codeVerifier;

  /** authorize 시작 시각. */
  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  /** state 만료 시각. */
  @Column(name = "expires_at", nullable = false)
  private Instant expiresAt;

  /** callback에서 소비된 시각. null이면 아직 미사용 상태다. */
  @Column(name = "consumed_at")
  private Instant consumedAt;

  private OidcAuthorizationStateEntity(
      String state,
      String provider,
      String redirectUri,
      String nonce,
      String codeVerifier,
      Instant createdAt,
      Instant expiresAt,
      Instant consumedAt) {
    this.state = state;
    this.provider = provider;
    this.redirectUri = redirectUri;
    this.nonce = nonce;
    this.codeVerifier = codeVerifier;
    this.createdAt = createdAt;
    this.expiresAt = expiresAt;
    this.consumedAt = consumedAt;
  }

  /** 서비스 모델을 DB 엔티티로 변환한다. */
  public static OidcAuthorizationStateEntity from(
      OidcAuthorizationRequestService.OidcAuthorizationState model) {
    return new OidcAuthorizationStateEntity(
        model.state(),
        model.provider(),
        model.redirectUri(),
        model.nonce(),
        model.codeVerifier(),
        model.createdAt(),
        model.expiresAt(),
        model.consumedAt());
  }

  /** DB 엔티티를 서비스 모델로 되돌린다. */
  public OidcAuthorizationRequestService.OidcAuthorizationState toModel() {
    return new OidcAuthorizationRequestService.OidcAuthorizationState(
        state, provider, redirectUri, nonce, codeVerifier, createdAt, expiresAt, consumedAt);
  }
}
