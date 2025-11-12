-- Migration: Remove deprecated roles and normalize to Admin/Account Manager only
-- Priority: HIGH - Security fix for Team role admin bypass bug
-- Date: 2025-01-13

-- Step 1: Drop old CHECK constraint FIRST (before updating values)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Step 2: Migrate existing users with deprecated roles to appropriate new roles
-- Product, Sales Admin, Research Admin, Team -> Admin
-- Prodgain User, Viewer -> Admin
-- admin, account_manager, sales_poc, viewer (lowercase) -> Admin, Account Manager (capitalized)

-- Migrate deprecated roles to Admin
UPDATE users
SET role = 'Admin', updated_at = NOW()
WHERE role IN ('Team', 'Product', 'Sales Admin', 'Research Admin', 'Prodgain User', 'Viewer', 'admin', 'sales_poc', 'viewer');

-- Migrate account_manager (lowercase) to Account Manager (capitalized)
UPDATE users
SET role = 'Account Manager', updated_at = NOW()
WHERE role = 'account_manager';

-- Log the migration for audit purposes
DO $$
DECLARE
  admin_count INTEGER;
  am_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO admin_count FROM users WHERE role = 'Admin';
  SELECT COUNT(*) INTO am_count FROM users WHERE role = 'Account Manager';
  RAISE NOTICE 'Migration complete: % Admins, % Account Managers', admin_count, am_count;
END $$;

-- Step 3: Add new CHECK constraint allowing only Admin and Account Manager
ALTER TABLE users
ADD CONSTRAINT users_role_check
CHECK (role IN ('Admin', 'Account Manager'));

-- Step 4: Update default role to Account Manager (safer default than admin)
ALTER TABLE users
ALTER COLUMN role SET DEFAULT 'Account Manager';

-- Step 5: Update column comment to reflect new role structure
COMMENT ON COLUMN users.role IS 'User role: Admin (full access to company data, user management) or Account Manager (manage assigned trial orgs, read-only tickets)';

-- Step 6: Create index on role for efficient filtering
CREATE INDEX IF NOT EXISTS idx_users_role_normalized ON users(role);

-- Migration validation query (for manual verification after applying):
-- SELECT role, COUNT(*) as count,
--        ARRAY_AGG(DISTINCT parent_company) as companies,
--        ARRAY_AGG(email ORDER BY created_at DESC) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as recent_users
-- FROM users
-- GROUP BY role
-- ORDER BY count DESC;

-- Important notes:
-- 1. All deprecated roles (Team, Product, Prodgain User, Sales Admin, Research Admin, Viewer) are now Admin
-- 2. Team role admin bypass bug is fixed by removing Team role entirely
-- 3. Only 'Admin' and 'Account Manager' roles allowed going forward
-- 4. Application code must be updated to use these new role names
-- 5. RLS policies will be updated in subsequent migrations to reflect new role structure
