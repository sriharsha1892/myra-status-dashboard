-- Migration: Add notifications and ticket_links tables
-- Description: Support for in-app notifications and ticket dependencies

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  ticket_id UUID REFERENCES tickets,
  type TEXT NOT NULL CHECK (type IN ('assigned', 'comment', 'mention', 'status_change')),
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Ticket links table for dependencies
CREATE TABLE IF NOT EXISTS ticket_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES tickets NOT NULL,
  related_ticket_id UUID REFERENCES tickets NOT NULL,
  link_type TEXT NOT NULL CHECK (link_type IN ('blocks', 'blocked_by', 'related', 'duplicate')),
  created_by UUID REFERENCES auth.users NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT no_self_link CHECK (ticket_id != related_ticket_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_ticket_links_ticket ON ticket_links(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_links_related ON ticket_links(related_ticket_id);

-- Enable Row Level Security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for ticket_links
CREATE POLICY "Anyone can view ticket links"
  ON ticket_links FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create ticket links"
  ON ticket_links FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own ticket links"
  ON ticket_links FOR DELETE
  USING (auth.uid() = created_by);

-- Add comments table for ticket discussions (if not exists)
CREATE TABLE IF NOT EXISTS ticket_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES tickets NOT NULL,
  user_id UUID REFERENCES auth.users NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket ON ticket_comments(ticket_id);

-- Enable RLS only if not already enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'ticket_comments'
    AND rowsecurity = true
  ) THEN
    ALTER TABLE ticket_comments ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Create policies only if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'ticket_comments'
    AND policyname = 'Anyone can view ticket comments'
  ) THEN
    CREATE POLICY "Anyone can view ticket comments"
      ON ticket_comments FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'ticket_comments'
    AND policyname = 'Authenticated users can create comments'
  ) THEN
    CREATE POLICY "Authenticated users can create comments"
      ON ticket_comments FOR INSERT
      WITH CHECK (auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'ticket_comments'
    AND policyname = 'Users can update their own comments'
  ) THEN
    CREATE POLICY "Users can update their own comments"
      ON ticket_comments FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'ticket_comments'
    AND policyname = 'Users can delete their own comments'
  ) THEN
    CREATE POLICY "Users can delete their own comments"
      ON ticket_comments FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;
