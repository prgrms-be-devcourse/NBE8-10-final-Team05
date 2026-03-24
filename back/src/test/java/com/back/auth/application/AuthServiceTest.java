package com.back.auth.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.never;

import com.back.auth.adapter.in.web.dto.AuthLoginRequest;
import com.back.auth.adapter.in.web.dto.AuthSignupRequest;
import com.back.auth.domain.RefreshToken;
import com.back.auth.domain.RefreshTokenDomainService;
import com.back.global.exception.ServiceException;
import com.back.global.security.adapter.in.AuthenticatedMember;
import com.back.global.security.jwt.JwtProperties;
import com.back.global.security.jwt.JwtRefreshSubject;
import com.back.global.security.jwt.JwtTokenService;
import com.back.member.domain.Member;
import com.back.member.domain.MemberRepository;
import com.back.member.domain.MemberStatus;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
@DisplayName("인증 서비스 테스트")
class AuthServiceTest {

  @Mock private MemberRepository memberRepository;
  @Mock private PasswordEncoder passwordEncoder;
  @Mock private JwtTokenService jwtTokenService;
  @Mock private RefreshTokenDomainService refreshTokenDomainService;
  @Mock private JwtProperties jwtProperties;
  @Mock private Clock clock;

  @InjectMocks private AuthService authService;

  @BeforeEach
  void setUpClock() {
    Mockito.lenient().when(clock.getZone()).thenReturn(ZoneOffset.UTC);
    Mockito.lenient().when(clock.instant()).thenReturn(Instant.parse("2026-03-24T00:00:00Z"));
  }

  @Test
  @DisplayName("회원 가입은 이메일 중복 검사 후 비밀번호 해시를 저장한다")
  void signupStoresPasswordHash() {
    AuthSignupRequest request = new AuthSignupRequest("member1@test.com", "plain-pass", "member1");
    given(memberRepository.existsByEmail("member1@test.com")).willReturn(false);
    given(passwordEncoder.encode("plain-pass")).willReturn("$2a$10$hashed");
    given(memberRepository.save(any(Member.class)))
        .willAnswer(invocation -> invocation.getArgument(0));

    authService.signup(request);

    ArgumentCaptor<Member> captor = ArgumentCaptor.forClass(Member.class);
    then(memberRepository).should().save(captor.capture());
    assertThat(captor.getValue().getPasswordHash()).isEqualTo("$2a$10$hashed");
  }

  @Test
  @DisplayName("로그인은 access/refresh 토큰을 발급하고 refresh 해시를 저장한다")
  void loginIssuesAccessAndRefreshTokens() {
    Member member = memberWithId(2L, "member2@test.com", "member2");
    given(memberRepository.findByEmail("member2@test.com")).willReturn(Optional.of(member));
    given(passwordEncoder.matches("plain-pass", "$2a$10$stored")).willReturn(true);
    given(jwtTokenService.generateRefreshToken(any(Long.class), anyString(), anyString()))
        .willReturn("raw-refresh-token");
    given(jwtProperties.refreshTokenExpireSeconds()).willReturn(1_209_600L);
    given(jwtTokenService.generateAccessToken(any(Long.class), anyString(), any()))
        .willReturn("access-token");
    given(jwtProperties.accessTokenExpireSeconds()).willReturn(3600L);

    AuthService.AuthTokenIssueResult result =
        authService.login(new AuthLoginRequest("member2@test.com", "plain-pass"));

    assertThat(result.response().accessToken()).isEqualTo("access-token");
    assertThat(result.refreshToken()).isEqualTo("raw-refresh-token");
    ArgumentCaptor<String> refreshHashCaptor = ArgumentCaptor.forClass(String.class);
    then(refreshTokenDomainService)
        .should()
        .saveIssuedToken(
            any(Member.class),
            anyString(),
            refreshHashCaptor.capture(),
            any(LocalDateTime.class),
            anyString());
    assertThat(refreshHashCaptor.getValue()).isEqualTo(refreshTokenHash("raw-refresh-token"));
    then(refreshTokenDomainService)
        .should()
        .saveIssuedToken(
            any(Member.class),
            anyString(),
            anyString(),
            org.mockito.ArgumentMatchers.eq(fixedNow().plusSeconds(1_209_600L)),
            anyString());
  }

