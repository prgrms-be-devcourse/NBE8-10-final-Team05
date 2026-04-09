package com.back.global.security.handler;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import com.back.auth.adapter.in.web.dto.AuthMemberResponse;
import com.back.auth.adapter.in.web.dto.AuthTokenResponse;
import com.back.auth.application.AccessTokenCookieService;
import com.back.auth.application.AuthHintCookieService;
import com.back.auth.application.AuthService;
import com.back.auth.application.OidcMemberLinkService;
import com.back.auth.application.RefreshTokenCookieService;
import com.back.member.domain.Member;
import jakarta.servlet.http.HttpServletResponse;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.util.ReflectionTestUtils;
import tools.jackson.databind.ObjectMapper;

@ExtendWith(MockitoExtension.class)
@DisplayName("OAuth2 로그인 성공 핸들러 테스트")
class OAuth2LoginSuccessHandlerTest {

  @Mock private AuthService authService;
  @Mock private OidcMemberLinkService oidcMemberLinkService;
  @Mock private RefreshTokenCookieService refreshTokenCookieService;
  @Mock private AccessTokenCookieService accessTokenCookieService;
  @Mock private AuthHintCookieService authHintCookieService;

  @Test
  @DisplayName("kakao 로그인 성공 시 provider 기준 회원 매핑을 사용하고 기존 oidcLogin 경로를 재사용하지 않는다")
  void onAuthenticationSuccessUsesProviderAwareMemberLinking() throws Exception {
    OAuth2LoginSuccessHandler handler =
        new OAuth2LoginSuccessHandler(
            authService,
            oidcMemberLinkService,
            refreshTokenCookieService,
            accessTokenCookieService,
            authHintCookieService,
            new ObjectMapper());

    OAuth2User oauth2User =
        new DefaultOAuth2User(
            List.of(new SimpleGrantedAuthority("ROLE_USER")),
            Map.of(
                "id", "kakao-user-1",
                "kakao_account", Map.of("email", "shared@test.com", "profile", Map.of("nickname", "kakao-user"))),
            "id");
    OAuth2AuthenticationToken authentication =
        new OAuth2AuthenticationToken(oauth2User, oauth2User.getAuthorities(), "kakao");

    Member member = Member.create("kakao_kakao-user-1@oidc.local", "$2a$10$hash", "kakao-user");
    ReflectionTestUtils.setField(member, "id", 101L);
    given(
            oidcMemberLinkService.resolveMember(
                "kakao", "kakao-user-1", "shared@test.com", "kakao-user"))
        .willReturn(member);

    AuthService.AuthTokenIssueResult issueResult =
        new AuthService.AuthTokenIssueResult(
            new AuthTokenResponse(
                "internal-access-token",
                "Bearer",
                3600L,
                new AuthMemberResponse(
                    101L,
                    "kakao_kakao-user-1@oidc.local",
                    "kakao-user",
                    "USER",
                    "ACTIVE")),
            "internal-refresh-token");
    given(authService.issueTokenPairForMember(member)).willReturn(issueResult);

    MockHttpServletRequest request = new MockHttpServletRequest();
    MockHttpServletResponse response = new MockHttpServletResponse();

    handler.onAuthenticationSuccess(request, response, authentication);

    then(oidcMemberLinkService)
        .should()
        .resolveMember("kakao", "kakao-user-1", "shared@test.com", "kakao-user");
    then(authService).should().issueTokenPairForMember(member);
    then(refreshTokenCookieService)
        .should()
        .issueRefreshTokenCookie(any(HttpServletResponse.class), eq("internal-refresh-token"));
    then(accessTokenCookieService)
        .should()
        .issueAccessTokenCookie(any(HttpServletResponse.class), eq("internal-access-token"));
    then(authHintCookieService)
        .should()
        .issueAuthenticatedHintCookie(any(HttpServletResponse.class), eq("USER"));
  }
}
