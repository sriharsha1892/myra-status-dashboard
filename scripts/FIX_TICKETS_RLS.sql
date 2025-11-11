-- Fix Tickets Table RLS for Support System
-- Run this in Supabase Dashboard > SQL Editor

-- Drop existing policies that might be blocking
DROP POLICY IF EXISTS "Public can create support tickets" ON tickets;
DROP POLICY IF EXISTS "AM users can create tickets" ON tickets;
DROP POLICY IF EXISTS "Team and Admin can view all tickets" ON tickets;
DROP POLICY IF EXISTS "Team and Admin can update tickets" ON tickets;
DROP POLICY IF EXISTS "Only Admin can delete tickets" ON tickets;

-- Allow anonymous and authenticated users to create support tickets
CREATE POLICY "Allow support ticket creation"
ON tickets
FOR INSERT
TO anon, authenticated
WITH CHECK (
  source IN ('support_form', 'error_report') OR
  source IS NULL
);

-- Allow all authenticated users to view tickets (for now - can be restricted later)
CREATE POLICY "Allow authenticated to view tickets"
ON tickets
FOR SELECT
TO authenticated
USING (true);

-- Allow admins to update tickets
CREATE POLICY "Allow admins to update tickets"
ON tickets
FOR UPDATE
TO authenticated
USING (
  -- Check if user is admin via users table
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Allow admins to delete tickets
CREATE POLICY "Allow admins to delete tickets"
ON tickets
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Verify policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'tickets'
AND schemaname = 'public'
ORDER BY policyname;
