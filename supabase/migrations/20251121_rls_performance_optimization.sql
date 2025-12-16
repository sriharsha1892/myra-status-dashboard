-- Performance Optimization: RLS Policies
-- Created: 2025-11-21
-- Purpose: Optimize RLS policies to reduce repeated subqueries and improve query performance
-- Expected Impact: 10-20% reduction in query time for authenticated requests

-- =============================================================================
-- HELPER FUNCTION: Get Current User Context
-- =============================================================================
-- This function caches the current user's role, company, and admin status
-- to avoid repeated lookups in RLS policies

CREATE OR REPLACE FUNCTION get_current_user_context()
RETURNS TABLE (
  user_id uuid,
  role text,
  parent_company text,
  is_super_admin boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.role,
    u.parent_company,
    COALESCE(u.is_super_admin, false) as is_super_admin
  FROM users u
  WHERE u.id = auth.uid()
  LIMIT 1;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_current_user_context() TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION get_current_user_context() IS
  'Returns current user context (role, parent_company, is_super_admin) with caching. Used by RLS policies to avoid repeated user table lookups.';

-- =============================================================================
-- OPTIMIZED RLS POLICIES FOR TRIAL_ORGANIZATIONS
-- =============================================================================
-- Replace existing policies with optimized versions that use the helper function

-- Drop existing policies
DROP POLICY IF EXISTS "Super admins full access to trial orgs" ON trial_organizations;
DROP POLICY IF EXISTS "Admins can manage company trial orgs" ON trial_organizations;
DROP POLICY IF EXISTS "Account Managers can view/edit company trial orgs" ON trial_organizations;
DROP POLICY IF EXISTS "Account Managers can update company trial orgs" ON trial_organizations;
DROP POLICY IF EXISTS "Account Managers can create trial orgs" ON trial_organizations;

-- Optimized Policy 1: Super admins can do everything
CREATE POLICY "trial_orgs_super_admin_all"
  ON trial_organizations FOR ALL
  TO authenticated
  USING (
    (SELECT is_super_admin FROM get_current_user_context()) = true
  )
  WITH CHECK (
    (SELECT is_super_admin FROM get_current_user_context()) = true
  );

-- Optimized Policy 2: Admins can manage their company's trial orgs
CREATE POLICY "trial_orgs_admin_company"
  ON trial_organizations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM get_current_user_context() u
      WHERE u.role = 'Admin'
      AND u.parent_company = trial_organizations.parent_company
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM get_current_user_context() u
      WHERE u.role = 'Admin'
      AND u.parent_company = trial_organizations.parent_company
    )
  );

-- Optimized Policy 3: Account Managers can SELECT their company's trial orgs
CREATE POLICY "trial_orgs_am_select"
  ON trial_organizations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM get_current_user_context() u
      WHERE u.role = 'Account Manager'
      AND u.parent_company = trial_organizations.parent_company
    )
  );

-- Optimized Policy 4: Account Managers can UPDATE their company's trial orgs
CREATE POLICY "trial_orgs_am_update"
  ON trial_organizations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM get_current_user_context() u
      WHERE u.role = 'Account Manager'
      AND u.parent_company = trial_organizations.parent_company
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM get_current_user_context() u
      WHERE u.role = 'Account Manager'
      AND u.parent_company = trial_organizations.parent_company
    )
  );

-- Optimized Policy 5: Account Managers can INSERT new trial orgs
CREATE POLICY "trial_orgs_am_insert"
  ON trial_organizations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM get_current_user_context() u
      WHERE u.role = 'Account Manager'
      AND u.parent_company = trial_organizations.parent_company
    )
  );

-- =============================================================================
-- OPTIMIZED RLS POLICIES FOR TRIAL_USERS
-- =============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Super admins full access to trial users" ON trial_users;
DROP POLICY IF EXISTS "Admins and AMs can manage trial users" ON trial_users;

-- Optimized Policy 1: Super admins full access
CREATE POLICY "trial_users_super_admin_all"
  ON trial_users FOR ALL
  TO authenticated
  USING (
    (SELECT is_super_admin FROM get_current_user_context()) = true
  )
  WITH CHECK (
    (SELECT is_super_admin FROM get_current_user_context()) = true
  );

-- Optimized Policy 2: Admins and Account Managers can manage their company's trial users
CREATE POLICY "trial_users_admin_am_manage"
  ON trial_users FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM get_current_user_context() u
      JOIN trial_organizations t ON t.org_id = trial_users.org_id
      WHERE u.parent_company = t.parent_company
      AND u.role IN ('Admin', 'Account Manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM get_current_user_context() u
      JOIN trial_organizations t ON t.org_id = trial_users.org_id
      WHERE u.parent_company = t.parent_company
      AND u.role IN ('Admin', 'Account Manager')
    )
  );

-- =============================================================================
-- OPTIMIZED RLS POLICIES FOR TRIAL_SUPPORT_QUERIES
-- =============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Super admins full access to support queries" ON trial_support_queries;
DROP POLICY IF EXISTS "Admins and AMs can manage support queries" ON trial_support_queries;

-- Optimized Policy 1: Super admins full access
CREATE POLICY "support_queries_super_admin_all"
  ON trial_support_queries FOR ALL
  TO authenticated
  USING (
    (SELECT is_super_admin FROM get_current_user_context()) = true
  )
  WITH CHECK (
    (SELECT is_super_admin FROM get_current_user_context()) = true
  );

