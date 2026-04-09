package com.back.letter.adapter.out.persistence.repository;

import com.back.letter.domain.LetterAdminActionLog;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LetterAdminActionLogRepository extends JpaRepository<LetterAdminActionLog, Long> {
  List<LetterAdminActionLog> findByLetterIdOrderByCreateDateDesc(Long letterId);
}
