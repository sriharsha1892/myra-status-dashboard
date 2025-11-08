-- Unified Notes System
-- Created: 2025-11-08
-- Purpose: Single notes table for all entities with threading and mentions

-- Drop old tables if they exist
DROP TABLE IF EXISTS note_edit_history CASCADE;
DROP TABLE IF EXISTS note_mentions CASCADE;
DROP TABLE IF EXISTS unified_notes CASCADE;

-- Main unified notes table
CREATE TABLE unified_notes (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Polymorphic Entity Reference
  entity_type TEXT NOT NULL CHECK (entity_type IN ('trial_org', 'meeting', 'roadmap_item', 'ticket', 'todo', 'standalone')),
  entity_id UUID, -- NULL for standalone notes
  entity_title TEXT,

  -- Content
  content TEXT NOT NULL, -- Rich HTML from TipTap
  plain_text TEXT, -- For search/preview

  -- Threading (Linear-style flat threading)
  parent_note_id UUID REFERENCES unified_notes(id) ON DELETE CASCADE,
  thread_root_id UUID REFERENCES unified_notes(id) ON DELETE CASCADE,
  reply_count INTEGER DEFAULT 0,
  is_root BOOLEAN GENERATED ALWAYS AS (parent_note_id IS NULL) STORED,

  -- Mentions
  mentioned_user_ids UUID[] DEFAULT ARRAY[]::UUID[],
  has_mentions BOOLEAN GENERATED ALWAYS AS (array_length(mentioned_user_ids, 1) > 0) STORED,

  -- Visibility
  visibility TEXT NOT NULL DEFAULT 'team' CHECK (visibility IN ('team', 'internal', 'private')),
  -- 'team': Visible to all trial org team members
  -- 'internal': Only visible to internal admins
  -- 'private': Only visible to author

  -- Metadata
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  edited BOOLEAN DEFAULT false,
  last_edit_at TIMESTAMPTZ,

  -- Soft Delete
  deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID
);

-- Note Mentions (for tracking read status)
CREATE TABLE note_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES unified_notes(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL,
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(note_id, mentioned_user_id)
);

-- Note Edit History
CREATE TABLE note_edit_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES unified_notes(id) ON DELETE CASCADE,
  previous_content TEXT NOT NULL,
  previous_plain_text TEXT,
  edited_by UUID NOT NULL,
  edited_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_notes_entity ON unified_notes(entity_type, entity_id, created_at DESC) WHERE deleted = false;
CREATE INDEX idx_notes_thread_root ON unified_notes(thread_root_id, created_at ASC) WHERE deleted = false;
CREATE INDEX idx_notes_parent ON unified_notes(parent_note_id, created_at ASC) WHERE deleted = false;
CREATE INDEX idx_notes_created_by ON unified_notes(created_by, created_at DESC);
CREATE INDEX idx_notes_mentions ON unified_notes USING GIN(mentioned_user_ids) WHERE deleted = false;
CREATE INDEX idx_notes_search ON unified_notes USING GIN(to_tsvector('english', plain_text)) WHERE deleted = false;

CREATE INDEX idx_mentions_user ON note_mentions(mentioned_user_id, read, created_at DESC);
CREATE INDEX idx_mentions_note ON note_mentions(note_id);

CREATE INDEX idx_history_note ON note_edit_history(note_id, edited_at DESC);

-- Auto-increment reply_count on parent
CREATE OR REPLACE FUNCTION increment_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_note_id IS NOT NULL THEN
    UPDATE unified_notes
    SET reply_count = reply_count + 1
    WHERE id = NEW.parent_note_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER note_reply_increment
AFTER INSERT ON unified_notes
FOR EACH ROW
WHEN (NEW.parent_note_id IS NOT NULL AND NEW.deleted = false)
EXECUTE FUNCTION increment_reply_count();

-- Auto-decrement reply_count on delete
CREATE OR REPLACE FUNCTION decrement_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.parent_note_id IS NOT NULL THEN
    UPDATE unified_notes
    SET reply_count = GREATEST(reply_count - 1, 0)
    WHERE id = OLD.parent_note_id;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER note_reply_decrement
