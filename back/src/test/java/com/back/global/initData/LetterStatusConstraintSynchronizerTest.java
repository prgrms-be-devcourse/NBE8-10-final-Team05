package com.back.global.initData;

import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.jdbc.core.JdbcTemplate;

@ExtendWith(MockitoExtension.class)
class LetterStatusConstraintSynchronizerTest {

  @Mock private JdbcTemplate jdbcTemplate;

  @Test
  @DisplayName("letter 테이블이 있으면 기존 status 체크 제약을 제거하고 현재 enum 기준 제약을 다시 생성한다")
  void runWhenLetterTableExists() {
    LetterStatusConstraintSynchronizer synchronizer =
        new LetterStatusConstraintSynchronizer(jdbcTemplate);

    when(
            jdbcTemplate.queryForObject(
                "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'letter')",
                Boolean.class))
        .thenReturn(true);
    when(
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
                String.class))
        .thenReturn(java.util.List.of("letter_status_check"));

    synchronizer.run(new DefaultApplicationArguments(new String[0]));

    InOrder inOrder = inOrder(jdbcTemplate);
    inOrder.verify(jdbcTemplate)
        .queryForObject(
            "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'letter')",
            Boolean.class);
    inOrder.verify(jdbcTemplate)
        .queryForList(
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
    inOrder.verify(jdbcTemplate)
        .execute("ALTER TABLE letter DROP CONSTRAINT IF EXISTS letter_status_check");
    inOrder.verify(jdbcTemplate)
        .execute(
            "ALTER TABLE letter ADD CONSTRAINT letter_status_check CHECK (status IN ('SENT', 'ACCEPTED', 'WRITING', 'REPLIED'))");
  }

  @Test
  @DisplayName("letter 테이블이 없으면 제약 동기화를 건너뛴다")
  void runWhenLetterTableDoesNotExist() {
    LetterStatusConstraintSynchronizer synchronizer =
        new LetterStatusConstraintSynchronizer(jdbcTemplate);

    when(
            jdbcTemplate.queryForObject(
                "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'letter')",
                Boolean.class))
        .thenReturn(false);

    synchronizer.run(new DefaultApplicationArguments(new String[0]));

    verify(jdbcTemplate, never())
        .queryForList(
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
    verify(jdbcTemplate, never()).execute(org.mockito.ArgumentMatchers.anyString());
  }
}
