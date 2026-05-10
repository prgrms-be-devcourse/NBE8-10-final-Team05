DO
$$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'comment'
    ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'comment'
          AND column_name = 'version'
    ) THEN
        ALTER TABLE comment
            ADD COLUMN version BIGINT NOT NULL DEFAULT 0;
    END IF;
END
$$;
