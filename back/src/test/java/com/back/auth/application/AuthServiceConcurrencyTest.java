package com.back.auth.application;

import static org.assertj.core.api.Assertions.assertThat;

import com.back.auth.domain.RefreshToken;
import com.back.auth.domain.RefreshTokenRepository;
import com.back.global.exception.ServiceException;
import com.back.global.security.jwt.JwtRefreshSubject;
import com.back.global.security.jwt.JwtTokenService;
import com.back.member.domain.Member;
import com.back.member.domain.MemberRepository;
import com.google.genai.Client;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

@SpringBootTest
@ActiveProfiles("test")
@DisplayName("인증 서비스 동시성 테스트")
class AuthServiceConcurrencyTest {

  @Autowired private AuthService authService;
  @Autowired private MemberRepository memberRepository;
  @Autowired private RefreshTokenRepository refreshTokenRepository;
  @Autowired private PasswordEncoder passwordEncoder;
  @Autowired private JwtTokenService jwtTokenService;
  @MockitoBean private Client geminiClient;

  @Test
  @DisplayName("같은 refresh 토큰으로 동시에 재발급을 요청해도 최대 한 요청만 성공한다")
  void concurrentRefreshAllowsOnlyOneSuccessfulRotation() throws Exception {
    Member member = createMember();
    AuthService.AuthTokenIssueResult issued = authService.issueTokenPairForMember(member);
    String rawRefreshToken = issued.refreshToken();
    JwtRefreshSubject refreshSubject = jwtTokenService.parseRefreshToken(rawRefreshToken);

    CountDownLatch ready = new CountDownLatch(2);
    CountDownLatch start = new CountDownLatch(1);
    ExecutorService executorService = Executors.newFixedThreadPool(2);

    try {
      Future<RefreshAttemptResult> firstAttempt =
          executorService.submit(() -> attemptRefresh(rawRefreshToken, ready, start));
      Future<RefreshAttemptResult> secondAttempt =
          executorService.submit(() -> attemptRefresh(rawRefreshToken, ready, start));

      assertThat(ready.await(5, TimeUnit.SECONDS)).isTrue();
      start.countDown();

      List<RefreshAttemptResult> results =
          List.of(firstAttempt.get(10, TimeUnit.SECONDS), secondAttempt.get(10, TimeUnit.SECONDS));

      assertThat(results.stream().filter(RefreshAttemptResult::isSuccess)).hasSize(1);
      assertThat(results.stream().filter(result -> "401-5".equals(result.errorCode()))).hasSize(1);

      List<RefreshToken> familyTokens =
          refreshTokenRepository.findAllByFamilyIdOrderByIdAsc(refreshSubject.familyId());
      assertThat(familyTokens).hasSize(2);
      assertThat(familyTokens).allSatisfy(token -> assertThat(token.getRevokedAt()).isNotNull());
    } finally {
      executorService.shutdownNow();
    }
  }

  private RefreshAttemptResult attemptRefresh(
      String rawRefreshToken, CountDownLatch ready, CountDownLatch start) throws Exception {
    ready.countDown();
    assertThat(start.await(5, TimeUnit.SECONDS)).isTrue();

    try {
      AuthService.AuthTokenIssueResult result = authService.refresh(rawRefreshToken);
      return RefreshAttemptResult.success(result.response().accessToken());
    } catch (ServiceException exception) {
      return RefreshAttemptResult.failure(exception.getRsData().resultCode());
    }
  }

  private Member createMember() {
    String unique = UUID.randomUUID().toString().replace("-", "");
    return memberRepository.saveAndFlush(
        Member.create(
            "concurrent-" + unique + "@test.com",
            passwordEncoder.encode("plain-pass-1234"),
            "concurrent-" + unique.substring(0, 8)));
  }

  private record RefreshAttemptResult(boolean isSuccess, String accessToken, String errorCode) {

    private static RefreshAttemptResult success(String accessToken) {
      return new RefreshAttemptResult(true, accessToken, null);
    }

    private static RefreshAttemptResult failure(String errorCode) {
      return new RefreshAttemptResult(false, null, errorCode);
    }
  }
}