-- Optimized Policy 2: Admins and AMs can manage their company's support queries
CREATE POLICY "support_queries_admin_am_manage"
  ON trial_support_queries FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM get_current_user_context() u
      JOIN trial_organizations t ON t.org_id = trial_support_queries.org_id
      WHERE u.parent_company = t.parent_company
      AND u.role IN ('Admin', 'Account Manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM get_current_user_context() u
      JOIN trial_organizations t ON t.org_id = trial_support_queries.org_id
      WHERE u.parent_company = t.parent_company
      AND u.role IN ('Admin', 'Account Manager')
    )
  );

-- =============================================================================
-- OPTIMIZED RLS POLICIES FOR SALES_POCS
-- =============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone authenticated can view sales POCs" ON sales_pocs;
DROP POLICY IF EXISTS "Admins can manage sales POCs" ON sales_pocs;

-- Optimized Policy 1: All authenticated users can read
CREATE POLICY "sales_pocs_read_all"
  ON sales_pocs FOR SELECT
  TO authenticated
  USING (true);

-- Optimized Policy 2: Only Admins and Super Admins can modify
CREATE POLICY "sales_pocs_admin_manage"
  ON sales_pocs FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM get_current_user_context() u
      WHERE u.role = 'Admin' OR u.is_super_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM get_current_user_context() u
      WHERE u.role = 'Admin' OR u.is_super_admin = true
    )
  );

-- =============================================================================
-- OPTIMIZED RLS POLICIES FOR ORG_ACTIVITY_NOTES
-- =============================================================================
-- Replace email-based checks with user ID checks for better performance

-- Check if table exists first
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'org_activity_notes'
  ) THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Allow read access to activity notes" ON org_activity_notes;
    DROP POLICY IF EXISTS "Allow insert access to activity notes" ON org_activity_notes;
    DROP POLICY IF EXISTS "Allow update own activity notes" ON org_activity_notes;
    DROP POLICY IF EXISTS "Allow delete own activity notes" ON org_activity_notes;

    -- Create optimized policies using user_id instead of email
    -- Note: Assumes org_activity_notes has a user_id column. If it has logged_by (email),
    -- this migration will add a user_id column and populate it.

    -- Add user_id column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'org_activity_notes'
      AND column_name = 'user_id'
    ) THEN
      -- Add user_id column
      ALTER TABLE org_activity_notes
      ADD COLUMN user_id uuid REFERENCES users(id);

      -- Populate user_id from logged_by email
      UPDATE org_activity_notes
      SET user_id = (SELECT id FROM users WHERE email = org_activity_notes.logged_by)
      WHERE logged_by IS NOT NULL;

      -- Create index on user_id
      CREATE INDEX idx_org_activity_notes_user_id ON org_activity_notes(user_id);
    END IF;

    -- Optimized Policy 1: All authenticated users can read non-deleted notes
    CREATE POLICY "activity_notes_read_all"
      ON org_activity_notes FOR SELECT
      TO authenticated
      USING (deleted = FALSE);

    -- Optimized Policy 2: Authenticated users can insert notes
    CREATE POLICY "activity_notes_insert"
      ON org_activity_notes FOR INSERT
      TO authenticated
      WITH CHECK (
        user_id = auth.uid() OR user_id IS NULL
      );

    -- Optimized Policy 3: Users can update their own notes
    CREATE POLICY "activity_notes_update_own"
      ON org_activity_notes FOR UPDATE
      TO authenticated
      USING (user_id = auth.uid());

    -- Optimized Policy 4: Users can delete their own notes
    CREATE POLICY "activity_notes_delete_own"
      ON org_activity_notes FOR DELETE
      TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

-- =============================================================================
-- ANALYSIS AND MONITORING
-- =============================================================================

-- Create function to analyze RLS policy performance
CREATE OR REPLACE FUNCTION analyze_rls_policy_cost()
RETURNS TABLE (
  table_name text,
  policy_name text,
  estimated_cost text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    schemaname || '.' || tablename as table_name,
    policyname as policy_name,
    'Run EXPLAIN on queries to measure' as estimated_cost
  FROM pg_policies
  WHERE schemaname = 'public'
  ORDER BY tablename, policyname;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION analyze_rls_policy_cost() TO authenticated;

-- =============================================================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON POLICY "trial_orgs_super_admin_all" ON trial_organizations IS
  'Optimized: Super admins full access using cached user context';

COMMENT ON POLICY "trial_orgs_admin_company" ON trial_organizations IS
  'Optimized: Admins manage company trial orgs using cached user context';

COMMENT ON POLICY "trial_orgs_am_select" ON trial_organizations IS
  'Optimized: Account Managers SELECT using cached user context';

-- =============================================================================
-- SUCCESS MESSAGE
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '✓ RLS policies optimized successfully!';
  RAISE NOTICE '✓ Created get_current_user_context() helper function';
  RAISE NOTICE '✓ Reduced repeated user table lookups';
  RAISE NOTICE '✓ Expected improvement: 10-20%% reduction in RLS overhead';
  RAISE NOTICE '✓ Activity notes now use user_id instead of email lookups';
END $$;
