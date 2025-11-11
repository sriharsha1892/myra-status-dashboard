-- Announcements RLS Security Tightening Migration
-- Moves admin authorization from app-level to database-level

-- ============================================================================
-- 1. Enable RLS on announcements table
-- ============================================================================

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. Drop existing policies (if any)
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can view active announcements" ON announcements;
DROP POLICY IF EXISTS "Admins can view all announcements" ON announcements;
DROP POLICY IF EXISTS "Admins can create announcements" ON announcements;
DROP POLICY IF EXISTS "Admins can update announcements" ON announcements;
DROP POLICY IF EXISTS "Admins can delete announcements" ON announcements;

-- ============================================================================
-- 3. Create new RLS policies
-- ============================================================================

-- All authenticated users can view active, non-expired announcements
CREATE POLICY "Authenticated users can view active announcements"
  ON announcements FOR SELECT
  TO authenticated
  USING (
    status = 'active' AND
    (expires_at IS NULL OR expires_at > NOW())
  );

-- Admins and Super Admins can view all announcements (including drafts and archived)
CREATE POLICY "Admins can view all announcements"
  ON announcements FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('Admin', 'Super Admin')
    )
  );

-- Only Admins and Super Admins can create announcements
CREATE POLICY "Admins can create announcements"
  ON announcements FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('Admin', 'Super Admin')
    )
  );

-- Only Admins and Super Admins can update announcements
CREATE POLICY "Admins can update announcements"
  ON announcements FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('Admin', 'Super Admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('Admin', 'Super Admin')
    )
  );

-- Only Admins and Super Admins can delete announcements
CREATE POLICY "Admins can delete announcements"
  ON announcements FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('Admin', 'Super Admin')
    )
  );

-- ============================================================================
-- 4. Add helpful indexes for performance
-- ============================================================================

-- Index for status and expiry lookups
CREATE INDEX IF NOT EXISTS idx_announcements_status_expires
  ON announcements(status, expires_at)
  WHERE status = 'active';

-- Index for created_at ordering
CREATE INDEX IF NOT EXISTS idx_announcements_created_at
  ON announcements(created_at DESC);

-- Index for priority ordering
CREATE INDEX IF NOT EXISTS idx_announcements_priority
  ON announcements(priority);

-- ============================================================================
-- Migration Complete
-- Announcements now have database-level security with proper RLS policies
-- ============================================================================
