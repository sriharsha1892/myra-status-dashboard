-- Migration: Fix Trial Organization Schema Consistency
-- Date: 2025-11-18
-- Purpose: Resolve field name inconsistencies and ensure data integrity for trial org forms

-- ============================================================================
-- PART 1: Fix parent_company field inconsistency
-- ============================================================================

-- Step 1: Copy parent_organization to parent_company where parent_company is NULL
-- This handles cases where parent_organization was set but parent_company wasn't
UPDATE trial_organizations
SET parent_company = parent_organization
WHERE parent_company IS NULL
  AND parent_organization IS NOT NULL;

-- Step 2: Set default for any remaining NULL parent_company values
UPDATE trial_organizations
SET parent_company = 'Mordor Intelligence'
WHERE parent_company IS NULL;

-- Step 3: Make parent_company NOT NULL with default
ALTER TABLE trial_organizations
ALTER COLUMN parent_company SET NOT NULL,
ALTER COLUMN parent_company SET DEFAULT 'Mordor Intelligence';

-- Step 4: Add CHECK constraint to ensure valid parent company values
ALTER TABLE trial_organizations
DROP CONSTRAINT IF EXISTS valid_parent_company;

ALTER TABLE trial_organizations
ADD CONSTRAINT valid_parent_company
CHECK (parent_company IN ('Mordor Intelligence', 'GMI'));

-- ============================================================================
-- PART 2: Fix account_manager field confusion (TEXT vs UUID)
-- ============================================================================

-- Step 1: For any trial_organizations with account_manager (TEXT) but not account_manager_id (UUID),
-- try to find matching user by email or full_name and set account_manager_id
UPDATE trial_organizations t
SET account_manager_id = u.id
FROM users u
WHERE t.account_manager_id IS NULL
  AND t.account_manager IS NOT NULL
  AND (u.email = t.account_manager OR u.full_name = t.account_manager OR u.id::text = t.account_manager);

-- Step 2: Set default account_manager_id to first available Admin/Account Manager if still NULL
UPDATE trial_organizations
SET account_manager_id = (
  SELECT id FROM users
  WHERE role IN ('Admin', 'Account Manager')
  ORDER BY created_at
  LIMIT 1
)
WHERE account_manager_id IS NULL;

-- Step 3: Make account_manager_id NOT NULL (now that all NULLs are filled)
ALTER TABLE trial_organizations
ALTER COLUMN account_manager_id SET NOT NULL;

-- Step 4: Drop the legacy account_manager TEXT column to prevent future confusion
-- This is the source of the bug - code was mixing TEXT and UUID fields
ALTER TABLE trial_organizations
DROP COLUMN IF EXISTS account_manager;

-- ============================================================================
-- PART 3: Add NOT NULL constraints for critical fields
-- ============================================================================

-- Ensure org_name is always set
UPDATE trial_organizations
SET org_name = 'Unnamed Organization'
WHERE org_name IS NULL OR org_name = '';

ALTER TABLE trial_organizations
ALTER COLUMN org_name SET NOT NULL;

-- Ensure domain is always set
UPDATE trial_organizations
SET domain = 'Unassigned'
WHERE domain IS NULL OR domain = '';

ALTER TABLE trial_organizations
ALTER COLUMN domain SET NOT NULL;

-- ============================================================================
-- PART 4: Fix trial_users account_manager field
-- ============================================================================

-- trial_users also has account_manager TEXT field that should reference account_manager_id
-- Update trial_users to use account_manager_id from parent organization
UPDATE trial_users tu
SET account_manager = to_account_manager.account_manager_id::text
FROM trial_organizations to_account_manager
WHERE tu.org_id = to_account_manager.org_id
  AND (tu.account_manager IS NULL OR tu.account_manager = '');

-- ============================================================================
-- PART 5: Add helpful comments for future developers
-- ============================================================================

COMMENT ON COLUMN trial_organizations.account_manager_id IS
  'UUID foreign key to users table. This is the canonical account manager field. Legacy account_manager TEXT field has been removed.';

COMMENT ON COLUMN trial_organizations.parent_company IS
  'Parent company name. Must be either "Mordor Intelligence" or "GMI". This is used by RLS policies for access control.';

COMMENT ON COLUMN trial_organizations.parent_organization IS
  'Deprecated: Use parent_company instead. Kept for backward compatibility with existing code.';

-- ============================================================================
-- VERIFICATION QUERIES (commented out - for manual testing)
-- ============================================================================

-- To verify the migration worked correctly, run these queries:

-- Check 1: All orgs should have parent_company
-- SELECT COUNT(*) as orgs_without_parent_company FROM trial_organizations WHERE parent_company IS NULL;
-- Expected: 0

-- Check 2: All orgs should have account_manager_id
-- SELECT COUNT(*) as orgs_without_account_manager FROM trial_organizations WHERE account_manager_id IS NULL;
-- Expected: 0

-- Check 3: Legacy account_manager column should not exist
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'trial_organizations' AND column_name = 'account_manager';
-- Expected: 0 rows

-- Check 4: All org_names and domains should be set
-- SELECT COUNT(*) FROM trial_organizations WHERE org_name IS NULL OR org_name = '' OR domain IS NULL OR domain = '';
-- Expected: 0
