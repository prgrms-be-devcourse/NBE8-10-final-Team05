package com.back.auth.application;

import static org.assertj.core.api.Assertions.assertThat;

import com.google.genai.Client;
import java.time.Instant;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
@DisplayName("JPA OIDC state 저장소 테스트")
class JpaOidcAuthorizationStateStoreTest {

  @Autowired private OidcAuthorizationStateStore oidcAuthorizationStateStore;
  @MockitoBean private Client geminiClient;

  @Test
  @DisplayName("state를 저장하면 DB에서 다시 조회할 수 있다")
  void saveAndFindRoundTrip() {
    OidcAuthorizationRequestService.OidcAuthorizationState issued =
        OidcAuthorizationRequestService.OidcAuthorizationState.issue(
            "state-1",
            "maum-on-oidc",
            "http://localhost:3000/login",
            "nonce-1",
            "code-verifier-1",
            Instant.parse("2026-03-24T00:00:00Z"),
            Instant.parse("2026-03-24T00:05:00Z"));

    oidcAuthorizationStateStore.save(issued);

    OidcAuthorizationRequestService.OidcAuthorizationState found =
        oidcAuthorizationStateStore.find("state-1").orElseThrow();

    assertThat(found).isEqualTo(issued);
  }

  @Test
  @DisplayName("소비 후 만료된 state 정리 시 DB에서 제거된다")
  void deleteConsumedExpiredRemovesEntry() {
    Instant createdAt = Instant.parse("2026-03-24T00:00:00Z");
    Instant expiresAt = Instant.parse("2026-03-24T00:05:00Z");
    OidcAuthorizationRequestService.OidcAuthorizationState consumed =
        OidcAuthorizationRequestService.OidcAuthorizationState.issue(
                "state-2",
                "maum-on-oidc",
                "http://localhost:3000/login",
                "nonce-2",
                "code-verifier-2",
                createdAt,
                expiresAt)
            .consume(Instant.parse("2026-03-24T00:03:00Z"));

    oidcAuthorizationStateStore.save(consumed);
    oidcAuthorizationStateStore.deleteConsumedExpired(expiresAt.plusSeconds(1));

    assertThat(oidcAuthorizationStateStore.find("state-2")).isEmpty();
  }
}
