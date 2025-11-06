-- STEP 1: Create tables only (no policies, no triggers)
-- Run this first, then run step 2

-- Create all tables
CREATE TABLE IF NOT EXISTS ticket_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description_template TEXT,
  priority TEXT,
  custom_fields JSONB,
  created_by UUID REFERENCES auth.users,
  usage_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ticket_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES tickets ON DELETE CASCADE,
  related_ticket_id UUID REFERENCES tickets ON DELETE CASCADE,
  link_type TEXT NOT NULL,
  created_by UUID REFERENCES auth.users,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT different_tickets CHECK (ticket_id != related_ticket_id)
);

CREATE TABLE IF NOT EXISTS ticket_watchers (
  ticket_id UUID REFERENCES tickets ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (ticket_id, user_id)
);

CREATE TABLE IF NOT EXISTS comment_mentions (
  comment_id UUID REFERENCES ticket_comments ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (comment_id, user_id)
);

CREATE TABLE IF NOT EXISTS ticket_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES tickets ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users,
  activity_type TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES tickets ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  google_event_id TEXT,
  attendees JSONB,
  created_by UUID REFERENCES auth.users,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS teams_integration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id TEXT NOT NULL,
  team_name TEXT,
  channel_id TEXT NOT NULL,
  channel_name TEXT,
  webhook_url TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  notification_rules JSONB,
  enabled BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES auth.users,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS teams_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES tickets ON DELETE CASCADE,
  teams_message_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  conversation_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES tickets ON DELETE CASCADE,
  message_id TEXT UNIQUE NOT NULL,
  in_reply_to TEXT,
  from_address TEXT NOT NULL,
  to_address TEXT NOT NULL,
  subject TEXT,
  body_text TEXT,
  body_html TEXT,
  attachments JSONB,
  received_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  invited_by UUID REFERENCES auth.users,
  token TEXT UNIQUE NOT NULL,
  accepted BOOLEAN DEFAULT FALSE,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'AM',
  last_active TIMESTAMPTZ DEFAULT NOW(),
  notification_preferences JSONB DEFAULT '{"email": true, "mentions": true, "watchers": true}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  ticket_id UUID REFERENCES tickets ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add columns to existing tables
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES ticket_templates;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE ticket_comments ADD COLUMN IF NOT EXISTS is_internal BOOLEAN DEFAULT FALSE;

-- Verify tables were created
SELECT 'Tables created successfully!' as status;
