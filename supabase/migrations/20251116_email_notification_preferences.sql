/**
 * Email Notification Preferences
 *
 * Extends the notification system to support email delivery frequency configuration.
 * Allows users to control when and how they receive email notifications.
 */

-- Add email delivery frequency column to user_notification_preferences
-- This allows per-notification-type email frequency control
ALTER TABLE user_notification_preferences
ADD COLUMN IF NOT EXISTS email_delivery_frequency TEXT DEFAULT 'instant'
  CHECK (email_delivery_frequency IN ('instant', 'daily_digest', 'weekly_digest', 'never'));

-- Add comment for documentation
COMMENT ON COLUMN user_notification_preferences.email_delivery_frequency IS
  'Controls email delivery timing: instant (immediate), daily_digest (once per day), weekly_digest (once per week), never (in-app only)';

-- Create index for efficient digest queries
CREATE INDEX IF NOT EXISTS idx_user_notification_prefs_email_frequency
  ON user_notification_preferences(email_delivery_frequency)
  WHERE email_delivery_frequency IN ('daily_digest', 'weekly_digest');

-- Create a table to track last digest send time per user
CREATE TABLE IF NOT EXISTS user_digest_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  digest_type TEXT NOT NULL CHECK (digest_type IN ('daily', 'weekly')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notification_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_user_digest_history_user_email
  ON user_digest_history(user_email);

CREATE INDEX IF NOT EXISTS idx_user_digest_history_digest_type
  ON user_digest_history(digest_type, sent_at DESC);

-- Add RLS policies for user_digest_history
ALTER TABLE user_digest_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own digest history
CREATE POLICY "Users can view their own digest history"
  ON user_digest_history
  FOR SELECT
  USING (user_email = auth.jwt() ->> 'email');

-- System can insert digest history (for cron jobs)
CREATE POLICY "Service role can manage digest history"
  ON user_digest_history
  FOR ALL
  USING (auth.role() = 'service_role');

-- Update default preferences for existing users to use instant delivery
-- This ensures backward compatibility - existing behavior is preserved
UPDATE user_notification_preferences
SET email_delivery_frequency = 'instant'
WHERE email_delivery_frequency IS NULL;
