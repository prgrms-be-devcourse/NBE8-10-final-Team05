package com.back.member.domain;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/** 회원 엔티티 조회/중복 검증을 담당하는 저장소. */
public interface MemberRepository extends JpaRepository<Member, Long> {

  /** 이메일 중복 여부를 확인한다. */
  boolean existsByEmail(String email);

  /** 이메일로 회원을 조회한다. */
  Optional<Member> findByEmail(String email);
}
