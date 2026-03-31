package com.back.auth.application;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.core.ClientAuthenticationMethod;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

/**
 * OIDC provider token endpoint(code -> token) 호출 구현체.
 *
 * <p>역할:
 *
 * <ul>
 *   <li>인가 코드(`code`)를 토큰 엔드포인트로 교환한다.
 *   <li>PKCE(`code_verifier`)를 함께 전달해 코드 탈취 공격을 방어한다.
 *   <li>provider의 client 인증 방식(`client_secret_basic`, `client_secret_post`)을 분기 처리한다.
 *   <li>응답 본문에서 최소 필드(`id_token`) 존재를 검증하고 도메인 DTO로 변환한다.
 * </ul>
 *
 * <p>실패 처리 원칙:
 *
 * <ul>
 *   <li>HTTP 오류/네트워크 오류는 내부 구현을 노출하지 않고 `OIDC_TOKEN_EXCHANGE_FAILED`로 통일한다.
 *   <li>`id_token` 누락은 보안상 유효하지 않은 응답으로 보고 `OIDC_ID_TOKEN_INVALID`로 처리한다.
 * </ul>
 */
@Component
@RequiredArgsConstructor
public class DefaultOidcTokenClient implements OidcTokenClient {

  private static final Logger log = LoggerFactory.getLogger(DefaultOidcTokenClient.class);
  private static final String PARAM_GRANT_TYPE = "grant_type";
  private static final String PARAM_CODE = "code";
  private static final String PARAM_REDIRECT_URI = "redirect_uri";
  private static final String PARAM_CODE_VERIFIER = "code_verifier";
  private static final String PARAM_CLIENT_ID = "client_id";
  private static final String PARAM_CLIENT_SECRET = "client_secret";
  private static final String PARAM_ACCESS_TOKEN = "access_token";
  private static final String PARAM_ID_TOKEN = "id_token";
  private static final String PARAM_TOKEN_TYPE = "token_type";
  private static final String PARAM_EXPIRES_IN = "expires_in";
  private static final String PARAM_SCOPE = "scope";
  private static final String GRANT_TYPE_AUTHORIZATION_CODE = "authorization_code";

  /** 외부 HTTP 호출용 RestClient 빌더(스프링 설정 재사용). */
  private final RestClient.Builder restClientBuilder;

  /**
   * authorization code를 provider token endpoint로 교환한다.
   *
   * <p>요청 파라미터:
   *
   * <ul>
   *   <li>`grant_type=authorization_code`
   *   <li>`code`
   *   <li>`redirect_uri`
   *   <li>`code_verifier` (PKCE)
   * </ul>
   *
   * <p>client 인증 방식:
   *
   * <ul>
   *   <li>`client_secret_basic`: Authorization 헤더로 client 인증
   *   <li>그 외: form body에 `client_id`/`client_secret` 포함
   * </ul>
   *
   * @throws ServiceException `code` 누락, 교환 실패, 또는 응답 `id_token` 누락 시
   */
  @Override
  public OidcTokenResponse exchangeCode(
      ClientRegistration clientRegistration,
      String code,
      String redirectUri,
      String codeVerifier) {
    requireAuthorizationCode(code);

    MultiValueMap<String, String> form = buildAuthorizationCodeForm(code, redirectUri, codeVerifier);
    RestClient.RequestBodySpec request = buildTokenRequest(clientRegistration);
    request = applyClientAuthentication(clientRegistration, request, form);

    Map<String, Object> body = executeTokenRequest(clientRegistration, request, form);
    validateTokenResponseBody(body);

    return toTokenResponse(body);
  }

  private void requireAuthorizationCode(String code) {
    if (!StringUtils.hasText(code)) {
      throw AuthErrorCode.OIDC_AUTHORIZATION_CODE_REQUIRED.toException();
    }
  }

  private MultiValueMap<String, String> buildAuthorizationCodeForm(
      String code, String redirectUri, String codeVerifier) {
    MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
    form.add(PARAM_GRANT_TYPE, GRANT_TYPE_AUTHORIZATION_CODE);
    form.add(PARAM_CODE, code);
    form.add(PARAM_REDIRECT_URI, redirectUri);
    form.add(PARAM_CODE_VERIFIER, codeVerifier);
    return form;
  }