  @Test
  @DisplayName("로그인 시 비밀번호가 일치하지 않으면 401-2 예외를 반환한다")
  void loginFailsWhenPasswordDoesNotMatch() {
    Member member = memberWithId(2L, "member2@test.com", "member2");
    given(memberRepository.findByEmail("member2@test.com")).willReturn(Optional.of(member));
    given(passwordEncoder.matches("wrong-pass", "$2a$10$stored")).willReturn(false);

    assertThatThrownBy(
            () -> authService.login(new AuthLoginRequest("member2@test.com", "wrong-pass")))
        .isInstanceOf(ServiceException.class)
        .satisfies(
            exception -> {
              ServiceException serviceException = (ServiceException) exception;
              assertThat(serviceException.getRsData().resultCode()).isEqualTo("401-2");
              assertThat(serviceException.getRsData().msg())
                  .isEqualTo("Invalid email or password.");
            });

    then(refreshTokenDomainService)
        .should(never())
        .saveIssuedToken(
            any(Member.class), anyString(), anyString(), any(LocalDateTime.class), anyString());
  }

  @Test
  @DisplayName("refresh는 기존 토큰이 활성 상태면 회전하고 새 access를 반환한다")
  void refreshRotatesTokenWhenCurrentTokenIsActive() {
    Member member = memberWithId(3L, "member3@test.com", "member3");
    RefreshToken current =
        RefreshToken.issue(
            member,
            "jti-current",
            refreshTokenHash("raw-refresh-token"),
            fixedNow().plusHours(1),
            "family-1");
    given(jwtTokenService.validate("raw-refresh-token")).willReturn(true);
    given(jwtTokenService.parseRefreshToken("raw-refresh-token"))
        .willReturn(new JwtRefreshSubject(member.getId(), "jti-current", "family-1"));
    given(refreshTokenDomainService.findByJtiForUpdate("jti-current")).willReturn(Optional.of(current));
    given(jwtTokenService.generateRefreshToken(any(Long.class), anyString(), anyString()))
        .willReturn("next-refresh-token");
    given(jwtProperties.refreshTokenExpireSeconds()).willReturn(1_209_600L);
    given(jwtTokenService.generateAccessToken(any(Long.class), anyString(), any()))
        .willReturn("next-access-token");
    given(jwtProperties.accessTokenExpireSeconds()).willReturn(3600L);

    AuthService.AuthTokenIssueResult result = authService.refresh("raw-refresh-token");

    assertThat(result.response().accessToken()).isEqualTo("next-access-token");
    assertThat(result.refreshToken()).isEqualTo("next-refresh-token");
    ArgumentCaptor<String> nextHashCaptor = ArgumentCaptor.forClass(String.class);
    then(refreshTokenDomainService)
        .should()
        .rotate(
            any(RefreshToken.class),
            anyString(),
            nextHashCaptor.capture(),
            org.mockito.ArgumentMatchers.eq(fixedNow().plusSeconds(1_209_600L)),
            org.mockito.ArgumentMatchers.eq(fixedNow()));
    assertThat(nextHashCaptor.getValue()).isEqualTo(refreshTokenHash("next-refresh-token"));
  }

  @Test
  @DisplayName("revoked refresh 토큰 재사용 시 family 전체 폐기 후 예외를 던진다")
  void refreshDetectsReuseAndRevokesFamily() {
    Member member = memberWithId(4L, "member4@test.com", "member4");
    RefreshToken revoked =
        RefreshToken.issue(
            member,
            "jti-reused",
            refreshTokenHash("raw-refresh-token"),
            fixedNow().plusHours(1),
            "family-2");
    revoked.revoke(fixedNow().minusMinutes(1), null);
    given(jwtTokenService.validate("raw-refresh-token")).willReturn(true);
    given(jwtTokenService.parseRefreshToken("raw-refresh-token"))
        .willReturn(new JwtRefreshSubject(member.getId(), "jti-reused", "family-2"));
    given(refreshTokenDomainService.findByJtiForUpdate("jti-reused")).willReturn(Optional.of(revoked));

    assertThatThrownBy(() -> authService.refresh("raw-refresh-token"))
        .isInstanceOf(ServiceException.class)
        .satisfies(
            exception -> {
              ServiceException serviceException = (ServiceException) exception;
              assertThat(serviceException.getRsData().resultCode()).isEqualTo("401-5");
            });

    then(refreshTokenDomainService).should().revokeFamily(anyString(), any(LocalDateTime.class));
  }

