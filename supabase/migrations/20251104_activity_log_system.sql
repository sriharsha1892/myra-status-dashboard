-- Activity Log System for Trial Organizations
-- Created: 2025-11-04

-- Table: org_activity_notes
CREATE TABLE IF NOT EXISTS org_activity_notes (
  note_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES trial_organizations(org_id) ON DELETE CASCADE,
  trial_user_id UUID REFERENCES trial_users(user_id) ON DELETE SET NULL,
  logged_by TEXT NOT NULL, -- Email of user who logged the note
  note_category TEXT NOT NULL CHECK (note_category IN ('first_login', 'question', 'issue', 'success', 'data_quality', 'feature_request', 'other')),
  note_text TEXT NOT NULL,
  linked_roadmap_id UUID, -- Foreign key will be added when roadmap_items table exists
  mentions TEXT[] DEFAULT '{}', -- Array of @mentioned user emails
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE,
  edited BOOLEAN DEFAULT FALSE,
  deleted BOOLEAN DEFAULT FALSE -- Soft delete flag
);

-- Table: activity_note_notifications
CREATE TABLE IF NOT EXISTS activity_note_notifications (
  notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  note_id UUID REFERENCES org_activity_notes(note_id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('mention', 'issue', 'new_note')),
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notes_org ON org_activity_notes(org_id) WHERE deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON org_activity_notes(created_at DESC) WHERE deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_notes_category ON org_activity_notes(note_category) WHERE deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_notes_trial_user ON org_activity_notes(trial_user_id) WHERE deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_notes_roadmap ON org_activity_notes(linked_roadmap_id) WHERE deleted = FALSE AND linked_roadmap_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_user ON activity_note_notifications(user_email, read);
CREATE INDEX IF NOT EXISTS idx_notifications_note ON activity_note_notifications(note_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON activity_note_notifications(user_email) WHERE read = FALSE;

-- Row Level Security (RLS)
ALTER TABLE org_activity_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_note_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for org_activity_notes
-- Allow authenticated users to read all non-deleted notes
CREATE POLICY "Allow read access to activity notes" ON org_activity_notes
  FOR SELECT
  USING (auth.role() = 'authenticated' AND deleted = FALSE);

-- Allow authenticated users to insert notes
CREATE POLICY "Allow insert access to activity notes" ON org_activity_notes
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Allow users to update their own notes
CREATE POLICY "Allow update own activity notes" ON org_activity_notes
  FOR UPDATE
  USING (logged_by = auth.jwt() ->> 'email');

-- Allow users to delete (soft) their own notes
CREATE POLICY "Allow delete own activity notes" ON org_activity_notes
  FOR DELETE
  USING (logged_by = auth.jwt() ->> 'email');

-- RLS Policies for activity_note_notifications
-- Allow users to read their own notifications
CREATE POLICY "Allow read own notifications" ON activity_note_notifications
  FOR SELECT
  USING (user_email = auth.jwt() ->> 'email');

-- Allow authenticated users to insert notifications
CREATE POLICY "Allow insert notifications" ON activity_note_notifications
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Allow users to update their own notifications (mark as read)
CREATE POLICY "Allow update own notifications" ON activity_note_notifications
  FOR UPDATE
  USING (user_email = auth.jwt() ->> 'email');

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_activity_note_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.edited = TRUE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update timestamp on note edit
CREATE TRIGGER activity_note_updated
  BEFORE UPDATE ON org_activity_notes
  FOR EACH ROW
  WHEN (OLD.note_text IS DISTINCT FROM NEW.note_text OR
        OLD.note_category IS DISTINCT FROM NEW.note_category OR
        OLD.trial_user_id IS DISTINCT FROM NEW.trial_user_id OR
        OLD.linked_roadmap_id IS DISTINCT FROM NEW.linked_roadmap_id)
  EXECUTE FUNCTION update_activity_note_timestamp();

-- Comments for documentation
COMMENT ON TABLE org_activity_notes IS 'Activity log entries for trial organizations';
COMMENT ON TABLE activity_note_notifications IS 'Notifications for @mentions and activity log events';
COMMENT ON COLUMN org_activity_notes.note_category IS 'Category: first_login, question, issue, success, data_quality, feature_request, other';
COMMENT ON COLUMN org_activity_notes.mentions IS 'Array of @mentioned user email addresses';
COMMENT ON COLUMN activity_note_notifications.notification_type IS 'Type: mention (@ mention), issue (issue category), new_note (org activity)';

-- Optional: Add foreign key constraint for roadmap_items when that table exists
-- Run this later if you create a roadmap_items table:
-- ALTER TABLE org_activity_notes
--   ADD CONSTRAINT fk_roadmap_items
--   FOREIGN KEY (linked_roadmap_id)
--   REFERENCES roadmap_items(roadmap_id)
--   ON DELETE SET NULL;
