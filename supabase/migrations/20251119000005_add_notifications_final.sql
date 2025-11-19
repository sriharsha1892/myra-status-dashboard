-- Create notifications table for in-app notifications (FINAL FIXED VERSION)
-- This supports error assignment notifications for super admins

-- 1. Drop existing objects if they exist (clean slate)
DROP VIEW IF EXISTS unread_notification_counts CASCADE;
DROP TRIGGER IF EXISTS trigger_error_assignment_notification ON error_reports;
DROP FUNCTION IF EXISTS create_error_assignment_notification() CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;

-- 2. Create notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'error_assigned', 'error_resolved', etc.
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT FALSE,

  -- Related entities (optional, depends on notification type)
  error_id UUID REFERENCES error_reports(id) ON DELETE CASCADE,
  trial_org_id UUID, -- No FK constraint since trials table doesn't exist

  -- Metadata
  metadata JSONB, -- Additional flexible data

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ,

  -- Soft delete
  deleted_at TIMESTAMPTZ
);

-- 3. Create indexes for efficient queries
CREATE INDEX idx_notifications_user_id
ON notifications(user_id)
WHERE deleted_at IS NULL;

CREATE INDEX idx_notifications_unread
ON notifications(user_id, read)
WHERE deleted_at IS NULL AND read = FALSE;

CREATE INDEX idx_notifications_created_at
ON notifications(created_at DESC)
WHERE deleted_at IS NULL;

CREATE INDEX idx_notifications_error_id
ON notifications(error_id)
WHERE deleted_at IS NULL AND error_id IS NOT NULL;

-- 4. Create function to auto-create notification on error assignment
CREATE FUNCTION create_error_assignment_notification()
RETURNS TRIGGER AS $$
DECLARE
  assigned_user RECORD;
  assigner_user RECORD;
  error_message TEXT;
BEGIN
  -- Only create notification if assigned_to changed and is not null
  IF NEW.assigned_to IS NOT NULL AND (OLD.assigned_to IS NULL OR OLD.assigned_to != NEW.assigned_to) THEN

    -- Get assigned user details
    SELECT email, full_name INTO assigned_user
    FROM users
    WHERE id = NEW.assigned_to;

    -- Get assigner details (if available)
    IF NEW.assigned_by IS NOT NULL THEN
      SELECT email, full_name INTO assigner_user
      FROM users
      WHERE id = NEW.assigned_by;
    END IF;

    -- Truncate error message for notification
    error_message := LEFT(NEW.error_message, 100);
    IF LENGTH(NEW.error_message) > 100 THEN
      error_message := error_message || '...';
    END IF;

    -- Create notification for assigned user
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      error_id,
      metadata
    ) VALUES (
      NEW.assigned_to,
      'error_assigned',
      'Error Assigned to You',
      CASE
        WHEN assigner_user.full_name IS NOT NULL THEN
          assigner_user.full_name || ' assigned you an error: ' || error_message
        ELSE
          'You have been assigned an error: ' || error_message
      END,
      NEW.id,
      jsonb_build_object(
        'error_type', NEW.error_type,
        'error_context', NEW.context,
        'assigned_by', NEW.assigned_by,
        'assigned_at', NEW.assigned_at
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Create trigger for error assignment notifications
CREATE TRIGGER trigger_error_assignment_notification
  AFTER INSERT OR UPDATE OF assigned_to
  ON error_reports
  FOR EACH ROW
  EXECUTE FUNCTION create_error_assignment_notification();

-- 6. Add assigned_by column to error_reports (if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'error_reports' AND column_name = 'assigned_by'
  ) THEN
    ALTER TABLE error_reports
    ADD COLUMN assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 7. Create RLS policies for notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

-- Users can update (mark as read) their own notifications
CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

-- System can insert notifications (via trigger)
CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- 8. Create helper view for unread notification count
CREATE VIEW unread_notification_counts AS
SELECT
  user_id,
  COUNT(*) as unread_count
FROM notifications
WHERE deleted_at IS NULL AND read = FALSE
GROUP BY user_id;

-- 9. Grant permissions
GRANT SELECT ON notifications TO authenticated;
GRANT UPDATE ON notifications TO authenticated;
GRANT SELECT ON unread_notification_counts TO authenticated;

-- 10. Add comments for documentation
COMMENT ON TABLE notifications IS 'In-app notifications for users';
COMMENT ON COLUMN notifications.type IS 'Notification type: error_assigned, error_resolved, etc.';
COMMENT ON COLUMN notifications.metadata IS 'Flexible JSON field for additional notification data';
COMMENT ON VIEW unread_notification_counts IS 'Count of unread notifications per user';