  @Test
  @DisplayName("만료된 refresh 토큰은 401-4 예외를 반환하고 회전하지 않는다")
  void refreshFailsWhenStoredTokenExpired() {
    Member member = memberWithId(6L, "member6@test.com", "member6");
    RefreshToken expiredToken =
        RefreshToken.issue(
            member,
            "jti-expired",
            refreshTokenHash("raw-refresh-token"),
            fixedNow().minusSeconds(1),
            "family-expired");
    given(jwtTokenService.validate("raw-refresh-token")).willReturn(true);
    given(jwtTokenService.parseRefreshToken("raw-refresh-token"))
        .willReturn(new JwtRefreshSubject(member.getId(), "jti-expired", "family-expired"));
    given(refreshTokenDomainService.findByJtiForUpdate("jti-expired"))
        .willReturn(Optional.of(expiredToken));

    assertThatThrownBy(() -> authService.refresh("raw-refresh-token"))
        .isInstanceOf(ServiceException.class)
        .satisfies(
            exception -> {
              ServiceException serviceException = (ServiceException) exception;
              assertThat(serviceException.getRsData().resultCode()).isEqualTo("401-4");
              assertThat(serviceException.getRsData().msg()).isEqualTo("Refresh token is invalid.");
            });

    then(refreshTokenDomainService)
        .should(never())
        .rotate(
            any(RefreshToken.class),
            anyString(),
            anyString(),
            any(LocalDateTime.class),
            any(LocalDateTime.class));
  }

  @Test
  @DisplayName("me는 인증된 사용자 ID로 회원 정보를 조회한다")
  void meReturnsCurrentMemberInformation() {
    Member member = memberWithId(5L, "member5@test.com", "member5");
    given(memberRepository.findById(member.getId())).willReturn(Optional.of(member));

    var response =
        authService.me(
            new AuthenticatedMember(
                member.getId(), member.getEmail(), java.util.List.of("ROLE_USER")));

    assertThat(response.id()).isEqualTo(member.getId());
    assertThat(response.email()).isEqualTo(member.getEmail());
    assertThat(response.nickname()).isEqualTo(member.getNickname());
  }

  @Test
  @DisplayName("me는 차단된 회원이면 403-2를 반환한다")
  void meFailsWhenMemberBlocked() {
    Member member = memberWithId(15L, "blocked-me@test.com", "blocked-me");
    ReflectionTestUtils.setField(member, "status", MemberStatus.BLOCKED);
    given(memberRepository.findById(member.getId())).willReturn(Optional.of(member));

    assertThatThrownBy(
            () ->
                authService.me(
                    new AuthenticatedMember(
                        member.getId(), member.getEmail(), java.util.List.of("ROLE_USER"))))
        .isInstanceOf(ServiceException.class)
        .satisfies(
            exception ->
                assertThat(((ServiceException) exception).getRsData().resultCode()).isEqualTo("403-2"));
  }

  @Test
  @DisplayName("me는 탈퇴한 회원이면 403-3을 반환한다")
  void meFailsWhenMemberWithdrawn() {
    Member member = memberWithId(16L, "withdrawn-me@test.com", "withdrawn-me");
    ReflectionTestUtils.setField(member, "status", MemberStatus.WITHDRAWN);
    given(memberRepository.findById(member.getId())).willReturn(Optional.of(member));

    assertThatThrownBy(
            () ->
                authService.me(
                    new AuthenticatedMember(
                        member.getId(), member.getEmail(), java.util.List.of("ROLE_USER"))))
        .isInstanceOf(ServiceException.class)
        .satisfies(
            exception ->
                assertThat(((ServiceException) exception).getRsData().resultCode()).isEqualTo("403-3"));
  }

  @Test
  @DisplayName("refresh 토큰이 없으면 401-3을 반환한다")
  void refreshFailsWhenTokenMissing() {
    assertThatThrownBy(() -> authService.refresh(null))
        .isInstanceOf(ServiceException.class)
        .satisfies(
            exception ->
                assertThat(((ServiceException) exception).getRsData().resultCode()).isEqualTo("401-3"));

    then(jwtTokenService).should(never()).validate(anyString());
  }

  @Test
  @DisplayName("JWT 검증에 실패한 refresh 토큰은 401-4를 반환한다")
  void refreshFailsWhenJwtValidationFails() {
    given(jwtTokenService.validate("raw-refresh-token")).willReturn(false);

    assertThatThrownBy(() -> authService.refresh("raw-refresh-token"))
        .isInstanceOf(ServiceException.class)
        .satisfies(
            exception ->
                assertThat(((ServiceException) exception).getRsData().resultCode()).isEqualTo("401-4"));

    then(jwtTokenService).should().validate("raw-refresh-token");
    then(refreshTokenDomainService).should(never()).findByJtiForUpdate(anyString());
  }

