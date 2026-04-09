package com.back.member.domain;

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
@Table(name = "member_admin_action_logs")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MemberAdminActionLog extends BaseEntity {

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "member_id", nullable = false)
  private Member member;

  @Column(nullable = false)
  private Long adminMemberId;

  @Column(nullable = false, length = 60)
  private String adminNickname;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 40)
  private MemberAdminActionType actionType;

  @Column(length = 120)
  private String beforeValue;

  @Column(length = 120)
  private String afterValue;

  @Column(columnDefinition = "TEXT")
  private String memo;

  @Builder
  private MemberAdminActionLog(
      Member member,
      Long adminMemberId,
      String adminNickname,
      MemberAdminActionType actionType,
      String beforeValue,
      String afterValue,
      String memo) {
    this.member = member;
    this.adminMemberId = adminMemberId;
    this.adminNickname = adminNickname;
    this.actionType = actionType;
    this.beforeValue = beforeValue;
    this.afterValue = afterValue;
    this.memo = memo;
  }

  public static MemberAdminActionLog create(
      Member member,
      Long adminMemberId,
      String adminNickname,
      MemberAdminActionType actionType,
      String beforeValue,
      String afterValue,
      String memo) {
    return MemberAdminActionLog.builder()
        .member(member)
        .adminMemberId(adminMemberId)
        .adminNickname(adminNickname)
        .actionType(actionType)
        .beforeValue(beforeValue)
        .afterValue(afterValue)
        .memo(memo)
        .build();
  }
}
