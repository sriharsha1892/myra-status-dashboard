-- Migration: Add parent_company for multi-tenancy (Mordor Intelligence vs GMI)
-- Description: Separate trial organizations by parent company
-- Date: 2025-01-09

-- Step 1: Add parent_company to trial_organizations
ALTER TABLE trial_organizations
ADD COLUMN IF NOT EXISTS parent_company TEXT NOT NULL DEFAULT 'Mordor Intelligence';

-- Step 2: Add parent_company to users table (for scoping account managers)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS parent_company TEXT;

-- Step 3: Add is_super_admin flag to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- Step 4: Set all existing users to Mordor Intelligence by default
UPDATE users
SET parent_company = 'Mordor Intelligence'
WHERE parent_company IS NULL;

-- Step 5: Make parent_company NOT NULL on users after setting defaults
ALTER TABLE users
ALTER COLUMN parent_company SET NOT NULL;

-- Step 6: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_trial_organizations_parent_company
ON trial_organizations(parent_company);

CREATE INDEX IF NOT EXISTS idx_users_parent_company
ON users(parent_company);

CREATE INDEX IF NOT EXISTS idx_users_is_super_admin
ON users(is_super_admin);

-- Step 7: Add CHECK constraints to ensure valid parent companies
-- Using DO blocks to handle IF NOT EXISTS for constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_trial_organizations_parent_company'
  ) THEN
    ALTER TABLE trial_organizations
    ADD CONSTRAINT chk_trial_organizations_parent_company
    CHECK (parent_company IN ('Mordor Intelligence', 'GMI'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_users_parent_company'
  ) THEN
    ALTER TABLE users
    ADD CONSTRAINT chk_users_parent_company
    CHECK (parent_company IN ('Mordor Intelligence', 'GMI'));
  END IF;
END $$;

-- Step 8: Add comments for documentation
COMMENT ON COLUMN trial_organizations.parent_company IS
'Parent company: Mordor Intelligence or GMI (Global Market Insights)';

COMMENT ON COLUMN users.parent_company IS
'Parent company assignment for account managers - determines which orgs they can see';

COMMENT ON COLUMN users.is_super_admin IS
'Super admin flag - super admins can see and manage orgs from all parent companies';
