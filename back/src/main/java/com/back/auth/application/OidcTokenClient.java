package com.back.auth.application;

import org.springframework.security.oauth2.client.registration.ClientRegistration;

/** OIDC provider token endpoint(code -> token) 교환 인터페이스. */
public interface OidcTokenClient {

  /** 인가 코드를 provider token endpoint로 교환한다. */
  OidcTokenResponse exchangeCode(
      ClientRegistration clientRegistration,
      String code,
      String redirectUri,
      String codeVerifier);

  /** token endpoint 응답 DTO. */
  record OidcTokenResponse(
      String accessToken,
      String idToken,
      String tokenType,
      Long expiresIn,
      String scope) {}
}
