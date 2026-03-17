package com.back.member.domain;

import com.back.global.jpa.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(
    name = "members",
    uniqueConstraints = {@UniqueConstraint(name = "uk_members_email", columnNames = "email")})
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Member extends BaseEntity {

  @Column(nullable = false, length = 120)
  private String email;

  @Column(nullable = false, length = 255)
  private String password;

  @Column(nullable = false, length = 30)
  private String nickname;

  private Member(String email, String password, String nickname) {
    this.email = email;
    this.password = password;
    this.nickname = nickname;
  }

  public static Member create(String email, String password, String nickname) {
    return new Member(email, password, normalizeNickname(nickname));
  }

  public void updateNickname(String nickname) {
    this.nickname = normalizeNickname(nickname);
  }

  private static String normalizeNickname(String nickname) {
    if (nickname == null || nickname.isBlank()) {
      return "anonymous";
    }
    return nickname.trim();
  }
}
