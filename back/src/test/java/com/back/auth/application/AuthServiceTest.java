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
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
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

  @InjectMocks private AuthService authService;

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
            LocalDateTime.now().plusHours(1),
            "family-1");
    given(jwtTokenService.validate("raw-refresh-token")).willReturn(true);
    given(jwtTokenService.parseRefreshToken("raw-refresh-token"))
        .willReturn(new JwtRefreshSubject(member.getId(), "jti-current", "family-1"));
    given(refreshTokenDomainService.findByJti("jti-current")).willReturn(Optional.of(current));
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
            anyString(),
            anyString(),
            nextHashCaptor.capture(),
            any(LocalDateTime.class),
            any(LocalDateTime.class));
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
            LocalDateTime.now().plusHours(1),
            "family-2");
    revoked.revoke(LocalDateTime.now().minusMinutes(1), null);
    given(jwtTokenService.validate("raw-refresh-token")).willReturn(true);
    given(jwtTokenService.parseRefreshToken("raw-refresh-token"))
        .willReturn(new JwtRefreshSubject(member.getId(), "jti-reused", "family-2"));
    given(refreshTokenDomainService.findByJti("jti-reused")).willReturn(Optional.of(revoked));

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
            LocalDateTime.now().minusSeconds(1),
            "family-expired");
    given(jwtTokenService.validate("raw-refresh-token")).willReturn(true);
    given(jwtTokenService.parseRefreshToken("raw-refresh-token"))
        .willReturn(new JwtRefreshSubject(member.getId(), "jti-expired", "family-expired"));
    given(refreshTokenDomainService.findByJti("jti-expired")).willReturn(Optional.of(expiredToken));

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
            anyString(),
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
    then(refreshTokenDomainService).should(never()).findByJti(anyString());
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

  private Member memberWithId(Long id, String email, String nickname) {
    Member member = Member.create(email, "$2a$10$stored", nickname);
    ReflectionTestUtils.setField(member, "id", id);
    return member;
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
