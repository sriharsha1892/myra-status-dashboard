-- Migration: Fix tickets RLS to allow super admins to update tickets
-- Priority: HIGH - Critical bug fix for ticket status updates
-- Date: 2025-11-18
-- Issue: Super admins cannot update tickets because RLS policy only checks role='Admin'

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Only Admins can update tickets" ON tickets;

-- Create new policy that checks BOTH role='Admin' OR is_super_admin=true
CREATE POLICY "Admins and Super Admins can update tickets"
  ON tickets FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'Admin'
    OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_super_admin = true
    )
  );

-- Also update the delete policy for consistency
DROP POLICY IF EXISTS "Only Admins can delete tickets" ON tickets;

CREATE POLICY "Admins and Super Admins can delete tickets"
  ON tickets FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'Admin'
    OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_super_admin = true
    )
  );

-- Comments
COMMENT ON POLICY "Admins and Super Admins can update tickets" ON tickets IS
  'Allows users with Admin role OR is_super_admin flag to update tickets';

COMMENT ON POLICY "Admins and Super Admins can delete tickets" ON tickets IS
  'Allows users with Admin role OR is_super_admin flag to delete tickets';