AFTER UPDATE OF deleted ON unified_notes
FOR EACH ROW
WHEN (OLD.deleted = false AND NEW.deleted = true AND OLD.parent_note_id IS NOT NULL)
EXECUTE FUNCTION decrement_reply_count();

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_note_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER note_update_timestamp
BEFORE UPDATE ON unified_notes
FOR EACH ROW
EXECUTE FUNCTION update_note_timestamp();

-- Auto-create mention records
CREATE OR REPLACE FUNCTION create_mention_records()
RETURNS TRIGGER AS $$
DECLARE
  user_id UUID;
BEGIN
  IF NEW.mentioned_user_ids IS NOT NULL THEN
    FOREACH user_id IN ARRAY NEW.mentioned_user_ids
    LOOP
      INSERT INTO note_mentions (note_id, mentioned_user_id)
      VALUES (NEW.id, user_id)
      ON CONFLICT (note_id, mentioned_user_id) DO NOTHING;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER note_create_mentions
AFTER INSERT ON unified_notes
FOR EACH ROW
WHEN (NEW.mentioned_user_ids IS NOT NULL)
EXECUTE FUNCTION create_mention_records();

-- RLS Policies
ALTER TABLE unified_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_edit_history ENABLE ROW LEVEL SECURITY;

-- Notes: Users can view based on visibility
CREATE POLICY "Users view notes they have access to"
  ON unified_notes FOR SELECT
  USING (
    deleted = false AND (
      visibility = 'team' OR
      visibility = 'internal' OR
      (visibility = 'private' AND created_by = auth.uid()) OR
      created_by = auth.uid() OR
      auth.uid() = ANY(mentioned_user_ids)
    )
  );

-- Notes: Users can create notes
CREATE POLICY "Users create notes"
  ON unified_notes FOR INSERT
  WITH CHECK (created_by = auth.uid());

-- Notes: Users can update their own notes
CREATE POLICY "Users update own notes"
  ON unified_notes FOR UPDATE
  USING (created_by = auth.uid());

-- Notes: Users can soft-delete their own notes
CREATE POLICY "Users delete own notes"
  ON unified_notes FOR UPDATE
  USING (created_by = auth.uid());

-- Mentions: Users view their own mentions
CREATE POLICY "Users view own mentions"
  ON note_mentions FOR SELECT
  USING (mentioned_user_id = auth.uid());

-- Mentions: Users update their own mentions
CREATE POLICY "Users update own mentions"
  ON note_mentions FOR UPDATE
  USING (mentioned_user_id = auth.uid());

-- History: Users can view edit history of notes they can see
CREATE POLICY "Users view edit history"
  ON note_edit_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM unified_notes
      WHERE unified_notes.id = note_edit_history.note_id
      AND (
        unified_notes.visibility = 'team' OR
        unified_notes.created_by = auth.uid()
      )
    )
  );

-- Comments
COMMENT ON TABLE unified_notes IS 'Unified notes system for all entities with Linear-style threading';
COMMENT ON COLUMN unified_notes.entity_type IS 'Polymorphic entity type: trial_org, meeting, roadmap_item, ticket, todo, standalone';
COMMENT ON COLUMN unified_notes.entity_id IS 'Polymorphic entity ID (NULL for standalone notes)';
COMMENT ON COLUMN unified_notes.content IS 'Rich HTML content from TipTap editor';
COMMENT ON COLUMN unified_notes.plain_text IS 'Plain text for search and preview';
COMMENT ON COLUMN unified_notes.thread_root_id IS 'Root note of thread (NULL for root notes)';
COMMENT ON COLUMN unified_notes.parent_note_id IS 'Direct parent note for replies (NULL for root notes)';
COMMENT ON COLUMN unified_notes.reply_count IS 'Number of direct replies to this note';
COMMENT ON COLUMN unified_notes.visibility IS 'team = all team members, internal = admins only, private = author only';
COMMENT ON COLUMN unified_notes.mentioned_user_ids IS 'Array of user IDs mentioned in this note';

COMMENT ON TABLE note_mentions IS 'Tracks read status of mentions in notes';
COMMENT ON TABLE note_edit_history IS 'Version history for edited notes';
