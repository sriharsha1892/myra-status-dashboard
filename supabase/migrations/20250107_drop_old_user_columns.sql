-- Drop old columns from trial_users table after data migration
-- This removes full_name and title_role since we now use name and role

-- Drop full_name column if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='trial_users' AND column_name='full_name') THEN
        ALTER TABLE trial_users DROP COLUMN full_name;
        RAISE NOTICE 'Dropped full_name column';
    END IF;
END $$;

-- Drop title_role column if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='trial_users' AND column_name='title_role') THEN
        ALTER TABLE trial_users DROP COLUMN title_role;
        RAISE NOTICE 'Dropped title_role column';
    END IF;
END $$;

-- Drop is_primary_contact if it exists (not used in new schema)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='trial_users' AND column_name='is_primary_contact') THEN
        ALTER TABLE trial_users DROP COLUMN is_primary_contact;
        RAISE NOTICE 'Dropped is_primary_contact column';
    END IF;
END $$;

-- Drop is_champion if it exists (not used in new schema)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='trial_users' AND column_name='is_champion') THEN
        ALTER TABLE trial_users DROP COLUMN is_champion;
        RAISE NOTICE 'Dropped is_champion column';
    END IF;
END $$;

-- Drop user_status if it exists (replaced by current_stage)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='trial_users' AND column_name='user_status') THEN
        ALTER TABLE trial_users DROP COLUMN user_status;
        RAISE NOTICE 'Dropped user_status column';
    END IF;
END $$;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Old columns cleaned up successfully!';
    RAISE NOTICE 'trial_users now uses: name, role, current_stage';
END $$;
