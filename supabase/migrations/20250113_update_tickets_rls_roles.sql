-- Migration: Update tickets RLS policies to use new normalized roles
-- Priority: HIGH - Aligns with role normalization (Admin, Account Manager)
-- Date: 2025-01-13

-- Drop old policies that reference deprecated roles (AM, Team)
DROP POLICY IF EXISTS "AM, Team, Admin can create tickets" ON tickets;
DROP POLICY IF EXISTS "Team and Admin can view all tickets" ON tickets;
DROP POLICY IF EXISTS "Team and Admin can update tickets" ON tickets;
DROP POLICY IF EXISTS "Team and Admin can delete tickets" ON tickets;

-- Create policy for Admins and Account Managers to create tickets
CREATE POLICY "Admins and Account Managers can create tickets"
  ON tickets FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('Account Manager', 'Admin')
  );

-- Admins can view all tickets
-- Account Managers can view all tickets (read-only) per user requirements
CREATE POLICY "Admins and Account Managers can view all tickets"
  ON tickets FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('Account Manager', 'Admin')
  );

-- Only Admins can update tickets (Account Managers are read-only)
CREATE POLICY "Only Admins can update tickets"
  ON tickets FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'Admin'
  );

-- Only Admins can delete tickets
CREATE POLICY "Only Admins can delete tickets"
  ON tickets FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'Admin'
  );

-- Note: Account Managers have read-only access to tickets
-- They can view all tickets and create new ones, but cannot update or delete existing tickets
