package com.back.global.initData;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@Profile("!test")
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
@RequiredArgsConstructor
public class LetterAdminActionLogTableSynchronizer implements ApplicationRunner {

  private final JdbcTemplate jdbcTemplate;

  @Override
  public void run(ApplicationArguments args) {
    if (!letterTableExists()) {
      return;
    }

    jdbcTemplate.execute(
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

    jdbcTemplate.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_letter_admin_action_logs_letter_id_create_date
            ON letter_admin_action_logs (letter_id, create_date DESC)
        """);
  }

  private boolean letterTableExists() {
    Boolean exists =
        jdbcTemplate.queryForObject(
            "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'letter')",
            Boolean.class);

    return Boolean.TRUE.equals(exists);
  }
}
