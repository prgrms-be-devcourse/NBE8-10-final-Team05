package com.back.member.domain;

import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MemberAdminActionLogRepository extends JpaRepository<MemberAdminActionLog, Long> {

  List<MemberAdminActionLog> findByMemberIdOrderByCreateDateDesc(Long memberId, Pageable pageable);
}
