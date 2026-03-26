package com.back.global.initData;

import com.back.letter.domain.LetterStatus;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * 로컬 개발 DB는 ddl-auto=update만으로 enum 체크 제약이 갱신되지 않으므로,
 * letter.status 제약을 현재 LetterStatus 정의와 동기화한다.
 */
@Component
@Profile("dev")
@Order(Ordered.HIGHEST_PRECEDENCE)
@RequiredArgsConstructor
public class LetterStatusConstraintSynchronizer implements ApplicationRunner {

  private final JdbcTemplate jdbcTemplate;

  @Override
  public void run(ApplicationArguments args) {
    if (!letterTableExists()) {
      return;
    }

    dropLegacyStatusConstraints();
    jdbcTemplate.execute(buildAddConstraintSql());
  }

  private boolean letterTableExists() {
    Boolean exists =
        jdbcTemplate.queryForObject(
            "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'letter')",
            Boolean.class);

    return Boolean.TRUE.equals(exists);
  }

  private void dropLegacyStatusConstraints() {
    List<String> constraintNames =
        jdbcTemplate.queryForList(
            """
            SELECT c.conname
            FROM pg_constraint c
            JOIN pg_class t ON t.oid = c.conrelid
            JOIN pg_namespace n ON n.oid = t.relnamespace
            WHERE c.contype = 'c'
              AND n.nspname = 'public'
              AND t.relname = 'letter'
              AND pg_get_constraintdef(c.oid) LIKE '%status%'
            """,
            String.class);

    for (String constraintName : constraintNames) {
      jdbcTemplate.execute("ALTER TABLE letter DROP CONSTRAINT IF EXISTS " + constraintName);
    }
  }

  String buildAddConstraintSql() {
    String allowedStatuses =
        Arrays.stream(LetterStatus.values())
            .map(LetterStatus::name)
            .map(status -> "'" + status + "'")
            .collect(Collectors.joining(", "));

    return "ALTER TABLE letter ADD CONSTRAINT letter_status_check CHECK (status IN (%s))"
        .formatted(allowedStatuses);
  }
}
