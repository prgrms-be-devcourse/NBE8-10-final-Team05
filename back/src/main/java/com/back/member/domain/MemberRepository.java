package com.back.member.domain;

import java.time.LocalDateTime;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** 회원 엔티티 조회/중복 검증을 담당하는 저장소. */
public interface MemberRepository extends JpaRepository<Member, Long> {

  interface AdminMemberListRow {
    Long getId();

    String getEmail();

    String getNickname();

    String getRawRole();

    String getRawStatus();

    Boolean getRandomReceiveAllowed();

    Boolean getSocialAccount();

    LocalDateTime getCreatedAt();

    LocalDateTime getLastLoginAt();
  }

  /** 이메일 중복 여부를 확인한다. */
  boolean existsByEmail(String email);

  /** 이메일로 회원을 조회한다. */
  Optional<Member> findByEmail(String email);

  @Query(
      value =
          """
          SELECT
            m.id AS id,
            m.email AS email,
            m.nickname AS nickname,
            NULLIF(TRIM(m.role), '') AS rawRole,
            NULLIF(TRIM(m.status), '') AS rawStatus,
            m.random_receive_allowed AS randomReceiveAllowed,
            EXISTS (
              SELECT 1
              FROM oauth_accounts oa
              WHERE oa.member_id = m.id
            ) AS socialAccount,
            m.create_date AS createdAt,
            (
              SELECT MAX(oa.last_login_at)
              FROM oauth_accounts oa
              WHERE oa.member_id = m.id
            ) AS lastLoginAt
          FROM members m
          WHERE (:status IS NULL OR m.status = :status)
            AND (:role IS NULL OR m.role = :role)
            AND (
              :providerFilter IS NULL
              OR (:providerFilter = 'SOCIAL' AND EXISTS (
                SELECT 1 FROM oauth_accounts oa WHERE oa.member_id = m.id
              ))
              OR (:providerFilter = 'LOCAL' AND NOT EXISTS (
                SELECT 1 FROM oauth_accounts oa WHERE oa.member_id = m.id
              ))
            )
            AND (
              :query IS NULL
              OR lower(m.email) LIKE lower(concat('%', :query, '%'))
              OR lower(m.nickname) LIKE lower(concat('%', :query, '%'))
              OR (:memberIdQuery IS NOT NULL AND m.id = :memberIdQuery)
            )
          ORDER BY m.create_date DESC, m.id DESC
          """,
      countQuery =
          """
          SELECT count(*)
          FROM members m
          WHERE (:status IS NULL OR m.status = :status)
            AND (:role IS NULL OR m.role = :role)
            AND (
              :providerFilter IS NULL
              OR (:providerFilter = 'SOCIAL' AND EXISTS (
                SELECT 1 FROM oauth_accounts oa WHERE oa.member_id = m.id
              ))
              OR (:providerFilter = 'LOCAL' AND NOT EXISTS (
                SELECT 1 FROM oauth_accounts oa WHERE oa.member_id = m.id
              ))
            )
            AND (
              :query IS NULL
              OR lower(m.email) LIKE lower(concat('%', :query, '%'))
              OR lower(m.nickname) LIKE lower(concat('%', :query, '%'))
              OR (:memberIdQuery IS NOT NULL AND m.id = :memberIdQuery)
            )
          """,
      nativeQuery = true)
  Page<AdminMemberListRow> searchAdminMembers(
      @Param("query") String query,
      @Param("status") String status,
      @Param("role") String role,
      @Param("providerFilter") String providerFilter,
      @Param("memberIdQuery") Long memberIdQuery,
      Pageable pageable);

  long countByRoleAndStatus(MemberRole role, MemberStatus status);

  long countByStatusAndRoleAndRandomReceiveAllowed(
      MemberStatus status, MemberRole role, boolean randomReceiveAllowed);
}
