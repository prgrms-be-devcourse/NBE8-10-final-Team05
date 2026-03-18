package com.back.member.domain;

import com.back.global.jpa.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;

@Getter
@Entity
@Table(
    name = "members",
    uniqueConstraints = {@UniqueConstraint(name = "uk_members_email", columnNames = "email")})
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Member extends BaseEntity {

  @Column(nullable = false, length = 120)
  private String email;

  @Column(name = "password_hash", nullable = false, length = 255)
  private String passwordHash;

  @Column(nullable = false, length = 30)
  private String nickname;

  private Member(String email, String passwordHash, String nickname) {
    this.email = email;
    this.passwordHash = passwordHash;
    this.nickname = nickname;
  }

  public static Member create(String email, String passwordHash, String nickname) {
    return new Member(email, passwordHash, normalizeNickname(nickname));
  }

  public void updateNickname(String nickname) {
    this.nickname = normalizeNickname(nickname);
  }

  public boolean matchesPassword(String rawPassword, PasswordEncoder passwordEncoder) {
    return passwordEncoder.matches(rawPassword, passwordHash);
  }

  private static String normalizeNickname(String nickname) {
    if (nickname == null || nickname.isBlank()) {
      return "anonymous";
    }
    return nickname.trim();
  }
}
