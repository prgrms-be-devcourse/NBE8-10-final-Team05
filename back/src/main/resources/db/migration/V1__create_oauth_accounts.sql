CREATE TABLE IF NOT EXISTS oauth_accounts
(
    id               BIGSERIAL PRIMARY KEY,
    create_date      TIMESTAMP NULL,
    modify_date      TIMESTAMP NULL,
    member_id        BIGINT       NOT NULL,
    provider         VARCHAR(40)  NOT NULL,
    provider_user_id VARCHAR(120) NOT NULL,
    email_at_provider VARCHAR(120),
    connected_at     TIMESTAMP    NOT NULL,
    last_login_at    TIMESTAMP    NOT NULL,
    CONSTRAINT fk_oauth_accounts_member
        FOREIGN KEY (member_id) REFERENCES members (id),
    CONSTRAINT uk_oauth_accounts_provider_user
        UNIQUE (provider, provider_user_id),
    CONSTRAINT uk_oauth_accounts_member_provider
        UNIQUE (member_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_oauth_accounts_member_id
    ON oauth_accounts (member_id);
