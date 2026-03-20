package com.back.global.security.handler;

import com.back.auth.application.AuthService;
import com.back.auth.application.AuthSuccessCode;
import com.back.auth.application.RefreshTokenCookieService;
import com.back.global.exception.ServiceException;
import com.back.global.rsData.RsData;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import tools.jackson.databind.ObjectMapper;

/** OIDC 로그인 성공 시 기존 JWT(access/refresh) 발급 규약으로 응답을 만드는 핸들러. */
@Component
@RequiredArgsConstructor
public class OAuth2LoginSuccessHandler implements AuthenticationSuccessHandler {

  private final AuthService authService;
  private final RefreshTokenCookieService refreshTokenCookieService;
  private final ObjectMapper objectMapper;

  @Override
  public void onAuthenticationSuccess(
      HttpServletRequest request, HttpServletResponse response, Authentication authentication)
      throws IOException, ServletException {
    try {
      OAuth2AuthenticationToken oauth2Authentication = extractOAuth2Authentication(authentication);
      OAuth2User oauth2User = oauth2Authentication.getPrincipal();
      SocialProfile socialProfile =
          resolveProfile(oauth2Authentication.getAuthorizedClientRegistrationId(), oauth2User);

      AuthService.AuthTokenIssueResult issueResult =
          authService.oidcLogin(socialProfile.email(), socialProfile.nickname());
      refreshTokenCookieService.issueRefreshTokenCookie(response, issueResult.refreshToken());

      RsData<?> rsData =
          new RsData<>(
              AuthSuccessCode.LOGIN_SUCCESS.code(),
              AuthSuccessCode.LOGIN_SUCCESS.message(),
              issueResult.response());
      writeJson(response, rsData);
    } catch (ServiceException exception) {
      writeJson(response, exception.getRsData());
    }
  }

  private OAuth2AuthenticationToken extractOAuth2Authentication(Authentication authentication) {
    if (authentication == null
        || !(authentication instanceof OAuth2AuthenticationToken oauth2Authentication)) {
      throw new ServiceException("401-2", "OIDC authentication failed.");
    }
    return oauth2Authentication;
  }

  private SocialProfile resolveProfile(String registrationId, OAuth2User oauth2User) {
    return switch (registrationId) {
      case "kakao" -> resolveKakaoProfile(oauth2User);
      default -> resolveDefaultProfile(oauth2User);
    };
  }

  private SocialProfile resolveDefaultProfile(OAuth2User oauth2User) {
    String email = resolveRequiredStringAttribute(oauth2User.getAttributes(), "email", "email");
    String nickname =
        resolveOptionalStringAttributeWithFallback(oauth2User.getAttributes(), "name", "nickname");
    return new SocialProfile(email, nickname);
  }

  private SocialProfile resolveKakaoProfile(OAuth2User oauth2User) {
    Map<String, Object> attributes = oauth2User.getAttributes();
    String email = resolveOptionalStringAttribute(attributes, "email");
    String nickname = resolveOptionalStringAttributeWithFallback(attributes, "name", "nickname");

    Map<String, Object> kakaoAccount =
        resolveOptionalMapAttribute(attributes, "kakao_account", "kakao_account");
    if (kakaoAccount != null) {
      if (!StringUtils.hasText(email)) {
        email = resolveOptionalStringAttribute(kakaoAccount, "email");
      }

      if (!StringUtils.hasText(nickname)) {
        Map<String, Object> profile =
            resolveOptionalMapAttribute(kakaoAccount, "profile", "kakao_account.profile");
        if (profile != null) {
          nickname = resolveOptionalStringAttribute(profile, "nickname");
        }
      }
    }

    if (!StringUtils.hasText(nickname)) {
      Map<String, Object> properties =
          resolveOptionalMapAttribute(attributes, "properties", "properties");
      if (properties != null) {
        nickname = resolveOptionalStringAttribute(properties, "nickname");
      }
    }

    if (!StringUtils.hasText(email)) {
      throw new ServiceException("401-2", "email attribute is required from provider.");
    }

    return new SocialProfile(email.trim(), nickname);
  }

  private String resolveRequiredStringAttribute(
      Map<String, Object> attributes, String key, String attributePath) {
    Object value = attributes.get(key);
    if (!(value instanceof String stringValue) || !StringUtils.hasText(stringValue)) {
      throw new ServiceException("401-2", attributePath + " attribute is required from provider.");
    }
    return stringValue.trim();
  }

  private String resolveOptionalStringAttribute(Map<String, Object> attributes, String key) {
    Object value = attributes.get(key);
    if (!(value instanceof String stringValue) || !StringUtils.hasText(stringValue)) {
      return null;
    }
    return stringValue.trim();
  }

  private String resolveOptionalStringAttributeWithFallback(
      Map<String, Object> attributes, String primaryKey, String fallbackKey) {
    String primary = resolveOptionalStringAttribute(attributes, primaryKey);
    if (StringUtils.hasText(primary)) {
      return primary;
    }
    return resolveOptionalStringAttribute(attributes, fallbackKey);
  }

  @SuppressWarnings("unchecked")
  private Map<String, Object> resolveOptionalMapAttribute(
      Map<String, Object> attributes, String key, String attributePath) {
    Object value = attributes.get(key);
    if (value == null) {
      return null;
    }
    if (!(value instanceof Map<?, ?> mapValue)) {
      throw new ServiceException("401-2", attributePath + " attribute must be an object.");
    }
    return (Map<String, Object>) mapValue;
  }

  private void writeJson(HttpServletResponse response, RsData<?> rsData) throws IOException {
    response.setStatus(rsData.statusCode());
    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
    response.setCharacterEncoding(StandardCharsets.UTF_8.name());
    objectMapper.writeValue(response.getWriter(), rsData);
  }

  private record SocialProfile(String email, String nickname) {}
}
