package com.back.member.domain;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("회원 도메인 정책 테스트")
class MemberTest {

  @Test
  @DisplayName("회원 생성 시 기본 role/status가 USER/ACTIVE로 설정된다")
  void createAppliesDefaultRoleAndStatus() {
    Member member = Member.create("member1@test.com", "$2a$10$hashValue", "member1");

    assertThat(member.getRole()).isEqualTo(MemberRole.USER);
    assertThat(member.getStatus()).isEqualTo(MemberStatus.ACTIVE);
  }
}
