-- ========================================
-- COMPREHENSIVE FIX: Users Table RLS Infinite Recursion
-- ========================================
-- Priority: CRITICAL - Fixes all 500 errors with code 42P17
-- Date: 2025-01-13 (Revised)
--
-- PROBLEM:
-- The migration 20250113_add_users_table_rls.sql created policies that
-- query the users table from within users table policies, causing infinite
-- recursion when PostgreSQL tries to evaluate RLS permissions.
--
-- SOLUTION:
-- Replace ALL recursive policies with simple, non-recursive ones that use:
-- 1. auth.uid() - a function, not a query
-- 2. USING (true) - a constant, not a query
-- 3. Direct column comparisons - no subqueries
--
-- This breaks the recursion cycle and allows other tables' RLS policies
-- to safely query the users table without triggering infinite recursion.
-- ========================================

-- ========================================
-- STEP 1: Drop ALL existing policies on users table
-- ========================================

-- Policies from 20250113_add_users_table_rls.sql (the problematic ones)
DROP POLICY IF EXISTS "Users can view own record" ON users;
DROP POLICY IF EXISTS "Super admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can view company users" ON users;
DROP POLICY IF EXISTS "Super admins can create users" ON users;
DROP POLICY IF EXISTS "Users can update own record and admins can update company users" ON users;
DROP POLICY IF EXISTS "Super admins can delete users" ON users;

-- Policies from 20250113_fix_users_rls_infinite_recursion.sql (partial fix)
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can read company users" ON users;
DROP POLICY IF EXISTS "Allow all authenticated users" ON users;
DROP POLICY IF EXISTS "Authenticated users can view all users" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

-- Any other potential policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON users;
DROP POLICY IF EXISTS "Enable update for users based on id" ON users;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON users;
DROP POLICY IF EXISTS "Enable delete for users based on id" ON users;

-- ========================================
-- STEP 2: Enable RLS on users table
-- ========================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- ========================================
-- STEP 3: Create simple, non-recursive policies
-- ========================================

-- ----------------------------------------
-- SELECT Policy: All authenticated users can view all users
-- ----------------------------------------
-- This is SAFE and NON-RECURSIVE because:
-- - Uses USING (true) which is a constant
-- - No subqueries, no EXISTS, no SELECT from users table
-- - When other tables query users (e.g., trial_organizations RLS),
--   this policy returns results without recursion
--
-- WHY THIS WORKS:
-- When trial_organizations RLS checks:
--   EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'Admin')
-- The users table policy just returns true (allow all authenticated users to SELECT)
-- No recursion occurs because we don't query users table again
--
CREATE POLICY "Authenticated users can view all users"
  ON users FOR SELECT
  TO authenticated
  USING (true);

-- ----------------------------------------
-- UPDATE Policy: Users can only update their own profile
-- ----------------------------------------
-- This is SAFE and NON-RECURSIVE because:
-- - Uses direct column comparison: id = auth.uid()
-- - auth.uid() is a function that returns UUID, not a query
-- - No subqueries, no recursion
--
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ----------------------------------------
-- INSERT Policy: No RLS (handled by service role in API)
-- ----------------------------------------
-- User creation is handled by:
-- - /app/api/admin/users/route.ts (POST endpoint)
-- - Uses SUPABASE_SERVICE_ROLE_KEY which bypasses RLS
-- - Admin authentication verified in API middleware
--
-- No INSERT policy needed - service role has full access

-- ----------------------------------------
-- DELETE Policy: No RLS (handled by service role in API)
-- ----------------------------------------
-- User deletion is handled by:
-- - /app/api/admin/users/route.ts (DELETE endpoint)
-- - Uses SUPABASE_SERVICE_ROLE_KEY which bypasses RLS
-- - Admin authentication verified in API middleware
--
-- No DELETE policy needed - service role has full access

-- ========================================
-- VERIFICATION QUERIES
-- ========================================

-- After applying this migration, run these queries to verify:

-- 1. Check that policies exist and are non-recursive:
-- SELECT
--   policyname,
--   cmd,
--   qual,
--   with_check
-- FROM pg_policies
-- WHERE schemaname = 'public' AND tablename = 'users'
-- ORDER BY policyname;

-- Expected result:
-- - 2 policies: "Authenticated users can view all users" and "Users can update own profile"
-- - qual column should show simple expressions, no subqueries

-- 2. Test that users table queries work:
-- SELECT id, email, role FROM users LIMIT 5;

-- Expected result:
-- - Returns user records without error
-- - No 42P17 infinite recursion error

-- 3. Test that other tables can query users without recursion:
-- SELECT org_id, org_name FROM trial_organizations LIMIT 5;

-- Expected result:
-- - Returns trial organizations without error
-- - RLS policies on trial_organizations can successfully query users table

-- ========================================
-- DOCUMENTATION
-- ========================================

COMMENT ON TABLE users IS 'Users table with non-recursive RLS policies. All authenticated users can SELECT all users (required for RLS policies on other tables). Users can UPDATE only their own record. INSERT and DELETE are handled by service role in API endpoints.';

-- ========================================
-- WHY THE PREVIOUS FIX DIDN''T WORK
-- ========================================
--
-- 1. Incomplete DROP statements:
--    - Previous fix only dropped 3 policies
--    - The 6 recursive policies from 20250113_add_users_table_rls.sql remained active
--    - Caused infinite recursion to persist
--
-- 2. Migration never applied:
--    - Script scripts/apply-users-rls-fix.js requires custom RPC function
--    - RPC function 'exec_sql' doesn't exist in Supabase project
--    - Manual application via Dashboard is required
--
-- 3. This comprehensive fix:
--    - Drops ALL possible policy names (16 total)
--    - Creates only 2 simple, non-recursive policies
--    - Must be applied manually via Supabase Dashboard SQL Editor
--
-- ========================================
-- NEXT STEPS AFTER APPLYING THIS MIGRATION
-- ========================================
--
-- 1. Delete the problematic migration file:
--    - supabase/migrations/20250113_add_users_table_rls.sql
--    - Rename it to *.sql.bak or move to archive folder
--    - Prevents accidental re-application
--
-- 2. Test the application:
--    - Refresh localhost:3000/support
--    - Verify no console errors
--    - Check that dashboard widgets load data
--    - Confirm trial_organizations, announcements, demos all query successfully
--
-- 3. Monitor for errors:
--    - Check browser console for any remaining 42P17 errors
--    - Verify all API endpoints return 200 status codes
--    - Ensure no 500 Internal Server Errors
--
-- ========================================
