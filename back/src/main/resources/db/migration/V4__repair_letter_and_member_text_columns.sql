DO
$$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'letter'
          AND column_name = 'title'
          AND udt_name = 'bytea'
    ) THEN
        ALTER TABLE letter
            ALTER COLUMN title TYPE VARCHAR(255)
            USING convert_from(title, 'UTF8');
    END IF;
END
$$;

DO
$$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'letter'
          AND column_name = 'content'
          AND udt_name = 'bytea'
    ) THEN
        ALTER TABLE letter
            ALTER COLUMN content TYPE TEXT
            USING convert_from(content, 'UTF8');
    END IF;
END
$$;

DO
$$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'letter'
          AND column_name = 'summary'
          AND udt_name = 'bytea'
    ) THEN
        ALTER TABLE letter
            ALTER COLUMN summary TYPE TEXT
            USING convert_from(summary, 'UTF8');
    END IF;
END
$$;

DO
$$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'letter'
          AND column_name = 'reply_content'
          AND udt_name = 'bytea'
    ) THEN
        ALTER TABLE letter
            ALTER COLUMN reply_content TYPE TEXT
            USING convert_from(reply_content, 'UTF8');
    END IF;
END
$$;

DO
$$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'letter'
          AND column_name = 'reply_summary'
          AND udt_name = 'bytea'
    ) THEN
        ALTER TABLE letter
            ALTER COLUMN reply_summary TYPE TEXT
            USING convert_from(reply_summary, 'UTF8');
    END IF;
END
$$;

DO
$$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'members'
          AND column_name = 'nickname'
          AND udt_name = 'bytea'
    ) THEN
        ALTER TABLE members
            ALTER COLUMN nickname TYPE VARCHAR(30)
            USING convert_from(nickname, 'UTF8');
    END IF;
END
$$;
