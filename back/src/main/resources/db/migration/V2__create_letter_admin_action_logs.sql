CREATE TABLE IF NOT EXISTS letter_admin_action_logs
(
    id              BIGSERIAL PRIMARY KEY,
    create_date     TIMESTAMP NULL,
    modify_date     TIMESTAMP NULL,
    letter_id       BIGINT      NOT NULL,
    admin_member_id BIGINT      NOT NULL,
    admin_nickname  VARCHAR(60) NOT NULL,
    action_type     VARCHAR(40) NOT NULL,
    memo            TEXT,
    CONSTRAINT fk_letter_admin_action_logs_letter
        FOREIGN KEY (letter_id) REFERENCES letter (id)
);

CREATE INDEX IF NOT EXISTS idx_letter_admin_action_logs_letter_id_create_date
    ON letter_admin_action_logs (letter_id, create_date DESC);
