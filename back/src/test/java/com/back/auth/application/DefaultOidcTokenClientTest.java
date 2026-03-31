package com.back.auth.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.http.HttpHeaders.AUTHORIZATION;
import static org.springframework.http.HttpMethod.POST;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.headerDoesNotExist;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import com.back.global.exception.ServiceException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.ClientAuthenticationMethod;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

@DisplayName("OIDC 토큰 교환 클라이언트 테스트")
class DefaultOidcTokenClientTest {

  @Test
  @DisplayName("client_secret_basic 방식은 Authorization 헤더로 토큰 교환에 성공한다")
  void exchangeCodeSucceedsWithClientSecretBasic() {
    RestClient.Builder builder = RestClient.builder();
    MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
    DefaultOidcTokenClient client = new DefaultOidcTokenClient(builder);

    server
        .expect(requestTo("https://accounts.example.com/oauth2/v2/token"))
        .andExpect(method(POST))
        .andExpect(header(AUTHORIZATION, startsWith("Basic ")))
        .andExpect(content().string(containsString("grant_type=authorization_code")))
        .andExpect(content().string(containsString("code=auth-code")))
        .andExpect(content().string(containsString("code_verifier=verifier")))
        .andRespond(
            withSuccess(
                "{\"access_token\":\"provider-access\",\"id_token\":\"provider-id-token\",\"token_type\":\"Bearer\",\"expires_in\":3600,\"scope\":\"openid profile email\"}",
                MediaType.APPLICATION_JSON));

    OidcTokenClient.OidcTokenResponse response =
        client.exchangeCode(
            registration("maum-on-oidc", ClientAuthenticationMethod.CLIENT_SECRET_BASIC),
            "auth-code",
            "http://localhost:8080/login/oauth2/code/maum-on-oidc",
            "verifier");

    assertThat(response.accessToken()).isEqualTo("provider-access");
    assertThat(response.idToken()).isEqualTo("provider-id-token");
    assertThat(response.tokenType()).isEqualTo("Bearer");
    assertThat(response.expiresIn()).isEqualTo(3600L);
    server.verify();
  }

  @Test
  @DisplayName("client_secret_post 방식은 form body에 client_id/client_secret을 포함한다")
  void exchangeCodeSucceedsWithClientSecretPost() {
    RestClient.Builder builder = RestClient.builder();
    MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
    DefaultOidcTokenClient client = new DefaultOidcTokenClient(builder);

    server
        .expect(requestTo("https://accounts.example.com/oauth2/v2/token"))
        .andExpect(method(POST))
        .andExpect(headerDoesNotExist(AUTHORIZATION))
        .andExpect(content().string(containsString("client_id=test-client-id")))
        .andExpect(content().string(containsString("client_secret=test-client-secret")))
        .andRespond(
            withSuccess(
                "{\"access_token\":\"provider-access\",\"id_token\":\"provider-id-token\",\"token_type\":\"Bearer\",\"expires_in\":3600,\"scope\":\"openid profile email\"}",
                MediaType.APPLICATION_JSON));

    OidcTokenClient.OidcTokenResponse response =
        client.exchangeCode(
            registration("kakao", ClientAuthenticationMethod.CLIENT_SECRET_POST),
            "auth-code",
            "http://localhost:8080/login/oauth2/code/kakao",
            "verifier");

    assertThat(response.idToken()).isEqualTo("provider-id-token");
    server.verify();
  }

  @Test
  @DisplayName("provider가 4xx/5xx를 반환하면 401-10 예외를 반환한다")
  void exchangeCodeFailsWhenProviderReturnsHttpError() {
    RestClient.Builder builder = RestClient.builder();
    MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
    DefaultOidcTokenClient client = new DefaultOidcTokenClient(builder);

    server
        .expect(requestTo("https://accounts.example.com/oauth2/v2/token"))
        .andExpect(method(POST))
        .andRespond(withStatus(HttpStatus.BAD_REQUEST).body("{\"error\":\"invalid_grant\"}"));

    assertThatThrownBy(
            () ->
                client.exchangeCode(
                    registration("maum-on-oidc", ClientAuthenticationMethod.CLIENT_SECRET_BASIC),
                    "auth-code",
                    "http://localhost:8080/login/oauth2/code/maum-on-oidc",
                    "verifier"))
        .isInstanceOf(ServiceException.class)
        .satisfies(
            exception ->
                assertThat(((ServiceException) exception).getRsData().resultCode()).isEqualTo("401-10"));
  }

  @Test
  @DisplayName("id_token이 없는 응답은 401-11 예외를 반환한다")
  void exchangeCodeFailsWhenIdTokenMissing() {
    RestClient.Builder builder = RestClient.builder();
    MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
    DefaultOidcTokenClient client = new DefaultOidcTokenClient(builder);

    server
        .expect(requestTo("https://accounts.example.com/oauth2/v2/token"))
        .andExpect(method(POST))
        .andRespond(
            withSuccess(
                "{\"access_token\":\"provider-access\",\"token_type\":\"Bearer\",\"expires_in\":3600}",
                MediaType.APPLICATION_JSON));

    assertThatThrownBy(
            () ->
                client.exchangeCode(
                    registration("maum-on-oidc", ClientAuthenticationMethod.CLIENT_SECRET_BASIC),
                    "auth-code",
                    "http://localhost:8080/login/oauth2/code/maum-on-oidc",
                    "verifier"))
        .isInstanceOf(ServiceException.class)
        .satisfies(
            exception ->
                assertThat(((ServiceException) exception).getRsData().resultCode()).isEqualTo("401-11"));
  }

  @Test
  @DisplayName("인가 코드가 비어 있으면 400-4 예외를 반환한다")
  void exchangeCodeFailsWhenAuthorizationCodeMissing() {
    DefaultOidcTokenClient client = new DefaultOidcTokenClient(RestClient.builder());

    assertThatThrownBy(
            () ->
                client.exchangeCode(
                    registration("maum-on-oidc", ClientAuthenticationMethod.CLIENT_SECRET_BASIC),
                    " ",
                    "http://localhost:8080/login/oauth2/code/maum-on-oidc",
                    "verifier"))
        .isInstanceOf(ServiceException.class)
        .satisfies(
            exception ->
                assertThat(((ServiceException) exception).getRsData().resultCode()).isEqualTo("400-4"));
  }

  private ClientRegistration registration(
      String registrationId, ClientAuthenticationMethod authenticationMethod) {
    return ClientRegistration.withRegistrationId(registrationId)
        .clientId("test-client-id")
        .clientSecret("test-client-secret")
        .clientName("OIDC")
        .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
        .authorizationUri("https://accounts.example.com/oauth2/v2/auth")
        .tokenUri("https://accounts.example.com/oauth2/v2/token")
        .userInfoUri("https://accounts.example.com/userinfo")
        .userNameAttributeName("sub")
        .redirectUri("{baseUrl}/login/oauth2/code/{registrationId}")
        .clientAuthenticationMethod(authenticationMethod)
        .scope("openid", "profile", "email")
        .issuerUri("https://accounts.example.com")
        .build();
  }
}
