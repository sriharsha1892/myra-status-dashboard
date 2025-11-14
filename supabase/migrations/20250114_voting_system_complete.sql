-- ============================================
-- COMPREHENSIVE VOTING SYSTEM IMPLEMENTATION
-- ============================================
-- Adds voting functionality to:
-- 1. Feature Requests (with comments)
-- 2. Product Roadmap Items
-- 3. Enhanced reactions for Resources
-- ============================================

-- ============================================
-- PHASE 1: FEATURE REQUEST VOTING
-- ============================================

-- Create table to track individual feature request votes
CREATE TABLE IF NOT EXISTS feature_request_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_request_id UUID NOT NULL REFERENCES feature_requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(feature_request_id, user_id)
);

-- Create table for vote comments
CREATE TABLE IF NOT EXISTS feature_request_vote_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vote_id UUID NOT NULL REFERENCES feature_request_votes(id) ON DELETE CASCADE,
  comment TEXT NOT NULL CHECK (char_length(comment) <= 200),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX idx_feature_request_votes_request_id ON feature_request_votes(feature_request_id);
CREATE INDEX idx_feature_request_votes_user_id ON feature_request_votes(user_id);
CREATE INDEX idx_feature_request_vote_comments_vote_id ON feature_request_vote_comments(vote_id);

