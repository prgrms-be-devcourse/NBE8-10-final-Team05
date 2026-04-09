package com.back.member.domain;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** 회원 엔티티 조회/중복 검증을 담당하는 저장소. */
public interface MemberRepository extends JpaRepository<Member, Long> {

  /** 이메일 중복 여부를 확인한다. */
  boolean existsByEmail(String email);

  /** 이메일로 회원을 조회한다. */
  Optional<Member> findByEmail(String email);

  @Query(
      value =
          """
          SELECT m
          FROM Member m
          WHERE (:status IS NULL OR m.status = :status)
            AND (:role IS NULL OR m.role = :role)
            AND (
              :providerFilter IS NULL
              OR (:providerFilter = 'SOCIAL' AND EXISTS (
                SELECT 1 FROM OAuthAccount oa WHERE oa.member.id = m.id
              ))
              OR (:providerFilter = 'LOCAL' AND NOT EXISTS (
                SELECT 1 FROM OAuthAccount oa WHERE oa.member.id = m.id
              ))
            )
            AND (
              :query IS NULL
              OR lower(m.email) LIKE lower(concat('%', :query, '%'))
              OR lower(m.nickname) LIKE lower(concat('%', :query, '%'))
              OR (:memberIdQuery IS NOT NULL AND m.id = :memberIdQuery)
            )
          """,
      countQuery =
          """
          SELECT count(m)
          FROM Member m
          WHERE (:status IS NULL OR m.status = :status)
            AND (:role IS NULL OR m.role = :role)
            AND (
              :providerFilter IS NULL
              OR (:providerFilter = 'SOCIAL' AND EXISTS (
                SELECT 1 FROM OAuthAccount oa WHERE oa.member.id = m.id
              ))
              OR (:providerFilter = 'LOCAL' AND NOT EXISTS (
                SELECT 1 FROM OAuthAccount oa WHERE oa.member.id = m.id
              ))
            )
            AND (
              :query IS NULL
              OR lower(m.email) LIKE lower(concat('%', :query, '%'))
              OR lower(m.nickname) LIKE lower(concat('%', :query, '%'))
              OR (:memberIdQuery IS NOT NULL AND m.id = :memberIdQuery)
            )
          """)
  Page<Member> searchAdminMembers(
      @Param("query") String query,
      @Param("status") MemberStatus status,
      @Param("role") MemberRole role,
      @Param("providerFilter") String providerFilter,
      @Param("memberIdQuery") Long memberIdQuery,
      Pageable pageable);

  long countByRoleAndStatus(MemberRole role, MemberStatus status);

  long countByStatusAndRoleAndRandomReceiveAllowed(
      MemberStatus status, MemberRole role, boolean randomReceiveAllowed);
}
