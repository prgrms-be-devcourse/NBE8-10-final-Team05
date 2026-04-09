package com.back.letter.adapter.out.persistence.repository;

import com.back.letter.domain.LetterAdminActionLog;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface LetterAdminActionLogRepository extends JpaRepository<LetterAdminActionLog, Long> {
  interface LatestActionProjection {
    Long getLetterId();

    String getActionType();
  }

  List<LetterAdminActionLog> findByLetterIdOrderByCreateDateDesc(Long letterId);

  @Query(
      value =
          """
          SELECT DISTINCT ON (letter_id)
            letter_id AS letterId,
            action_type AS actionType
          FROM letter_admin_action_logs
          WHERE letter_id IN (:letterIds)
          ORDER BY letter_id, create_date DESC, id DESC
          """,
      nativeQuery = true)
  List<LatestActionProjection> findLatestActionsByLetterIds(@Param("letterIds") List<Long> letterIds);
}
