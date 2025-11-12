-- Migration: Replace "Allow all" policies with proper RLS for trial organizations
-- Priority: HIGH - Security fix + enables AM company-wide access
-- Date: 2025-01-13

-- ========================================
-- TRIAL_ORGANIZATIONS: Proper RLS Policies
-- ========================================

-- Drop old "Allow all" policy
DROP POLICY IF EXISTS "Allow all for now on trial_orgs" ON trial_organizations;

-- Policy 1: Super admins can do everything across all companies
CREATE POLICY "Super admins full access to trial orgs"
  ON trial_organizations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_super_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_super_admin = true
    )
  );

-- Policy 2: Admins can manage their company's trial orgs
CREATE POLICY "Admins can manage company trial orgs"
  ON trial_organizations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'Admin'
      AND users.parent_company = trial_organizations.parent_company
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'Admin'
      AND users.parent_company = trial_organizations.parent_company
    )
  );

-- Policy 3: Account Managers can SELECT and UPDATE their company's trial orgs
CREATE POLICY "Account Managers can view/edit company trial orgs"
  ON trial_organizations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'Account Manager'
      AND users.parent_company = trial_organizations.parent_company
    )
  );

CREATE POLICY "Account Managers can update company trial orgs"
  ON trial_organizations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'Account Manager'
      AND users.parent_company = trial_organizations.parent_company
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'Account Manager'
      AND users.parent_company = trial_organizations.parent_company
    )
  );

-- Policy 4: Account Managers can INSERT new trial orgs for their company
CREATE POLICY "Account Managers can create trial orgs"
  ON trial_organizations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'Account Manager'
      AND users.parent_company = trial_organizations.parent_company
    )
  );

-- Note: Account Managers CANNOT DELETE trial orgs (only Admins and Super Admins)

-- ========================================
-- TRIAL_USERS: Proper RLS Policies
-- ========================================

-- Drop old "Allow all" policy
DROP POLICY IF EXISTS "Allow all for now on trial_users" ON trial_users;

-- Super admins full access
CREATE POLICY "Super admins full access to trial users"
  ON trial_users FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_super_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_super_admin = true
    )
  );

-- Admins and Account Managers can manage trial users in their company's orgs
CREATE POLICY "Admins and AMs can manage trial users"
  ON trial_users FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN trial_organizations t ON t.org_id = trial_users.org_id
      WHERE u.id = auth.uid()
      AND u.parent_company = t.parent_company
      AND u.role IN ('Admin', 'Account Manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      JOIN trial_organizations t ON t.org_id = trial_users.org_id
      WHERE u.id = auth.uid()
      AND u.parent_company = t.parent_company
      AND u.role IN ('Admin', 'Account Manager')
    )
  );

-- ========================================
-- TRIAL_SUPPORT_QUERIES: Proper RLS Policies
-- ========================================

-- Drop old "Allow all" policy
DROP POLICY IF EXISTS "Allow all for now on support_queries" ON trial_support_queries;

-- Super admins full access
CREATE POLICY "Super admins full access to support queries"
  ON trial_support_queries FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_super_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_super_admin = true
    )
  );

-- Admins and Account Managers can manage support queries in their company's orgs
CREATE POLICY "Admins and AMs can manage support queries"
  ON trial_support_queries FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN trial_organizations t ON t.org_id = trial_support_queries.org_id
      WHERE u.id = auth.uid()
      AND u.parent_company = t.parent_company
      AND u.role IN ('Admin', 'Account Manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      JOIN trial_organizations t ON t.org_id = trial_support_queries.org_id
      WHERE u.id = auth.uid()
      AND u.parent_company = t.parent_company
      AND u.role IN ('Admin', 'Account Manager')
    )
  );

-- ========================================
-- SALES_POCS: Proper RLS Policies
-- ========================================

-- Drop old "Allow all" policy
DROP POLICY IF EXISTS "Allow all for now on sales_pocs" ON sales_pocs;

-- Everyone can read sales POCs (needed for dropdowns)
CREATE POLICY "Anyone authenticated can view sales POCs"
  ON sales_pocs FOR SELECT
  TO authenticated
  USING (true);

-- Only Admins and Super Admins can modify sales POCs
CREATE POLICY "Admins can manage sales POCs"
  ON sales_pocs FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (users.role = 'Admin' OR users.is_super_admin = true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (users.role = 'Admin' OR users.is_super_admin = true)
    )
  );

-- Summary:
-- 1. Super admins: Full access to everything across all companies
-- 2. Admins: Full access to their company's data only
-- 3. Account Managers: Can view/edit/create their company's trials and related data (cannot delete)
-- 4. All authenticated users: Can read sales POCs (needed for UI dropdowns)
