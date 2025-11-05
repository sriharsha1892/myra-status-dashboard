-- Create user_notification_preferences table
-- This table stores individual user preferences for which types of notifications they want to receive

CREATE TABLE IF NOT EXISTS user_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Unique constraint: one preference per user per notification type
  CONSTRAINT unique_user_notification_pref UNIQUE (user_email, notification_type)
);

-- Create index for faster lookups by user email
CREATE INDEX IF NOT EXISTS idx_user_notification_prefs_email
ON user_notification_preferences(user_email);

-- Create index for faster lookups by notification type
CREATE INDEX IF NOT EXISTS idx_user_notification_prefs_type
ON user_notification_preferences(notification_type);

-- Add RLS (Row Level Security) policies
ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own preferences
CREATE POLICY "Users can view own notification preferences"
ON user_notification_preferences
FOR SELECT
USING (user_email = auth.jwt() ->> 'email');

-- Policy: Users can insert their own preferences
CREATE POLICY "Users can insert own notification preferences"
ON user_notification_preferences
FOR INSERT
WITH CHECK (user_email = auth.jwt() ->> 'email');

-- Policy: Users can update their own preferences
CREATE POLICY "Users can update own notification preferences"
ON user_notification_preferences
FOR UPDATE
USING (user_email = auth.jwt() ->> 'email');

-- Policy: Users can delete their own preferences
CREATE POLICY "Users can delete own notification preferences"
ON user_notification_preferences
FOR DELETE
USING (user_email = auth.jwt() ->> 'email');

-- Add comment to table
COMMENT ON TABLE user_notification_preferences IS
'Stores user preferences for which types of notifications they want to receive';

-- Add comments to columns
COMMENT ON COLUMN user_notification_preferences.user_email IS
'Email address of the user';

COMMENT ON COLUMN user_notification_preferences.notification_type IS
'Type of notification (mention, issue, new_note, ticket_assigned, ticket_status_change, roadmap_update, feature_request)';

COMMENT ON COLUMN user_notification_preferences.enabled IS
'Whether this notification type is enabled for the user';
