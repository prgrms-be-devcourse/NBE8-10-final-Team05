package com.back.member.domain;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MemberRepository extends JpaRepository<Member, Integer> {

  boolean existsByEmail(String email);

  Optional<Member> findByEmail(String email);
}
