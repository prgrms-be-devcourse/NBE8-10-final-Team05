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

  @Test
  @DisplayName("관리자 초기화 보정 시 role과 passwordHash를 변경할 수 있다")
  void adminBootstrapCanAdjustRoleAndPasswordHash() {
    Member member = Member.create("admin@admin.com", "$2a$10$oldHash", "old");

    member.updateNickname("관리자");
    member.updateRole(MemberRole.ADMIN);
    member.updateStatus(MemberStatus.ACTIVE);
    member.updatePasswordHash("$2a$10$newHash");

    assertThat(member.getNickname()).isEqualTo("관리자");
    assertThat(member.getRole()).isEqualTo(MemberRole.ADMIN);
    assertThat(member.getStatus()).isEqualTo(MemberStatus.ACTIVE);
    assertThat(member.getPasswordHash()).isEqualTo("$2a$10$newHash");
  }
}
