-- Trial Expiring Notifications System
-- Created: 2025-01-12
-- Purpose: Add support for trial expiring notifications (2 days before trial end)

BEGIN;

-- 1. Extend notifications.notification_type enum to include 'trial_expiring'
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_notification_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_notification_type_check
  CHECK (notification_type IN (
    'mention',
    'assigned',
    'comment',
    'status_change',
    'issue_linked',
    'watching_update',
    'trial_expiring',
    'support_ticket',
    'error_report',
    'new_note',
    'feature_proposal',
    'issue'
  ));

-- 2. Add tracking column to trial_organizations to prevent duplicate notifications
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='trial_organizations' AND column_name='expiring_notified_at') THEN
        ALTER TABLE trial_organizations ADD COLUMN expiring_notified_at TIMESTAMPTZ;
        RAISE NOTICE 'Added expiring_notified_at column to trial_organizations';
    END IF;
END $$;

-- 3. Add index for efficient trial expiring queries
CREATE INDEX IF NOT EXISTS idx_trial_expiring_check
  ON trial_organizations(trial_end_date, expiring_notified_at)
  WHERE expiring_notified_at IS NULL;

COMMIT;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Trial expiring notifications system installed successfully';
    RAISE NOTICE '- Added trial_expiring to notification types';
    RAISE NOTICE '- Added expiring_notified_at tracking column';
    RAISE NOTICE '- Created index for efficient cron queries';
END $$;
