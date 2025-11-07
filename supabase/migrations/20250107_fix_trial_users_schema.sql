-- Fix trial_users table schema to match the application code
-- This migration adds missing columns if they don't exist

-- Add 'name' column if it doesn't exist (replacing full_name if needed)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='trial_users' AND column_name='name') THEN
        ALTER TABLE trial_users ADD COLUMN name TEXT;

        -- If full_name exists, copy data over
        IF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='trial_users' AND column_name='full_name') THEN
            UPDATE trial_users SET name = full_name WHERE full_name IS NOT NULL;
        END IF;
    END IF;
END $$;

-- Add 'role' column if it doesn't exist (replacing title_role if needed)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='trial_users' AND column_name='role') THEN
        ALTER TABLE trial_users ADD COLUMN role TEXT;

        -- If title_role exists, copy data over
        IF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='trial_users' AND column_name='title_role') THEN
            UPDATE trial_users SET role = title_role WHERE title_role IS NOT NULL;
        END IF;
    END IF;
END $$;

-- Add 'phone' column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='trial_users' AND column_name='phone') THEN
        ALTER TABLE trial_users ADD COLUMN phone TEXT;
    END IF;
END $$;

-- Add 'current_stage' column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='trial_users' AND column_name='current_stage') THEN
        ALTER TABLE trial_users ADD COLUMN current_stage TEXT NOT NULL DEFAULT 'invited';
    END IF;
END $$;

-- Add 'account_manager' column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='trial_users' AND column_name='account_manager') THEN
        ALTER TABLE trial_users ADD COLUMN account_manager TEXT;
    END IF;
END $$;

-- Add 'sales_poc' column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='trial_users' AND column_name='sales_poc') THEN
        ALTER TABLE trial_users ADD COLUMN sales_poc TEXT;
    END IF;
END $$;

-- Add 'salesforce_id' column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='trial_users' AND column_name='salesforce_id') THEN
        ALTER TABLE trial_users ADD COLUMN salesforce_id TEXT;
    END IF;
END $$;

-- Add 'invited_at' column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='trial_users' AND column_name='invited_at') THEN
        ALTER TABLE trial_users ADD COLUMN invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Make 'name' NOT NULL after migration (give it a default if needed)
DO $$
BEGIN
    -- First, set default for any NULL values
    UPDATE trial_users SET name = 'Unknown User' WHERE name IS NULL;

    -- Now make it NOT NULL
    ALTER TABLE trial_users ALTER COLUMN name SET NOT NULL;
END $$;

-- Drop old columns if they exist (optional - comment out if you want to keep them)
-- DO $$
-- BEGIN
--     IF EXISTS (SELECT 1 FROM information_schema.columns
--                WHERE table_name='trial_users' AND column_name='full_name') THEN
--         ALTER TABLE trial_users DROP COLUMN full_name;
--     END IF;
--
--     IF EXISTS (SELECT 1 FROM information_schema.columns
--                WHERE table_name='trial_users' AND column_name='title_role') THEN
--         ALTER TABLE trial_users DROP COLUMN title_role;
--     END IF;
-- END $$;

-- Add indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_trial_users_org_id ON trial_users(org_id);
CREATE INDEX IF NOT EXISTS idx_trial_users_stage ON trial_users(current_stage);
CREATE INDEX IF NOT EXISTS idx_trial_users_account_manager ON trial_users(account_manager);
CREATE INDEX IF NOT EXISTS idx_trial_users_email ON trial_users(email);

-- Comment on changes
COMMENT ON TABLE trial_users IS 'Actual platform users at trial organizations - schema updated to match application code';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'trial_users schema migration completed successfully!';
    RAISE NOTICE 'New columns added: name, role, phone, current_stage, account_manager, sales_poc, salesforce_id, invited_at';
END $$;
