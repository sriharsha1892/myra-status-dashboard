-- Update user fields for trial_users
-- 1. Add freshsales_url field
-- 2. Document new 'inactive' stage option
-- 3. Phone field already exists, will be hidden in UI but kept in DB

-- Add freshsales_url column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='trial_users' AND column_name='freshsales_url') THEN
        ALTER TABLE trial_users ADD COLUMN freshsales_url TEXT;
        RAISE NOTICE 'Added freshsales_url column';
    END IF;
END $$;

-- Add comment on freshsales_url
COMMENT ON COLUMN trial_users.freshsales_url IS 'URL to Freshsales contact page for this user';

-- Update current_stage documentation to include 'inactive'
COMMENT ON COLUMN trial_users.current_stage IS 'User stage: invited, onboarding, active, inactive';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ User fields updated successfully!';
    RAISE NOTICE 'Added: freshsales_url field';
    RAISE NOTICE 'User stages: invited, onboarding, active, inactive';
END $$;
