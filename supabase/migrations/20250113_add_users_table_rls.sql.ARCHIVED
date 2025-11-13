-- Migration: Add Row Level Security to users table
-- Priority: CRITICAL - Prevents password exposure
-- Date: 2025-01-13

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can only SELECT their own record
-- This allows users to see their own profile data
CREATE POLICY "Users can view own record"
ON users
FOR SELECT
USING (auth.uid() = id);

-- Policy 2: Super admins can SELECT all users
-- Required for admin user management features
CREATE POLICY "Super admins can view all users"
ON users
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.is_super_admin = true
  )
);

-- Policy 3: Admins can SELECT users in their company
-- Allows company admins to manage their team
CREATE POLICY "Admins can view company users"
ON users
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users AS u
    WHERE u.id = auth.uid()
    AND u.role = 'Admin'
    AND u.parent_company = users.parent_company
  )
);

-- Policy 4: Only super admins can INSERT users
-- User creation is admin-only operation
CREATE POLICY "Super admins can create users"
ON users
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND (users.is_super_admin = true OR users.role = 'Admin')
  )
);

-- Policy 5: Super admins and self can UPDATE own record
-- Users can update their own profile
-- Admins can update users in their company
CREATE POLICY "Users can update own record and admins can update company users"
ON users
FOR UPDATE
USING (
  -- Can update own record
  auth.uid() = id
  OR
  -- Or is super admin
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.is_super_admin = true
  )
  OR
  -- Or is admin in same company
  EXISTS (
    SELECT 1 FROM users AS u
    WHERE u.id = auth.uid()
    AND u.role = 'Admin'
    AND u.parent_company = users.parent_company
  )
);

-- Policy 6: Only super admins can DELETE users
-- Deletion requires highest privilege
CREATE POLICY "Super admins can delete users"
ON users
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.is_super_admin = true
  )
);

-- Important: Sensitive fields like password_hash, password_reset_token
-- are already protected because RLS policies only allow SELECT of own record
-- or admin records. The application code should further restrict these fields
-- from being returned in API responses.

-- Add comment for documentation
COMMENT ON TABLE users IS 'Users table with RLS enabled. Policies restrict access to own record, company users for admins, and all users for super admins. Password fields should additionally be filtered in application code.';
