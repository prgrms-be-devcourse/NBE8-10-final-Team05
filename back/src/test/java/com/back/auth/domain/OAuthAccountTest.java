package com.back.auth.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.back.member.domain.Member;
import java.time.LocalDateTime;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("OAuthAccount 도메인 정책 테스트")
class OAuthAccountTest {

  @Test
  @DisplayName("connect는 provider/email을 정규화해 저장한다")
  void connectNormalizesProviderAndEmail() {
    Member member = Member.create("member@test.com", "$2a$10$hashValue", "member");

    OAuthAccount account = OAuthAccount.connect(member, "  GOOGLE ", " provider-user-1 ", " OIDC@TEST.COM ");

    assertThat(account.getProvider()).isEqualTo("google");
    assertThat(account.getProviderUserId()).isEqualTo("provider-user-1");
    assertThat(account.getEmailAtProvider()).isEqualTo("oidc@test.com");
  }

  @Test
  @DisplayName("lastLoginAt은 null로 갱신할 수 없다")
  void touchLastLoginAtRejectsNull() {
    Member member = Member.create("member@test.com", "$2a$10$hashValue", "member");
    OAuthAccount account =
        OAuthAccount.connect(member, "google", "provider-user-1", "member@test.com");

    assertThatThrownBy(() -> account.touchLastLoginAt(null))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("last login time must not be null");
  }

  @Test
  @DisplayName("updateEmailAtProvider는 빈 값을 null로 정규화한다")
  void updateEmailAtProviderNormalizesBlankToNull() {
    Member member = Member.create("member@test.com", "$2a$10$hashValue", "member");
    OAuthAccount account =
        OAuthAccount.connect(member, "google", "provider-user-1", "member@test.com");

    account.updateEmailAtProvider("   ");

    assertThat(account.getEmailAtProvider()).isNull();
  }

  @Test
  @DisplayName("touchLastLoginAt은 최신 시각으로 갱신한다")
  void touchLastLoginAtUpdatesTimestamp() {
    Member member = Member.create("member@test.com", "$2a$10$hashValue", "member");
    OAuthAccount account =
        OAuthAccount.connect(member, "google", "provider-user-1", "member@test.com");
    LocalDateTime nextLoginAt = LocalDateTime.now().plusMinutes(5);

    account.touchLastLoginAt(nextLoginAt);

    assertThat(account.getLastLoginAt()).isEqualTo(nextLoginAt);
  }
}