  @Test
  @DisplayName("차단된 회원은 로그인 시 403-2를 반환한다")
  void loginFailsWhenMemberBlocked() {
    Member member = memberWithId(7L, "blocked@test.com", "blocked");
    ReflectionTestUtils.setField(member, "status", MemberStatus.BLOCKED);
    given(memberRepository.findByEmail("blocked@test.com")).willReturn(Optional.of(member));
    given(passwordEncoder.matches("plain-pass", "$2a$10$stored")).willReturn(true);

    assertThatThrownBy(() -> authService.login(new AuthLoginRequest("blocked@test.com", "plain-pass")))
        .isInstanceOf(ServiceException.class)
        .satisfies(
            exception ->
                assertThat(((ServiceException) exception).getRsData().resultCode()).isEqualTo("403-2"));
  }

  @Test
  @DisplayName("인증 정보가 없으면 me는 401-1을 반환한다")
  void meFailsWhenAuthenticationMissing() {
    assertThatThrownBy(() -> authService.me(null))
        .isInstanceOf(ServiceException.class)
        .satisfies(
            exception ->
                assertThat(((ServiceException) exception).getRsData().resultCode()).isEqualTo("401-1"));

    then(memberRepository).should(never()).findById(any(Long.class));
  }

  @Test
  @DisplayName("oidcLogin은 기존 회원이 있으면 재사용하고 새 회원을 만들지 않는다")
  void oidcLoginUsesExistingMember() {
    Member member = memberWithId(8L, "existing@test.com", "existing");
    given(memberRepository.findByEmail("existing@test.com")).willReturn(Optional.of(member));
    given(jwtTokenService.generateRefreshToken(any(Long.class), anyString(), anyString()))
        .willReturn("oidc-refresh-token");
    given(jwtProperties.refreshTokenExpireSeconds()).willReturn(1_209_600L);
    given(jwtTokenService.generateAccessToken(any(Long.class), anyString(), any()))
        .willReturn("oidc-access-token");
    given(jwtProperties.accessTokenExpireSeconds()).willReturn(3600L);

    AuthService.AuthTokenIssueResult result = authService.oidcLogin("Existing@Test.Com", "ignored");

    assertThat(result.response().accessToken()).isEqualTo("oidc-access-token");
    assertThat(result.refreshToken()).isEqualTo("oidc-refresh-token");
    then(memberRepository).should(never()).save(any(Member.class));
    then(passwordEncoder).should(never()).encode(anyString());
  }

  @Test
  @DisplayName("oidcLogin은 신규 회원이면 생성하고 이메일 local-part를 기본 닉네임으로 사용한다")
  void oidcLoginCreatesMemberWithFallbackNickname() {
    given(memberRepository.findByEmail("new_member@test.com")).willReturn(Optional.empty());
    given(passwordEncoder.encode(anyString())).willReturn("$2a$10$oidcHash");
    given(memberRepository.save(any(Member.class)))
        .willAnswer(
            invocation -> {
              Member saved = invocation.getArgument(0);
              ReflectionTestUtils.setField(saved, "id", 11L);
              return saved;
            });
    given(jwtTokenService.generateRefreshToken(any(Long.class), anyString(), anyString()))
        .willReturn("oidc-refresh-token");
    given(jwtProperties.refreshTokenExpireSeconds()).willReturn(1_209_600L);
    given(jwtTokenService.generateAccessToken(any(Long.class), anyString(), any()))
        .willReturn("oidc-access-token");
    given(jwtProperties.accessTokenExpireSeconds()).willReturn(3600L);

    AuthService.AuthTokenIssueResult result =
        authService.oidcLogin("new_member@test.com", "   ");

    assertThat(result.response().member().nickname()).isEqualTo("new_member");

    ArgumentCaptor<Member> memberCaptor = ArgumentCaptor.forClass(Member.class);
    then(memberRepository).should().save(memberCaptor.capture());
    assertThat(memberCaptor.getValue().getNickname()).isEqualTo("new_member");
    then(passwordEncoder).should().encode(anyString());
  }

  @Test
  @DisplayName("issueTokenPairForMember는 member가 null이면 404-1을 반환한다")
  void issueTokenPairForMemberFailsWhenMemberNull() {
    assertThatThrownBy(() -> authService.issueTokenPairForMember(null))
        .isInstanceOf(ServiceException.class)
        .satisfies(
            exception ->
                assertThat(((ServiceException) exception).getRsData().resultCode()).isEqualTo("404-1"));
  }

