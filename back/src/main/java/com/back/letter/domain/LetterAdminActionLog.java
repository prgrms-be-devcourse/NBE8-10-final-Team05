package com.back.letter.domain;

import com.back.global.jpa.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@Table(name = "letter_admin_action_logs")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class LetterAdminActionLog extends BaseEntity {

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "letter_id", nullable = false)
  private Letter letter;

  @Column(nullable = false)
  private Long adminMemberId;

  @Column(nullable = false, length = 60)
  private String adminNickname;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 40)
  private AdminLetterActionType actionType;

  @Column(columnDefinition = "TEXT")
  private String memo;

  @Builder
  private LetterAdminActionLog(
      Letter letter,
      Long adminMemberId,
      String adminNickname,
      AdminLetterActionType actionType,
      String memo) {
    this.letter = letter;
    this.adminMemberId = adminMemberId;
    this.adminNickname = adminNickname;
    this.actionType = actionType;
    this.memo = memo;
  }

  public static LetterAdminActionLog create(
      Letter letter,
      Long adminMemberId,
      String adminNickname,
      AdminLetterActionType actionType,
      String memo) {
    return LetterAdminActionLog.builder()
        .letter(letter)
        .adminMemberId(adminMemberId)
        .adminNickname(adminNickname)
        .actionType(actionType)
        .memo(memo)
        .build();
  }
}
