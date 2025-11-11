-- Resource Community Platform Migration
-- Adds external/internal visibility, discussions, Q&A, folders, and voting

-- ============================================================================
-- 1. Add visibility column to existing document_library table
-- ============================================================================

ALTER TABLE document_library
ADD COLUMN IF NOT EXISTS visibility TEXT CHECK (visibility IN ('external', 'internal')) DEFAULT 'internal';

COMMENT ON COLUMN document_library.visibility IS 'Whether resource is external (client-facing) or internal (team-only)';

-- Set all existing resources to internal by default
UPDATE document_library SET visibility = 'internal' WHERE visibility IS NULL;

-- ============================================================================
-- 2. Resource Folders Table (hierarchical organization)
-- ============================================================================

CREATE TABLE IF NOT EXISTS resource_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  parent_folder_id UUID REFERENCES resource_folders(id) ON DELETE CASCADE,
  visibility TEXT NOT NULL CHECK (visibility IN ('external', 'internal')) DEFAULT 'internal',
  icon TEXT DEFAULT 'Folder',
  color TEXT DEFAULT 'blue',
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_resource_folders_parent ON resource_folders(parent_folder_id);
CREATE INDEX idx_resource_folders_visibility ON resource_folders(visibility);

COMMENT ON TABLE resource_folders IS 'Hierarchical folder structure for organizing resources';

-- Add folder_id to document_library
ALTER TABLE document_library
ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES resource_folders(id) ON DELETE SET NULL;

CREATE INDEX idx_document_library_folder ON document_library(folder_id);

-- ============================================================================
-- 3. Resource Discussions Table (threads and comments)
-- ============================================================================

CREATE TABLE IF NOT EXISTS resource_discussions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID REFERENCES document_library(id) ON DELETE CASCADE,
  parent_discussion_id UUID REFERENCES resource_discussions(id) ON DELETE CASCADE,
  discussion_type TEXT NOT NULL CHECK (discussion_type IN ('comment', 'question', 'answer')) DEFAULT 'comment',
  content TEXT NOT NULL, -- HTML content from rich text editor
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_pinned BOOLEAN DEFAULT FALSE,
  is_accepted_answer BOOLEAN DEFAULT FALSE, -- For Q&A type
  mentioned_user_ids UUID[] DEFAULT ARRAY[]::UUID[], -- For notifications
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure accepted answers are only on answers
  CHECK (NOT is_accepted_answer OR discussion_type = 'answer')
);

CREATE INDEX idx_resource_discussions_resource ON resource_discussions(resource_id);
CREATE INDEX idx_resource_discussions_parent ON resource_discussions(parent_discussion_id);
CREATE INDEX idx_resource_discussions_author ON resource_discussions(author_id);
CREATE INDEX idx_resource_discussions_type ON resource_discussions(discussion_type);
CREATE INDEX idx_resource_discussions_pinned ON resource_discussions(is_pinned) WHERE is_pinned = TRUE;
CREATE INDEX idx_resource_discussions_accepted ON resource_discussions(is_accepted_answer) WHERE is_accepted_answer = TRUE;

COMMENT ON TABLE resource_discussions IS 'Discussion threads, questions, and answers on resources';

-- ============================================================================
-- 4. Resource Discussion Reactions Table (voting and reactions)
-- ============================================================================

CREATE TABLE IF NOT EXISTS resource_discussion_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discussion_id UUID NOT NULL REFERENCES resource_discussions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('upvote', 'downvote', 'helpful', 'solved')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- One reaction type per user per discussion
  UNIQUE(discussion_id, user_id, reaction_type)
);

CREATE INDEX idx_discussion_reactions_discussion ON resource_discussion_reactions(discussion_id);
CREATE INDEX idx_discussion_reactions_user ON resource_discussion_reactions(user_id);
CREATE INDEX idx_discussion_reactions_type ON resource_discussion_reactions(reaction_type);

COMMENT ON TABLE resource_discussion_reactions IS 'Upvotes, downvotes, and helpful markers for discussions';

-- ============================================================================
-- 5. Helper Views for Counts
-- ============================================================================

