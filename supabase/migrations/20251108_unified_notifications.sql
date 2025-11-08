-- Unified Notifications System
-- Created: 2025-11-08
-- Purpose: Single notifications table with intelligent priority scoring

-- Drop old table and policies if they exist
DROP TABLE IF EXISTS notifications CASCADE;

-- Main notifications table
CREATE TABLE notifications (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,

  -- Polymorphic Entity Reference
  entity_type TEXT NOT NULL CHECK (entity_type IN ('note', 'ticket', 'roadmap_item', 'meeting', 'trial_org')),
  entity_id UUID NOT NULL,
  entity_title TEXT,

  -- Notification Content
  notification_type TEXT NOT NULL CHECK (notification_type IN (
    'mention',
    'assigned',
    'comment',
    'status_change',
    'issue_linked',
    'watching_update'
  )),

  -- Actor & Message
  actor_id UUID,
  title TEXT NOT NULL,
  message TEXT,
  action_url TEXT NOT NULL,

  -- AI Priority Scoring (0-100)
  priority_score INTEGER NOT NULL DEFAULT 50,
  category TEXT NOT NULL DEFAULT 'recent' CHECK (category IN ('priority', 'recent', 'archived')),

  -- Grouping/Threading
  thread_key TEXT NOT NULL,

  -- State
  status TEXT NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'archived')),
  read_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  archived_reason TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_user_status_priority ON notifications(user_id, status, priority_score DESC, created_at DESC);
CREATE INDEX idx_thread ON notifications(thread_key, created_at DESC);
CREATE INDEX idx_entity ON notifications(entity_type, entity_id);
CREATE INDEX idx_user_created ON notifications(user_id, created_at DESC);

-- Auto-categorize based on priority score
CREATE OR REPLACE FUNCTION set_notification_category()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.priority_score >= 65 THEN
    NEW.category := 'priority';
  ELSE
    NEW.category := 'recent';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notification_categorize
BEFORE INSERT OR UPDATE OF priority_score ON notifications
FOR EACH ROW
EXECUTE FUNCTION set_notification_category();

-- RLS Policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users update own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- Comments
COMMENT ON TABLE notifications IS 'Unified notifications system with priority scoring and threading';
COMMENT ON COLUMN notifications.priority_score IS 'AI-scored priority: 0-100, >= 65 = priority category';
COMMENT ON COLUMN notifications.thread_key IS 'Format: {entity_type}:{entity_id} for grouping';
COMMENT ON COLUMN notifications.action_url IS 'Full URL including #note-id anchor for deep linking';
