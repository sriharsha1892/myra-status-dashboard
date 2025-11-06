-- Migration to add RLS policies for internal vs external comments
-- Feature #7: Internal vs External Comments

-- Drop existing policy that allows Team and Admin to view all comments
DROP POLICY IF EXISTS "Team and Admin can view comments" ON ticket_comments;

-- Create new policy for Team and Admin to view all comments (including internal)
CREATE POLICY "Team and Admin can view all comments"
  ON ticket_comments FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('Team', 'Admin')
  );

-- Create new policy for AM users to view only external comments (not internal)
CREATE POLICY "AM users can view external comments only"
  ON ticket_comments FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'AM'
    AND is_internal = false
  );

-- Update the insert policy to allow Team and Admin to create both internal and external comments
-- AM users should not be able to create comments directly (only through ticket creation)
DROP POLICY IF EXISTS "Team and Admin can create comments" ON ticket_comments;

CREATE POLICY "Team and Admin can create comments"
  ON ticket_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('Team', 'Admin')
  );

-- Add policy to allow AM users to create external comments only
CREATE POLICY "AM users can create external comments"
  ON ticket_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'AM'
    AND is_internal = false
  );

COMMENT ON COLUMN ticket_comments.is_internal IS 'Flag to mark internal notes that are only visible to Team and Admin users, not to AM users';
