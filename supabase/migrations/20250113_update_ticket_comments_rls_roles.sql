-- Migration: Update ticket_comments RLS policies to use new normalized roles
-- Priority: HIGH - Aligns with role normalization (Admin, Account Manager)
-- Date: 2025-01-13

-- Drop old policies that reference deprecated roles (Team, AM)
DROP POLICY IF EXISTS "Team and Admin can view all comments" ON ticket_comments;
DROP POLICY IF EXISTS "AM users can view external comments only" ON ticket_comments;
DROP POLICY IF EXISTS "Team and Admin can create comments" ON ticket_comments;
DROP POLICY IF EXISTS "AM users can create external comments" ON ticket_comments;

-- Create new policy for Admins to view all comments (including internal)
CREATE POLICY "Admins can view all comments"
  ON ticket_comments FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'Admin'
  );

-- Create new policy for Account Managers to view only external comments (not internal)
-- Account Managers have read-only access to tickets
CREATE POLICY "Account Managers can view external comments only"
  ON ticket_comments FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'Account Manager'
    AND is_internal = false
  );

-- Only Admins can create comments (Account Managers are read-only)
CREATE POLICY "Admins can create comments"
  ON ticket_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'Admin'
  );

-- Update column comment to reflect new role structure
COMMENT ON COLUMN ticket_comments.is_internal IS 'Flag to mark internal notes that are only visible to Admin users, not to Account Manager users';

-- Note: Account Managers have read-only access to tickets
-- They can view external comments but cannot create or modify any comments