  private RestClient.RequestBodySpec buildTokenRequest(ClientRegistration clientRegistration) {
    return restClientBuilder
        .build()
        .post()
        .uri(clientRegistration.getProviderDetails().getTokenUri())
        .contentType(MediaType.APPLICATION_FORM_URLENCODED);
  }

  private RestClient.RequestBodySpec applyClientAuthentication(
      ClientRegistration clientRegistration,
      RestClient.RequestBodySpec request,
      MultiValueMap<String, String> form) {
    String clientId = clientRegistration.getClientId();
    String clientSecret = clientRegistration.getClientSecret();

    if (isClientSecretBasic(clientRegistration.getClientAuthenticationMethod())) {
      return request.header(HttpHeaders.AUTHORIZATION, basicAuthHeader(clientId, clientSecret));
    }

    form.add(PARAM_CLIENT_ID, clientId);
    if (StringUtils.hasText(clientSecret)) {
      form.add(PARAM_CLIENT_SECRET, clientSecret);
    }
    return request;
  }

  private boolean isClientSecretBasic(ClientAuthenticationMethod authenticationMethod) {
    return ClientAuthenticationMethod.CLIENT_SECRET_BASIC.equals(authenticationMethod);
  }

  private Map<String, Object> executeTokenRequest(
      ClientRegistration clientRegistration,
      RestClient.RequestBodySpec request,
      MultiValueMap<String, String> form) {
    try {
      return request.body(form).retrieve().body(Map.class);
    } catch (RestClientResponseException exception) {
      log.warn(
          "oidc token exchange failed with status. provider={}, status={}, body={}",
          clientRegistration.getRegistrationId(),
          exception.getStatusCode().value(),
          exception.getResponseBodyAsString());
      throw AuthErrorCode.OIDC_TOKEN_EXCHANGE_FAILED.toException();
    } catch (RestClientException exception) {
      log.warn(
          "oidc token exchange failed by client exception. provider={}, message={}",
          clientRegistration.getRegistrationId(),
          exception.getMessage());
      throw AuthErrorCode.OIDC_TOKEN_EXCHANGE_FAILED.toException();
    }
  }

  private void validateTokenResponseBody(Map<String, Object> body) {
    if (body == null) {
      throw AuthErrorCode.OIDC_TOKEN_EXCHANGE_FAILED.toException();
    }
  }

  private OidcTokenResponse toTokenResponse(Map<String, Object> body) {
    String idToken = asString(body.get(PARAM_ID_TOKEN));
    if (!StringUtils.hasText(idToken)) {
      throw AuthErrorCode.OIDC_ID_TOKEN_INVALID.toException();
    }

    return new OidcTokenResponse(
        asString(body.get(PARAM_ACCESS_TOKEN)),
        idToken,
        asString(body.get(PARAM_TOKEN_TYPE)),
        asLong(body.get(PARAM_EXPIRES_IN)),
        asString(body.get(PARAM_SCOPE)));
  }

  /** RFC7617 Basic 인증 헤더 값을 생성한다. */
  private String basicAuthHeader(String clientId, String clientSecret) {
    String value = clientId + ":" + (clientSecret == null ? "" : clientSecret);
    String encoded = Base64.getEncoder().encodeToString(value.getBytes(StandardCharsets.UTF_8));
    return "Basic " + encoded;
  }

  /** 객체 값을 문자열로 변환한다(null-safe). */
  private String asString(Object value) {
    if (value == null) {
      return null;
    }
    return String.valueOf(value);
  }

  /** 객체 값을 Long으로 변환한다(null-safe). */
  private Long asLong(Object value) {
    if (value instanceof Number number) {
      return number.longValue();
    }
    if (value instanceof String stringValue && StringUtils.hasText(stringValue)) {
      try {
        return Long.valueOf(stringValue);
      } catch (NumberFormatException exception) {
        return null;
      }
    }
    return null;
  }
}
