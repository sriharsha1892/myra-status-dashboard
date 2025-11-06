-- STEP 2: Add indexes, policies, and triggers
-- Run this AFTER step 1 completes successfully

-- Create indexes
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

-- Create function for activity logging
CREATE OR REPLACE FUNCTION log_ticket_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO ticket_activities (ticket_id, user_id, activity_type, new_value, metadata)
    VALUES (NEW.id, NEW.assigned_to, 'created', NEW.status, jsonb_build_object('organization', NEW.organization));
    
    IF NEW.assigned_to IS NOT NULL THEN
      INSERT INTO ticket_watchers (ticket_id, user_id)
      VALUES (NEW.id, NEW.assigned_to)
      ON CONFLICT DO NOTHING;
    END IF;
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
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger
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

-- Drop existing policies (prevents "already exists" errors)
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

-- Verify completion
SELECT 'Migration complete!' as status;
