UPDATE members
SET role = UPPER(BTRIM(role))
WHERE role IS NOT NULL;

UPDATE members
SET status = UPPER(BTRIM(status))
WHERE status IS NOT NULL;

UPDATE members
SET role = 'USER'
WHERE role IS NULL
   OR role = ''
   OR role NOT IN ('USER', 'ADMIN');

UPDATE members
SET status = 'ACTIVE'
WHERE status IS NULL
   OR status = ''
   OR status NOT IN ('ACTIVE', 'BLOCKED', 'WITHDRAWN');

ALTER TABLE members
    ALTER COLUMN role SET DEFAULT 'USER';

ALTER TABLE members
    ALTER COLUMN status SET DEFAULT 'ACTIVE';

ALTER TABLE members
    ALTER COLUMN role SET NOT NULL;

ALTER TABLE members
    ALTER COLUMN status SET NOT NULL;

DO
$$
    BEGIN
        IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conname = 'chk_members_role_valid'
        ) THEN
            ALTER TABLE members
                ADD CONSTRAINT chk_members_role_valid
                    CHECK (role IN ('USER', 'ADMIN'));
        END IF;
    END
$$;

DO
$$
    BEGIN
        IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conname = 'chk_members_status_valid'
        ) THEN
            ALTER TABLE members
                ADD CONSTRAINT chk_members_status_valid
                    CHECK (status IN ('ACTIVE', 'BLOCKED', 'WITHDRAWN'));
        END IF;
    END
$$;
