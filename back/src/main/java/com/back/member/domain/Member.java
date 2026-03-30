package com.back.member.domain;

import com.back.global.jpa.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;

/** 회원 엔티티. 인증/인가에 필요한 비밀번호 해시, 권한(role), 상태(status)를 함께 관리한다. */
@Getter
@Entity
@Table(
    name = "members",
    uniqueConstraints = {@UniqueConstraint(name = "uk_members_email", columnNames = "email")})
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Member extends BaseEntity {

  private static final String DEFAULT_NICKNAME = "anonymous";

  /** 로그인 식별 이메일(유니크). */
  @Column(nullable = false, length = 120)
  private String email;

  /** 비밀번호 원문이 아닌 해시값 저장 컬럼. */
  @Column(name = "password_hash", nullable = false, length = 255)
  private String passwordHash;

  /** 화면 표시용 닉네임. */
  @Column(nullable = false, length = 30)
  private String nickname;

  /** 인가 판단용 역할.(USER/ADMIN) */
  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private MemberRole role;

  /** 운영 정책 기반 계정 상태. (ACTIVE/BLOCKED/WITHDRAWN) */
  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private MemberStatus status;

  /** 랜덤 편지 발송 수락 / 거절 **/
  @Column(nullable = false)
  private boolean randomReceiveAllowed = true;

  private Member(
      String email, String passwordHash, String nickname, MemberRole role, MemberStatus status, boolean randomReceiveAllowed)
  {
    this.email = email;
    this.passwordHash = passwordHash;
    this.nickname = nickname;
    this.role = role;
    this.status = status;
    this.randomReceiveAllowed = randomReceiveAllowed;
  }

  /** 일반 회원 생성 팩토리. 기본 role/status는 USER/ACTIVE를 사용한다. */
  public static Member create(String email, String passwordHash, String nickname) {
    return new Member(
            email, passwordHash, sanitizeNickname(nickname), MemberRole.USER, MemberStatus.ACTIVE, true);
  }

  /** 프로필 닉네임을 갱신한다(빈 값은 기본 닉네임으로 보정). */
  public void updateNickname(String nickname) {
    this.nickname = sanitizeNickname(nickname);
  }

  /** 로그인 이메일을 변경한다. */
  public void updateEmail(String email) {
    this.email = email;
  }

  /** 회원의 상태(ACTIVE, BLOCKED, WITHDRAWN)를 변경합니다. */
  public void updateStatus(MemberStatus status) {
    this.status = status;
  }

  /** 운영/초기화 용도로 회원 권한을 갱신한다. */
  public void updateRole(MemberRole role) {
    this.role = role;
  }

  /** 이미 인코딩된 비밀번호 해시를 교체한다. */
  public void updatePasswordHash(String passwordHash) {
    this.passwordHash = passwordHash;
  }

  /** 비밀번호 비교는 문자열 비교가 아닌 PasswordEncoder.matches 수행한다. */
  public boolean matchesPassword(String rawPassword, PasswordEncoder passwordEncoder) {
    return passwordEncoder.matches(rawPassword, passwordHash);
  }

  /** DB 저장 직전 role/status 기본값 보정. */
  @PrePersist
  private void applyDefaultRoleAndStatus() {
    if (role == null) {
      role = MemberRole.USER;
    }
    if (status == null) {
      status = MemberStatus.ACTIVE;
    }
  }

  private static String sanitizeNickname(String nickname) {
    if (nickname == null || nickname.isBlank()) {
      return DEFAULT_NICKNAME;
    }
    return nickname.trim();
  }


  public void updateRandomReceiveAllowed(boolean allowed) {
    this.randomReceiveAllowed = allowed;
  }
}