-- Function to toggle feature request vote with optional comment
CREATE OR REPLACE FUNCTION toggle_feature_vote(
  p_feature_id UUID,
  p_comment TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_existing_vote_id UUID;
  v_new_vote_id UUID;
  v_action TEXT;
  v_new_vote_count INTEGER;
BEGIN
  -- Get current user ID
  SELECT auth.uid() INTO v_user_id;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check for existing vote
  SELECT id INTO v_existing_vote_id
  FROM feature_request_votes
  WHERE feature_request_id = p_feature_id
    AND user_id = v_user_id;

  IF v_existing_vote_id IS NOT NULL THEN
    -- Remove existing vote and comment
    DELETE FROM feature_request_votes
    WHERE id = v_existing_vote_id;

    -- Decrement vote count
    UPDATE feature_requests
    SET votes = GREATEST(0, votes - 1),
        updated_at = NOW()
    WHERE id = p_feature_id;

    v_action := 'removed';
  ELSE
    -- Add new vote
    INSERT INTO feature_request_votes (feature_request_id, user_id)
    VALUES (p_feature_id, v_user_id)
    RETURNING id INTO v_new_vote_id;

    -- Add comment if provided
    IF p_comment IS NOT NULL AND p_comment != '' THEN
      INSERT INTO feature_request_vote_comments (vote_id, comment)
      VALUES (v_new_vote_id, p_comment);
    END IF;

    -- Increment vote count
    UPDATE feature_requests
    SET votes = votes + 1,
        updated_at = NOW()
    WHERE id = p_feature_id;

    v_action := 'added';
  END IF;

  -- Get new vote count
  SELECT votes INTO v_new_vote_count
  FROM feature_requests
  WHERE id = p_feature_id;

  -- Create notification if vote was added
  IF v_action = 'added' THEN
    -- Get feature request details for notification
    INSERT INTO unified_notifications (
      user_id,
      notification_type,
      title,
      message,
      link,
      metadata
    )
    SELECT
      fr.created_by,
      'feature_vote',
      'New vote on your feature request',
      'Someone voted for: ' || fr.title,
      '/support/feature-requests',
      jsonb_build_object(
        'feature_request_id', p_feature_id,
        'voter_id', v_user_id,
        'vote_count', v_new_vote_count,
        'comment', p_comment
      )
    FROM feature_requests fr
    WHERE fr.id = p_feature_id
      AND fr.created_by != v_user_id; -- Don't notify self-votes
  END IF;

  RETURN json_build_object(
    'action', v_action,
    'vote_count', v_new_vote_count,
    'feature_request_id', p_feature_id
  );
END;
$$;

-- View to get feature requests with user vote status
CREATE OR REPLACE VIEW feature_requests_with_votes AS
SELECT
  fr.*,
  CASE
    WHEN frv.id IS NOT NULL THEN true
    ELSE false
  END AS user_voted,
  frvc.comment AS user_vote_comment,
  (
    SELECT json_agg(
      json_build_object(
        'user_id', frvall.user_id,
        'comment', frvcomm.comment,
        'created_at', frvall.created_at
      )
      ORDER BY frvall.created_at DESC
    )
    FROM feature_request_votes frvall
    LEFT JOIN feature_request_vote_comments frvcomm
      ON frvcomm.vote_id = frvall.id
    WHERE frvall.feature_request_id = fr.id
  ) AS all_votes
FROM feature_requests fr
LEFT JOIN feature_request_votes frv
  ON frv.feature_request_id = fr.id
  AND frv.user_id = auth.uid()
LEFT JOIN feature_request_vote_comments frvc
  ON frvc.vote_id = frv.id;

-- ============================================
-- PHASE 2: ROADMAP ITEM VOTING
-- ============================================

-- Add votes column to roadmap table if not exists
ALTER TABLE org_product_roadmap
ADD COLUMN IF NOT EXISTS votes INTEGER DEFAULT 0;

-- Create table to track individual roadmap votes
CREATE TABLE IF NOT EXISTS roadmap_item_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_id UUID NOT NULL REFERENCES org_product_roadmap(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(roadmap_id, user_id)
);

-- Create table for roadmap vote comments
CREATE TABLE IF NOT EXISTS roadmap_vote_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vote_id UUID NOT NULL REFERENCES roadmap_item_votes(id) ON DELETE CASCADE,
  comment TEXT NOT NULL CHECK (char_length(comment) <= 200),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_roadmap_item_votes_roadmap_id ON roadmap_item_votes(roadmap_id);
CREATE INDEX idx_roadmap_item_votes_user_id ON roadmap_item_votes(user_id);
CREATE INDEX idx_roadmap_vote_comments_vote_id ON roadmap_vote_comments(vote_id);

-- Function to toggle roadmap vote
CREATE OR REPLACE FUNCTION toggle_roadmap_vote(
  p_roadmap_id UUID,
  p_comment TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_existing_vote_id UUID;
  v_new_vote_id UUID;
  v_action TEXT;
  v_new_vote_count INTEGER;
  v_roadmap_title TEXT;
  v_owner_id UUID;
BEGIN
  -- Get current user ID
  SELECT auth.uid() INTO v_user_id;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check for existing vote
  SELECT id INTO v_existing_vote_id
  FROM roadmap_item_votes
  WHERE roadmap_id = p_roadmap_id
    AND user_id = v_user_id;

  IF v_existing_vote_id IS NOT NULL THEN
    -- Remove existing vote
    DELETE FROM roadmap_item_votes
    WHERE id = v_existing_vote_id;

    -- Decrement vote count
    UPDATE org_product_roadmap
    SET votes = GREATEST(0, votes - 1),
        updated_at = NOW()
    WHERE id = p_roadmap_id;

    v_action := 'removed';
  ELSE
    -- Add new vote
    INSERT INTO roadmap_item_votes (roadmap_id, user_id)
    VALUES (p_roadmap_id, v_user_id)
    RETURNING id INTO v_new_vote_id;

    -- Add comment if provided
    IF p_comment IS NOT NULL AND p_comment != '' THEN
      INSERT INTO roadmap_vote_comments (vote_id, comment)
      VALUES (v_new_vote_id, p_comment);
    END IF;

    -- Increment vote count
    UPDATE org_product_roadmap
    SET votes = votes + 1,
        updated_at = NOW()
    WHERE id = p_roadmap_id
    RETURNING votes, title, owner INTO v_new_vote_count, v_roadmap_title, v_owner_id;

    v_action := 'added';

    -- Create notification for roadmap owner
    IF v_owner_id IS NOT NULL AND v_owner_id != v_user_id THEN
      INSERT INTO unified_notifications (
        user_id,
        notification_type,
        title,
        message,
        link,
        metadata
      )
      VALUES (
        v_owner_id,
        'roadmap_vote',
        'New vote on your roadmap item',
        'Someone voted for: ' || v_roadmap_title,
        '/support/admin/roadmap',
        jsonb_build_object(
          'roadmap_id', p_roadmap_id,
          'voter_id', v_user_id,
          'vote_count', v_new_vote_count,
          'comment', p_comment
        )
      );
    END IF;

    -- Check for milestone notifications (10, 25, 50, 100 votes)
    IF v_new_vote_count IN (10, 25, 50, 100) THEN
      INSERT INTO unified_notifications (
        user_id,
        notification_type,
        title,
        message,
        link,
        metadata
      )
      VALUES (
        v_owner_id,
        'milestone_reached',
        'Milestone reached!',
        v_roadmap_title || ' reached ' || v_new_vote_count || ' votes!',
        '/support/admin/roadmap',
        jsonb_build_object(
          'roadmap_id', p_roadmap_id,
          'milestone', v_new_vote_count
        )
      );
    END IF;
  END IF;

  -- Get current vote count if action was 'removed'
  IF v_action = 'removed' THEN
    SELECT votes INTO v_new_vote_count
    FROM org_product_roadmap
    WHERE id = p_roadmap_id;
  END IF;

  RETURN json_build_object(
    'action', v_action,
    'vote_count', v_new_vote_count,
    'roadmap_id', p_roadmap_id
  );
END;
$$;

-- View to get roadmap items with user vote status
CREATE OR REPLACE VIEW roadmap_items_with_votes AS
SELECT
  r.*,
  CASE
    WHEN riv.id IS NOT NULL THEN true
    ELSE false
  END AS user_voted,
  rvc.comment AS user_vote_comment,
  (
    SELECT json_agg(
      json_build_object(
        'user_id', rivall.user_id,
        'comment', rvcomm.comment,
        'created_at', rivall.created_at
      )
      ORDER BY rivall.created_at DESC
    )
    FROM roadmap_item_votes rivall
    LEFT JOIN roadmap_vote_comments rvcomm
      ON rvcomm.vote_id = rivall.id
    WHERE rivall.roadmap_id = r.id
  ) AS all_votes
FROM org_product_roadmap r
LEFT JOIN roadmap_item_votes riv
  ON riv.roadmap_id = r.id
  AND riv.user_id = auth.uid()
LEFT JOIN roadmap_vote_comments rvc
  ON rvc.vote_id = riv.id;

-- ============================================
-- PHASE 3: ENHANCED REACTION FUNCTIONS
-- ============================================

-- Update the toggle_discussion_reaction function to handle helpful and solved reactions
CREATE OR REPLACE FUNCTION toggle_discussion_reaction_enhanced(
  p_discussion_id UUID,
  p_reaction_type TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_existing_reaction UUID;
  v_action TEXT;
  v_discussion_type TEXT;
  v_author_id UUID;
  v_parent_id UUID;
BEGIN
  -- Get current user ID
  SELECT auth.uid() INTO v_user_id;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate reaction type
  IF p_reaction_type NOT IN ('upvote', 'downvote', 'helpful', 'solved') THEN
    RAISE EXCEPTION 'Invalid reaction type';
  END IF;

  -- Get discussion details
  SELECT discussion_type, author_id, parent_discussion_id
  INTO v_discussion_type, v_author_id, v_parent_id
  FROM resource_discussions
  WHERE id = p_discussion_id;

  -- Only question authors can mark answers as solved
  IF p_reaction_type = 'solved' THEN
    IF v_parent_id IS NULL THEN
      RAISE EXCEPTION 'Cannot mark a question as solved, only answers';
    END IF;

    -- Check if current user is the question author
    IF NOT EXISTS (
      SELECT 1 FROM resource_discussions
      WHERE id = v_parent_id AND author_id = v_user_id
    ) THEN
      RAISE EXCEPTION 'Only question authors can mark answers as solved';
    END IF;

    -- Remove solved from other answers
    DELETE FROM resource_discussion_reactions
    WHERE discussion_id IN (
      SELECT id FROM resource_discussions
      WHERE parent_discussion_id = v_parent_id
    ) AND reaction_type = 'solved';
  END IF;

  -- Check for existing reaction
  SELECT id INTO v_existing_reaction
  FROM resource_discussion_reactions
  WHERE discussion_id = p_discussion_id
    AND user_id = v_user_id
    AND reaction_type = p_reaction_type;

  IF v_existing_reaction IS NOT NULL THEN
    -- Remove existing reaction
    DELETE FROM resource_discussion_reactions
    WHERE id = v_existing_reaction;
    v_action := 'removed';
  ELSE
    -- For upvote/downvote, remove opposite reaction
    IF p_reaction_type IN ('upvote', 'downvote') THEN
      DELETE FROM resource_discussion_reactions
      WHERE discussion_id = p_discussion_id
        AND user_id = v_user_id
        AND reaction_type IN ('upvote', 'downvote');
    END IF;

    -- Add new reaction
    INSERT INTO resource_discussion_reactions (
      discussion_id, user_id, reaction_type
    ) VALUES (
      p_discussion_id, v_user_id, p_reaction_type
    );
    v_action := 'added';

    -- Create notification for helpful/solved reactions
    IF p_reaction_type IN ('helpful', 'solved') AND v_author_id != v_user_id THEN
      INSERT INTO unified_notifications (
        user_id,
        notification_type,
        title,
        message,
        link,
        metadata
      )
      VALUES (
        v_author_id,
        CASE
          WHEN p_reaction_type = 'helpful' THEN 'helpful_mark'
          WHEN p_reaction_type = 'solved' THEN 'answer_accepted'
        END,
        CASE
          WHEN p_reaction_type = 'helpful' THEN 'Your post was marked as helpful'
          WHEN p_reaction_type = 'solved' THEN 'Your answer was accepted!'
        END,
        CASE
          WHEN p_reaction_type = 'helpful' THEN 'Someone found your post helpful'
          WHEN p_reaction_type = 'solved' THEN 'Your answer was marked as the solution'
        END,
        '/support/resources/' ||
        CASE
          WHEN v_discussion_type = 'discussion' THEN 'discussion/'
          ELSE 'question/'
        END ||
        COALESCE(v_parent_id, p_discussion_id)::text,
        jsonb_build_object(
          'discussion_id', p_discussion_id,
          'reaction_type', p_reaction_type,
          'reactor_id', v_user_id
        )
      );
    END IF;
  END IF;

  RETURN json_build_object(
    'action', v_action,
    'reaction_type', p_reaction_type,
    'discussion_id', p_discussion_id
  );
END;
$$;

-- ============================================
-- PHASE 4: NOTIFICATION TYPES
-- ============================================

-- Add new notification types (if not already added)
DO $$
BEGIN
  -- Check if we need to add new notification types
  IF NOT EXISTS (
    SELECT 1 FROM pg_type
    WHERE typname = 'notification_type'
    AND typtype = 'e'
  ) THEN
    -- Create the enum if it doesn't exist
    CREATE TYPE notification_type AS ENUM (
      'assignment', 'mention', 'comment', 'status_change',
      'deadline', 'trial_expiring', 'feature_vote',
      'roadmap_vote', 'milestone_reached', 'helpful_mark',
      'answer_accepted'
    );
  ELSE
    -- Add new values to existing enum if they don't exist
    ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'feature_vote';
    ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'roadmap_vote';
    ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'milestone_reached';
    ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'helpful_mark';
    ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'answer_accepted';
  END IF;
END $$;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Feature request votes policies
ALTER TABLE feature_request_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all feature request votes"
  ON feature_request_votes FOR SELECT
  USING (true);

CREATE POLICY "Users can manage their own votes"
  ON feature_request_votes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Feature request vote comments policies
ALTER TABLE feature_request_vote_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all vote comments"
  ON feature_request_vote_comments FOR SELECT
  USING (true);

CREATE POLICY "Users can manage their own vote comments"
  ON feature_request_vote_comments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM feature_request_votes frv
      WHERE frv.id = feature_request_vote_comments.vote_id
      AND frv.user_id = auth.uid()
    )
  );

-- Roadmap votes policies
ALTER TABLE roadmap_item_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all roadmap votes"
  ON roadmap_item_votes FOR SELECT
  USING (true);

CREATE POLICY "Users can manage their own roadmap votes"
  ON roadmap_item_votes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Roadmap vote comments policies
ALTER TABLE roadmap_vote_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all roadmap vote comments"
  ON roadmap_vote_comments FOR SELECT
  USING (true);

CREATE POLICY "Users can manage their own roadmap vote comments"
  ON roadmap_vote_comments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM roadmap_item_votes riv
      WHERE riv.id = roadmap_vote_comments.vote_id
      AND riv.user_id = auth.uid()
    )
  );

-- Grant permissions
GRANT ALL ON feature_request_votes TO authenticated;
GRANT ALL ON feature_request_vote_comments TO authenticated;
GRANT ALL ON roadmap_item_votes TO authenticated;
GRANT ALL ON roadmap_vote_comments TO authenticated;
GRANT SELECT ON feature_requests_with_votes TO authenticated;
GRANT SELECT ON roadmap_items_with_votes TO authenticated;
GRANT EXECUTE ON FUNCTION toggle_feature_vote TO authenticated;
GRANT EXECUTE ON FUNCTION toggle_roadmap_vote TO authenticated;
GRANT EXECUTE ON FUNCTION toggle_discussion_reaction_enhanced TO authenticated;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
-- Comprehensive voting system successfully created!
-- Features:
-- 1. Feature request voting with comments
-- 2. Roadmap item voting with comments
-- 3. Enhanced reactions (helpful, solved)
-- 4. Vote notifications
-- 5. Milestone notifications
-- ============================================