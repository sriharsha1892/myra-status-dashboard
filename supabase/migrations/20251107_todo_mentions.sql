-- Todo Mentions System
-- Allows users to @mention other team members in todos

-- 1. Create todo_mentions table
CREATE TABLE IF NOT EXISTS todo_mentions (
  mention_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  todo_id UUID NOT NULL REFERENCES user_todos(todo_id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mentioned_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(todo_id, mentioned_user_id)
);

-- 2. Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_todo_mentions_todo_id ON todo_mentions(todo_id);
CREATE INDEX IF NOT EXISTS idx_todo_mentions_mentioned_user ON todo_mentions(mentioned_user_id);
CREATE INDEX IF NOT EXISTS idx_todo_mentions_unread ON todo_mentions(mentioned_user_id, is_read);

-- 3. Enable RLS
ALTER TABLE todo_mentions ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Users can see mentions where they are mentioned or they created the mention
CREATE POLICY "Users can view their mentions" ON todo_mentions
  FOR SELECT
  USING (mentioned_user_id = auth.uid() OR mentioned_by_user_id = auth.uid());

-- Users can create mentions
CREATE POLICY "Users can create mentions" ON todo_mentions
  FOR INSERT
  WITH CHECK (mentioned_by_user_id = auth.uid());

-- Users can update their own mention read status
CREATE POLICY "Users can update mention read status" ON todo_mentions
  FOR UPDATE
  USING (mentioned_user_id = auth.uid())
  WITH CHECK (mentioned_user_id = auth.uid());

-- Users can delete mentions they created
CREATE POLICY "Users can delete mentions they created" ON todo_mentions
  FOR DELETE
  USING (mentioned_by_user_id = auth.uid());

-- 5. Function to extract mentions from text
CREATE OR REPLACE FUNCTION extract_mentions(text_content TEXT)
RETURNS TEXT[] AS $$
DECLARE
  mentions TEXT[];
BEGIN
  -- Extract all @mentions (e.g., @username)
  SELECT ARRAY_AGG(DISTINCT mention)
  INTO mentions
  FROM (
    SELECT regexp_matches(text_content, '@(\w+)', 'g') AS mention_match
  ) matches
  CROSS JOIN LATERAL (
    SELECT mention_match[1] AS mention
  ) extracted;

  RETURN COALESCE(mentions, ARRAY[]::TEXT[]);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 6. Comments
COMMENT ON TABLE todo_mentions IS 'Tracks @mentions in todos for collaboration';
COMMENT ON FUNCTION extract_mentions IS 'Extracts @username mentions from text';
