package com.back.auth.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.back.member.domain.Member;
import com.back.member.domain.MemberRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.dao.DataIntegrityViolationException;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@DisplayName("OAuth 계정 매핑 리포지토리 테스트")
class OAuthAccountRepositoryTest {

  @Autowired private OAuthAccountRepository oAuthAccountRepository;
  @Autowired private MemberRepository memberRepository;

  @Test
  @DisplayName("같은 provider/providerUserId 조합은 중복 저장할 수 없다")
  void providerAndProviderUserIdMustBeUnique() {
    Member member1 = memberRepository.save(Member.create("member1@test.com", "$2a$10$hashValue", "m1"));
    Member member2 = memberRepository.save(Member.create("member2@test.com", "$2a$10$hashValue", "m2"));

    oAuthAccountRepository.saveAndFlush(
        OAuthAccount.connect(member1, "google", "provider-user-1", "member1@test.com"));

    assertThatThrownBy(
            () ->
                oAuthAccountRepository.saveAndFlush(
                    OAuthAccount.connect(member2, "google", "provider-user-1", "member2@test.com")))
        .isInstanceOf(DataIntegrityViolationException.class);
  }

  @Test
  @DisplayName("같은 member/provider 조합은 중복 저장할 수 없다")
  void memberAndProviderMustBeUnique() {
    Member member = memberRepository.save(Member.create("member3@test.com", "$2a$10$hashValue", "m3"));

    oAuthAccountRepository.saveAndFlush(
        OAuthAccount.connect(member, "google", "provider-user-2", "member3@test.com"));

    assertThatThrownBy(
            () ->
                oAuthAccountRepository.saveAndFlush(
                    OAuthAccount.connect(member, "google", "provider-user-3", "member3@test.com")))
        .isInstanceOf(DataIntegrityViolationException.class);
  }

  @Test
  @DisplayName("회원 1명은 여러 provider 계정을 가질 수 있다")
  void memberCanConnectMultipleProviders() {
    Member member = memberRepository.save(Member.create("member4@test.com", "$2a$10$hashValue", "m4"));

    oAuthAccountRepository.saveAndFlush(
        OAuthAccount.connect(member, "google", "provider-user-4", "member4@test.com"));
    oAuthAccountRepository.saveAndFlush(
        OAuthAccount.connect(member, "kakao", "provider-user-4-kakao", "member4@kakao.com"));

    assertThat(oAuthAccountRepository.findAllByMemberIdOrderByIdAsc(member.getId())).hasSize(2);
  }
}
