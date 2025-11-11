-- Customer Support System Migration
-- Created: 2025-11-10
-- Purpose: Add customer chat support and fix RLS policies

-- ============================================================================
-- PART 1: Fix RLS Policies for Ticket Creation
-- ============================================================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Public can create support tickets" ON tickets;
DROP POLICY IF EXISTS "AM users can create tickets" ON tickets;
DROP POLICY IF EXISTS "Team and Admin can view all tickets" ON tickets;
DROP POLICY IF EXISTS "Team and Admin can update tickets" ON tickets;
DROP POLICY IF EXISTS "Only Admin can delete tickets" ON tickets;

-- ============================================================================
-- PART 2: Update Tickets Source Constraint
-- ============================================================================

-- Drop existing source constraint
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_source_check;

-- Add updated constraint including customer_chat
ALTER TABLE tickets ADD CONSTRAINT tickets_source_check
  CHECK (source IN ('support_form', 'error_report', 'manual', 'api', 'customer_chat'));

-- ============================================================================
-- PART 3: Create New RLS Policies
-- ============================================================================

-- Allow anonymous and authenticated users to create support/customer tickets
CREATE POLICY "Allow public ticket creation"
ON tickets
FOR INSERT
TO anon, authenticated
WITH CHECK (
  source IN ('support_form', 'error_report', 'customer_chat') OR
  source IS NULL
);

-- Allow authenticated users to view tickets
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

-- ============================================================================
-- PART 4: Create Customer Support Tracking
-- ============================================================================

-- Add index for faster customer ticket queries
CREATE INDEX IF NOT EXISTS idx_tickets_source ON tickets(source);
CREATE INDEX IF NOT EXISTS idx_tickets_customer_email ON tickets(user_email) WHERE source = 'customer_chat';

-- ============================================================================
-- PART 5: Comments for Documentation
-- ============================================================================

COMMENT ON COLUMN tickets.source IS 'Ticket origin: support_form (internal staff), error_report (automated), customer_chat (customer widget), manual (admin created), api (external)';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify constraints
SELECT
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'tickets'::regclass
AND conname LIKE '%source%';

-- Verify policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'tickets'
AND schemaname = 'public'
ORDER BY policyname;

-- Verify indexes
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'tickets'
AND schemaname = 'public'
AND indexname LIKE '%source%'
ORDER BY indexname;
