-- Migration: Create announcements table
-- Purpose: Enable announcement management functionality
-- Date: 2025-11-25

BEGIN;

-- Create announcements table
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('feature', 'update', 'maintenance', 'alert')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_announcements_status ON announcements(status);
CREATE INDEX IF NOT EXISTS idx_announcements_type ON announcements(type);
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON announcements(created_at DESC);

-- Enable RLS
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read announcements
CREATE POLICY "announcements_read_authenticated" ON announcements
  FOR SELECT TO authenticated
  USING (true);

-- Allow admins to insert announcements
CREATE POLICY "announcements_insert_admin" ON announcements
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (users.role = 'Admin' OR users.is_super_admin = true)
    )
  );

-- Allow admins to update announcements
CREATE POLICY "announcements_update_admin" ON announcements
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (users.role = 'Admin' OR users.is_super_admin = true)
    )
  );

-- Allow admins to delete announcements
CREATE POLICY "announcements_delete_admin" ON announcements
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (users.role = 'Admin' OR users.is_super_admin = true)
    )
  );

-- Add comment
COMMENT ON TABLE announcements IS 'System announcements for features, updates, maintenance, and alerts';

COMMIT;
