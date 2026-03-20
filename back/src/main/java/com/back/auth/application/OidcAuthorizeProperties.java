package com.back.auth.application;

import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

/** OIDC authorize 시작 엔드포인트 동작 제어용 설정. */
@ConfigurationProperties(prefix = "custom.auth.oidc")
public record OidcAuthorizeProperties(
    boolean authorizeEnabled, long authorizeTtlSeconds, List<String> redirectUriAllowlist) {

  public OidcAuthorizeProperties {
    if (authorizeTtlSeconds <= 0) {
      authorizeTtlSeconds = 300L;
    }
    if (redirectUriAllowlist == null) {
      redirectUriAllowlist = List.of();
    }
    redirectUriAllowlist =
        redirectUriAllowlist.stream()
            .filter(value -> value != null && !value.isBlank())
            .map(String::trim)
            .toList();
  }
}
