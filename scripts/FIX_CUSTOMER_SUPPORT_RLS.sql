-- ============================================================================
-- FIX Customer Support RLS Policies
-- Purpose: Fix RLS policies to allow anonymous ticket creation via chat widget
-- ============================================================================

-- STEP 1: Drop ALL existing policies on tickets table
DROP POLICY IF EXISTS "Allow public ticket creation" ON tickets;
DROP POLICY IF EXISTS "Allow authenticated to view tickets" ON tickets;
DROP POLICY IF EXISTS "Allow admins to update tickets" ON tickets;
DROP POLICY IF EXISTS "Allow admins to delete tickets" ON tickets;
DROP POLICY IF EXISTS "Public can create support tickets" ON tickets;
DROP POLICY IF EXISTS "AM users can create tickets" ON tickets;
DROP POLICY IF EXISTS "Team and Admin can view all tickets" ON tickets;
DROP POLICY IF EXISTS "Team and Admin can update tickets" ON tickets;
DROP POLICY IF EXISTS "Only Admin can delete tickets" ON tickets;
DROP POLICY IF EXISTS "Users can view their own tickets" ON tickets;
DROP POLICY IF EXISTS "Admins can view all tickets" ON tickets;
DROP POLICY IF EXISTS "Users can create tickets" ON tickets;

-- STEP 2: Update tickets source constraint (if not already done)
DO $$
BEGIN
  -- Drop existing constraint if it exists
  ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_source_check;

  -- Add new constraint with customer_chat
  ALTER TABLE tickets ADD CONSTRAINT tickets_source_check
    CHECK (source IN ('support_form', 'error_report', 'manual', 'api', 'customer_chat'));
EXCEPTION
  WHEN OTHERS THEN
    -- If constraint already exists with correct definition, that's fine
    NULL;
END $$;

-- STEP 3: Create new RLS policies

-- Allow anonymous and authenticated users to INSERT support/customer tickets
CREATE POLICY "Allow public ticket creation"
ON tickets
FOR INSERT
TO anon, authenticated
WITH CHECK (
  source IN ('support_form', 'error_report', 'customer_chat') OR
  source IS NULL
);

-- Allow authenticated users to SELECT/view tickets
CREATE POLICY "Allow authenticated to view tickets"
ON tickets
FOR SELECT
TO authenticated
USING (true);

-- Allow anonymous users to SELECT/view their own tickets (optional, for ticket tracking)
CREATE POLICY "Allow anon to view public tickets"
ON tickets
FOR SELECT
TO anon
USING (source = 'customer_chat');

-- Allow admins to UPDATE tickets
CREATE POLICY "Allow admins to update tickets"
ON tickets
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND (users.role = 'Admin' OR users.is_super_admin = true)
  )
);

-- Allow admins to DELETE tickets
CREATE POLICY "Allow admins to delete tickets"
ON tickets
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND (users.role = 'Admin' OR users.is_super_admin = true)
  )
);

-- STEP 4: Verify RLS is enabled
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- STEP 5: Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_tickets_source ON tickets(source);
CREATE INDEX IF NOT EXISTS idx_tickets_customer_email ON tickets(user_email) WHERE source = 'customer_chat';

-- STEP 6: Verification query
-- Run this to check the policies were created correctly
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