  @Test
  @DisplayName("issueTokenPairForMember는 차단 회원이면 403-2를 반환한다")
  void issueTokenPairForMemberFailsWhenBlockedMember() {
    Member member = memberWithId(12L, "blocked2@test.com", "blocked2");
    ReflectionTestUtils.setField(member, "status", MemberStatus.BLOCKED);

    assertThatThrownBy(() -> authService.issueTokenPairForMember(member))
        .isInstanceOf(ServiceException.class)
        .satisfies(
            exception ->
                assertThat(((ServiceException) exception).getRsData().resultCode()).isEqualTo("403-2"));
  }

  @Test
  @DisplayName("logout은 refresh JWT가 유효하지 않으면 저장소에 접근하지 않는다")
  void logoutSkipsWhenRefreshTokenInvalid() {
    given(jwtTokenService.validate("invalid-refresh-token")).willReturn(false);

    authService.logout("invalid-refresh-token");

    then(jwtTokenService).should().validate("invalid-refresh-token");
    then(jwtTokenService).should(never()).parseRefreshToken(anyString());
    then(refreshTokenDomainService).should(never()).findByJti(anyString());
  }

  @Test
  @DisplayName("logout은 refresh 파싱 실패 시 저장소 폐기 없이 종료한다")
  void logoutSkipsWhenRefreshParsingFails() {
    given(jwtTokenService.validate("malformed-refresh-token")).willReturn(true);
    given(jwtTokenService.parseRefreshToken("malformed-refresh-token"))
        .willThrow(new IllegalArgumentException("malformed"));

    authService.logout("malformed-refresh-token");

    then(refreshTokenDomainService).should(never()).findByJti(anyString());
    then(refreshTokenDomainService).should(never()).revoke(anyString(), any(LocalDateTime.class));
  }

  @Test
  @DisplayName("logout은 저장된 해시가 다르면 토큰을 폐기하지 않는다")
  void logoutSkipsWhenStoredTokenHashDoesNotMatch() {
    Member member = memberWithId(13L, "logout@test.com", "logout");
    RefreshToken stored =
        RefreshToken.issue(
            member,
            "logout-jti",
            refreshTokenHash("another-refresh-token"),
            fixedNow().plusHours(1),
            "family-logout");
    given(jwtTokenService.validate("raw-refresh-token")).willReturn(true);
    given(jwtTokenService.parseRefreshToken("raw-refresh-token"))
        .willReturn(new JwtRefreshSubject(13L, "logout-jti", "family-logout"));
    given(refreshTokenDomainService.findByJti("logout-jti")).willReturn(Optional.of(stored));

    authService.logout("raw-refresh-token");

    then(refreshTokenDomainService).should().findByJti("logout-jti");
    then(refreshTokenDomainService).should(never()).revoke(anyString(), any(LocalDateTime.class));
  }

  @Test
  @DisplayName("logout은 활성 refresh 토큰이면 고정 시각 기준으로 폐기한다")
  void logoutRevokesActiveTokenUsingClockTime() {
    Member member = memberWithId(14L, "logout-active@test.com", "logout-active");
    RefreshToken stored =
        RefreshToken.issue(
            member,
            "logout-active-jti",
            refreshTokenHash("raw-refresh-token"),
            fixedNow().plusHours(1),
            "family-logout-active");
    given(jwtTokenService.validate("raw-refresh-token")).willReturn(true);
    given(jwtTokenService.parseRefreshToken("raw-refresh-token"))
        .willReturn(new JwtRefreshSubject(14L, "logout-active-jti", "family-logout-active"));
    given(refreshTokenDomainService.findByJti("logout-active-jti")).willReturn(Optional.of(stored));

    authService.logout("raw-refresh-token");

    then(refreshTokenDomainService).should().revoke("logout-active-jti", fixedNow());
  }

  private Member memberWithId(Long id, String email, String nickname) {
    Member member = Member.create(email, "$2a$10$stored", nickname);
    ReflectionTestUtils.setField(member, "id", id);
    return member;
  }

  private LocalDateTime fixedNow() {
    return LocalDateTime.ofInstant(Instant.parse("2026-03-24T00:00:00Z"), ZoneOffset.UTC);
  }

  private String refreshTokenHash(String rawRefreshToken) {
    try {
      MessageDigest digest = MessageDigest.getInstance("SHA-256");
      byte[] hashBytes = digest.digest(rawRefreshToken.getBytes(StandardCharsets.UTF_8));
      return Base64.getUrlEncoder().withoutPadding().encodeToString(hashBytes);
    } catch (NoSuchAlgorithmException exception) {
      throw new IllegalStateException(exception);
    }
  }
}