-- View for discussion counts with votes
CREATE OR REPLACE VIEW resource_discussion_stats AS
SELECT
  d.id,
  d.resource_id,
  d.parent_discussion_id,
  d.discussion_type,
  d.author_id,
  d.is_pinned,
  d.is_accepted_answer,
  d.created_at,
  d.updated_at,
  COALESCE(upvotes.count, 0) AS upvote_count,
  COALESCE(downvotes.count, 0) AS downvote_count,
  COALESCE(helpful.count, 0) AS helpful_count,
  COALESCE(replies.count, 0) AS reply_count,
  (COALESCE(upvotes.count, 0) - COALESCE(downvotes.count, 0)) AS net_votes
FROM resource_discussions d
LEFT JOIN (
  SELECT discussion_id, COUNT(*) as count
  FROM resource_discussion_reactions
  WHERE reaction_type = 'upvote'
  GROUP BY discussion_id
) upvotes ON d.id = upvotes.discussion_id
LEFT JOIN (
  SELECT discussion_id, COUNT(*) as count
  FROM resource_discussion_reactions
  WHERE reaction_type = 'downvote'
  GROUP BY discussion_id
) downvotes ON d.id = downvotes.discussion_id
LEFT JOIN (
  SELECT discussion_id, COUNT(*) as count
  FROM resource_discussion_reactions
  WHERE reaction_type = 'helpful'
  GROUP BY discussion_id
) helpful ON d.id = helpful.discussion_id
LEFT JOIN (
  SELECT parent_discussion_id, COUNT(*) as count
  FROM resource_discussions
  WHERE parent_discussion_id IS NOT NULL
  GROUP BY parent_discussion_id
) replies ON d.id = replies.parent_discussion_id;

-- ============================================================================
-- 6. RPC Functions for Common Operations
-- ============================================================================

-- Function to toggle reaction (upvote/downvote/helpful)
CREATE OR REPLACE FUNCTION toggle_discussion_reaction(
  p_discussion_id UUID,
  p_reaction_type TEXT
)
RETURNS JSON
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id UUID;
  v_existing_reaction UUID;
  v_result JSON;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if reaction already exists
  SELECT id INTO v_existing_reaction
  FROM resource_discussion_reactions
  WHERE discussion_id = p_discussion_id
    AND user_id = v_user_id
    AND reaction_type = p_reaction_type;

  IF v_existing_reaction IS NOT NULL THEN
    -- Remove existing reaction
    DELETE FROM resource_discussion_reactions WHERE id = v_existing_reaction;
    v_result := json_build_object('action', 'removed', 'reaction_type', p_reaction_type);
  ELSE
    -- Add new reaction (first remove opposite reaction if upvote/downvote)
    IF p_reaction_type IN ('upvote', 'downvote') THEN
      DELETE FROM resource_discussion_reactions
      WHERE discussion_id = p_discussion_id
        AND user_id = v_user_id
        AND reaction_type IN ('upvote', 'downvote');
    END IF;

    INSERT INTO resource_discussion_reactions (discussion_id, user_id, reaction_type)
    VALUES (p_discussion_id, v_user_id, p_reaction_type);

    v_result := json_build_object('action', 'added', 'reaction_type', p_reaction_type);
  END IF;

  RETURN v_result;
END;
$$;

