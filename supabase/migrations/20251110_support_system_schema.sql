-- Support System Database Migration
-- Created: 2025-11-10
-- Purpose: Update tickets table and configure storage for support features

-- 1. Add missing columns to tickets table
ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS ticket_id UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT CHECK (source IN ('support_form', 'error_report', 'manual', 'api')),
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Migrate existing data
-- Copy 'id' to 'ticket_id' for existing records if ticket_id is null
UPDATE tickets
SET ticket_id = id
WHERE ticket_id IS NULL;

-- Generate title from description for existing tickets that don't have one
UPDATE tickets
SET title = SUBSTRING(description FROM 1 FOR 100)
WHERE title IS NULL OR title = '';

-- Set default source for existing tickets
UPDATE tickets
SET source = 'manual'
WHERE source IS NULL;

-- 3. Update status values to match new format
-- Map old status values to new ones
UPDATE tickets
SET status = CASE
  WHEN status = 'New' THEN 'open'
  WHEN status = 'In Progress' THEN 'in_progress'
  WHEN status = 'Waiting on User' THEN 'open'
  WHEN status = 'Resolved' THEN 'resolved'
  WHEN status = 'Closed' THEN 'closed'
  ELSE 'open'
END
WHERE status IN ('New', 'In Progress', 'Waiting on User', 'Resolved', 'Closed');

-- 4. Update priority values to lowercase
UPDATE tickets
SET priority = CASE
  WHEN priority = 'Low' THEN 'low'
  WHEN priority = 'Medium' THEN 'medium'
  WHEN priority = 'High' THEN 'high'
  WHEN priority = 'Critical' THEN 'urgent'
  ELSE 'medium'
END
WHERE priority IN ('Low', 'Medium', 'High', 'Critical');

-- 5. Update category values to match support system
UPDATE tickets
SET category = CASE
  WHEN category IN ('Security', 'Tool Functioning', 'Performance') THEN 'technical'
  WHEN category = 'Feature Request' THEN 'feature'
  WHEN category IN ('Usage', 'Requests') THEN 'general'
  WHEN category = 'Data Quality' THEN 'bug'
  ELSE 'general'
END
WHERE category NOT IN ('general', 'bug', 'feature', 'account', 'technical');

-- 6. Update CHECK constraints to support new values
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_status_check;
ALTER TABLE tickets ADD CONSTRAINT tickets_status_check
  CHECK (status IN ('open', 'in_progress', 'resolved', 'closed'));

ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_priority_check;
ALTER TABLE tickets ADD CONSTRAINT tickets_priority_check
  CHECK (priority IN ('low', 'medium', 'high', 'urgent'));

ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_category_check;
ALTER TABLE tickets ADD CONSTRAINT tickets_category_check
  CHECK (category IN ('general', 'bug', 'feature', 'account', 'technical'));

-- 7. Add index on ticket_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_tickets_ticket_id ON tickets(ticket_id);
CREATE INDEX IF NOT EXISTS idx_tickets_source ON tickets(source);
CREATE INDEX IF NOT EXISTS idx_tickets_created_by ON tickets(created_by);

-- 8. Update notifications table to support ticket notifications
-- Add 'support_ticket' and 'error_report' to notification_type if not already there
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_notification_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_notification_type_check
  CHECK (notification_type IN (
    'mention',
    'assigned',
    'comment',
    'status_change',
    'issue_linked',
    'watching_update',
    'support_ticket',
    'error_report'
  ));

-- 9. Update RLS policies for tickets to allow unauthenticated users to create support tickets
-- This is needed for the public support form
DROP POLICY IF EXISTS "Public can create support tickets" ON tickets;
CREATE POLICY "Public can create support tickets"
  ON tickets FOR INSERT
  TO anon, authenticated
  WITH CHECK (source IN ('support_form', 'error_report'));

-- 10. Update RLS for notifications to allow system to insert
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Comments
COMMENT ON COLUMN tickets.ticket_id IS 'Public-facing ticket ID used in API responses';
COMMENT ON COLUMN tickets.title IS 'Short title/subject of the ticket';
COMMENT ON COLUMN tickets.source IS 'Origin of the ticket: support_form, error_report, manual, or api';
COMMENT ON COLUMN tickets.created_by IS 'User who created the ticket (nullable for anonymous submissions)';
