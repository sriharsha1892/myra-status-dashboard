-- Safe version of migration 004 - can be run multiple times without errors

-- Drop existing policies first (safe if they don't exist)
DROP POLICY IF EXISTS "Anyone can view templates" ON ticket_templates;
DROP POLICY IF EXISTS "Admins can manage templates" ON ticket_templates;
DROP POLICY IF EXISTS "Users can view watchers" ON ticket_watchers;
DROP POLICY IF EXISTS "Users can manage their own watches" ON ticket_watchers;
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Anyone can view profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Anyone can view activities" ON ticket_activities;
DROP POLICY IF EXISTS "Anyone can view calendar events" ON calendar_events;
DROP POLICY IF EXISTS "Users can manage calendar events" ON calendar_events;

-- Create tables (IF NOT EXISTS prevents errors)
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

-- Create indexes (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_ticket_templates_category ON ticket_templates(category);
CREATE INDEX IF NOT EXISTS idx_ticket_templates_created_by ON ticket_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_ticket_links_ticket_id ON ticket_links(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_links_related_ticket_id ON ticket_links(related_ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_watchers_user_id ON ticket_watchers(user_id);
CREATE INDEX IF NOT EXISTS idx_comment_mentions_user_id ON comment_mentions(user_id);
CREATE INDEX IF NOT EXISTS idx_ticket_activities_ticket_id ON ticket_activities(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_activities_created_at ON ticket_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_calendar_events_ticket_id ON calendar_events(ticket_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_teams_integration_enabled ON teams_integration(enabled);
CREATE INDEX IF NOT EXISTS idx_teams_messages_ticket_id ON teams_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_teams_messages_teams_message_id ON teams_messages(teams_message_id);
CREATE INDEX IF NOT EXISTS idx_email_threads_ticket_id ON email_threads(ticket_id);
CREATE INDEX IF NOT EXISTS idx_email_threads_message_id ON email_threads(message_id);
CREATE INDEX IF NOT EXISTS idx_user_invites_token ON user_invites(token);
CREATE INDEX IF NOT EXISTS idx_user_invites_email ON user_invites(email);
CREATE INDEX IF NOT EXISTS idx_user_invites_accepted ON user_invites(accepted);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_is_internal ON ticket_comments(is_internal);

-- Add columns to existing tables (safe if they exist)
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES ticket_templates;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE ticket_comments ADD COLUMN IF NOT EXISTS is_internal BOOLEAN DEFAULT FALSE;

-- Create or replace functions
CREATE OR REPLACE FUNCTION log_ticket_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO ticket_activities (ticket_id, user_id, activity_type, new_value, metadata)
    VALUES (NEW.id, NEW.assigned_to, 'created', NEW.status, jsonb_build_object('organization', NEW.organization));
    
    INSERT INTO ticket_watchers (ticket_id, user_id)
    VALUES (NEW.id, NEW.assigned_to)
    ON CONFLICT DO NOTHING;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status != OLD.status THEN
      INSERT INTO ticket_activities (ticket_id, user_id, activity_type, old_value, new_value)
      VALUES (NEW.id, NEW.assigned_to, 'status_changed', OLD.status, NEW.status);
    END IF;
    
    IF NEW.assigned_to != OLD.assigned_to OR (NEW.assigned_to IS NOT NULL AND OLD.assigned_to IS NULL) THEN
      INSERT INTO ticket_activities (ticket_id, user_id, activity_type, new_value)
      VALUES (NEW.id, NEW.assigned_to, 'assigned', NEW.assigned_to::TEXT);
      
      IF NEW.assigned_to IS NOT NULL THEN
        INSERT INTO ticket_watchers (ticket_id, user_id)
        VALUES (NEW.id, NEW.assigned_to)
        ON CONFLICT DO NOTHING;
      END IF;
    END IF;
  END IF RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ticket_activity_trigger ON tickets;
CREATE TRIGGER ticket_activity_trigger
  AFTER INSERT OR UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION log_ticket_activity();

-- Enable RLS
ALTER TABLE ticket_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_watchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view templates" ON ticket_templates FOR SELECT USING (true);
CREATE POLICY "Admins can manage templates" ON ticket_templates FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('Admin', 'Team'))
);

CREATE POLICY "Users can view watchers" ON ticket_watchers FOR SELECT USING (true);
CREATE POLICY "Users can manage their own watches" ON ticket_watchers FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can view their own notifications" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update their own notifications" ON notifications FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Anyone can view profiles" ON user_profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON user_profiles FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Anyone can view activities" ON ticket_activities FOR SELECT USING (true);

CREATE POLICY "Anyone can view calendar events" ON calendar_events FOR SELECT USING (true);
CREATE POLICY "Users can manage calendar events" ON calendar_events FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('Admin', 'Team'))
);
