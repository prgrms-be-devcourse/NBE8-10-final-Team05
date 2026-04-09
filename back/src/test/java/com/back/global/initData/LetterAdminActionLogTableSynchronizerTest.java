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
class LetterAdminActionLogTableSynchronizerTest {

  @Mock private JdbcTemplate jdbcTemplate;

  @Test
  @DisplayName("letter 테이블이 있으면 관리자 조치 이력 테이블과 인덱스를 보정한다")
  void runWhenLetterTableExists() {
    LetterAdminActionLogTableSynchronizer synchronizer =
        new LetterAdminActionLogTableSynchronizer(jdbcTemplate);

    when(
            jdbcTemplate.queryForObject(
                "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'letter')",
                Boolean.class))
        .thenReturn(true);

    synchronizer.run(new DefaultApplicationArguments(new String[0]));

    InOrder inOrder = inOrder(jdbcTemplate);
    inOrder.verify(jdbcTemplate)
        .queryForObject(
            "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'letter')",
            Boolean.class);
    inOrder.verify(jdbcTemplate)
        .execute(
            """
        CREATE TABLE IF NOT EXISTS letter_admin_action_logs
        (
            id BIGSERIAL PRIMARY KEY,
            create_date TIMESTAMP NULL,
            modify_date TIMESTAMP NULL,
            letter_id BIGINT NOT NULL,
            admin_member_id BIGINT NOT NULL,
            admin_nickname VARCHAR(60) NOT NULL,
            action_type VARCHAR(40) NOT NULL,
            memo TEXT,
            CONSTRAINT fk_letter_admin_action_logs_letter
                FOREIGN KEY (letter_id) REFERENCES letter (id)
        )
        """);
    inOrder.verify(jdbcTemplate)
        .execute(
            """
        CREATE INDEX IF NOT EXISTS idx_letter_admin_action_logs_letter_id_create_date
            ON letter_admin_action_logs (letter_id, create_date DESC)
        """);
  }

  @Test
  @DisplayName("letter 테이블이 없으면 관리자 조치 이력 테이블 보정을 건너뛴다")
  void runWhenLetterTableDoesNotExist() {
    LetterAdminActionLogTableSynchronizer synchronizer =
        new LetterAdminActionLogTableSynchronizer(jdbcTemplate);

    when(
            jdbcTemplate.queryForObject(
                "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'letter')",
                Boolean.class))
        .thenReturn(false);

    synchronizer.run(new DefaultApplicationArguments(new String[0]));

    verify(jdbcTemplate, never()).execute(org.mockito.ArgumentMatchers.anyString());
  }
}