-- Function to mark answer as accepted
CREATE OR REPLACE FUNCTION mark_answer_accepted(
  p_answer_id UUID
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id UUID;
  v_question_id UUID;
  v_question_author UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get the question this answer belongs to
  SELECT parent_discussion_id INTO v_question_id
  FROM resource_discussions
  WHERE id = p_answer_id AND discussion_type = 'answer';

  IF v_question_id IS NULL THEN
    RAISE EXCEPTION 'Answer not found or not an answer type';
  END IF;

  -- Check if user is the question author or admin
  SELECT author_id INTO v_question_author
  FROM resource_discussions
  WHERE id = v_question_id;

  -- Check user role
  IF v_question_author != v_user_id AND NOT EXISTS (
    SELECT 1 FROM users WHERE id = v_user_id AND role IN ('Admin', 'Super Admin')
  ) THEN
    RAISE EXCEPTION 'Only question author or admins can accept answers';
  END IF;

  -- Unmark other accepted answers for this question
  UPDATE resource_discussions
  SET is_accepted_answer = FALSE
  WHERE parent_discussion_id = v_question_id AND discussion_type = 'answer';

  -- Mark this answer as accepted
  UPDATE resource_discussions
  SET is_accepted_answer = TRUE
  WHERE id = p_answer_id;

  RETURN TRUE;
END;
$$;

-- Function to create discussion/question with mentions
CREATE OR REPLACE FUNCTION create_resource_discussion(
  p_resource_id UUID,
  p_parent_discussion_id UUID,
  p_discussion_type TEXT,
  p_content TEXT,
  p_mentioned_user_ids UUID[]
)
RETURNS JSON
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id UUID;
  v_discussion_id UUID;
  v_result JSON;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Insert discussion
  INSERT INTO resource_discussions (
    resource_id,
    parent_discussion_id,
    discussion_type,
    content,
    author_id,
    mentioned_user_ids
  ) VALUES (
    p_resource_id,
    p_parent_discussion_id,
    p_discussion_type,
    p_content,
    v_user_id,
    COALESCE(p_mentioned_user_ids, ARRAY[]::UUID[])
  )
  RETURNING id INTO v_discussion_id;

  -- Build result with user info
  SELECT json_build_object(
    'id', v_discussion_id,
    'resource_id', p_resource_id,
    'parent_discussion_id', p_parent_discussion_id,
    'discussion_type', p_discussion_type,
    'content', p_content,
    'author_id', v_user_id,
    'mentioned_user_ids', COALESCE(p_mentioned_user_ids, ARRAY[]::UUID[]),
    'created_at', NOW()
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- ============================================================================
-- 7. Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS
ALTER TABLE resource_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_discussion_reactions ENABLE ROW LEVEL SECURITY;

-- Folders: Everyone can read, authenticated users can create/update/delete
CREATE POLICY "Anyone can view folders"
  ON resource_folders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create folders"
  ON resource_folders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their folders or admins can update any"
  ON resource_folders FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('Admin', 'Super Admin'))
  );

CREATE POLICY "Users can delete their folders or admins can delete any"
  ON resource_folders FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('Admin', 'Super Admin'))
  );

-- Discussions: Everyone can read, authenticated users can create
CREATE POLICY "Anyone can view discussions"
  ON resource_discussions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create discussions"
  ON resource_discussions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update their discussions or admins can update any"
  ON resource_discussions FOR UPDATE
  TO authenticated
  USING (
    author_id = auth.uid() OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('Admin', 'Super Admin'))
  );

CREATE POLICY "Users can delete their discussions or admins can delete any"
  ON resource_discussions FOR DELETE
  TO authenticated
  USING (
    author_id = auth.uid() OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('Admin', 'Super Admin'))
  );

-- Reactions: Everyone can read, authenticated users can manage their own
CREATE POLICY "Anyone can view reactions"
  ON resource_discussion_reactions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can add their own reactions"
  ON resource_discussion_reactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reactions"
  ON resource_discussion_reactions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- 8. Insert Default Folders
-- ============================================================================

INSERT INTO resource_folders (name, visibility, icon, color, description, sort_order) VALUES
  ('Client Help Center', 'external', 'BookOpen', 'blue', 'Client-facing documentation and guides', 1),
  ('Getting Started', 'external', 'Rocket', 'purple', 'Onboarding guides for new clients', 2),
  ('FAQs', 'external', 'HelpCircle', 'green', 'Frequently asked questions', 3),
  ('Account Management', 'internal', 'Users', 'orange', 'Strategies and playbooks for managing accounts', 4),
  ('Product Knowledge', 'internal', 'Lightbulb', 'yellow', 'Internal product information and tips', 5),
  ('Team Discussions', 'internal', 'MessageSquare', 'pink', 'General team discussions and Q&A', 6)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 9. Triggers for updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_resource_folders_updated_at
  BEFORE UPDATE ON resource_folders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_resource_discussions_updated_at
  BEFORE UPDATE ON resource_discussions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Migration Complete
-- Resource Community Platform: Adds external/internal visibility,
-- discussions, Q&A, folders, and community features
-- ============================================================================
