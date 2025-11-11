-- Migration: Add Notification Support to Resource Discussions
-- Date: 2025-11-12
-- Purpose: Update create_resource_discussion to automatically create mention notifications

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
  v_actor_name TEXT;
  v_discussion_title TEXT;
  v_discussion_preview TEXT;
  v_action_url TEXT;
  v_mentioned_user UUID;
  v_priority_score INTEGER;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get actor's name for notification
  SELECT name INTO v_actor_name FROM users WHERE id = v_user_id;
  IF v_actor_name IS NULL THEN
    v_actor_name := 'Someone';
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

  -- Parse content to extract title and preview
  BEGIN
    v_discussion_title := (p_content::json->>'title');
    IF v_discussion_title IS NULL THEN
      v_discussion_title := (p_content::json->>'question');
    END IF;
    IF v_discussion_title IS NULL THEN
      v_discussion_title := 'New Discussion';
    END IF;

    -- Get preview from content field
    v_discussion_preview := (p_content::json->>'content');
    IF v_discussion_preview IS NULL THEN
      v_discussion_preview := (p_content::json->>'details');
    END IF;
    -- Limit preview to 100 characters
    IF LENGTH(v_discussion_preview) > 100 THEN
      v_discussion_preview := SUBSTRING(v_discussion_preview, 1, 100) || '...';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- If JSON parsing fails, use defaults
    v_discussion_title := 'New Discussion';
    v_discussion_preview := '';
  END;

  -- Build action URL
  v_action_url := '/support/resources#discussion-' || v_discussion_id::TEXT;

  -- Create notifications for mentioned users
  IF p_mentioned_user_ids IS NOT NULL AND array_length(p_mentioned_user_ids, 1) > 0 THEN
    -- Base priority for mentions is 60
    v_priority_score := 60;

    -- Loop through mentioned users and create notifications
    FOREACH v_mentioned_user IN ARRAY p_mentioned_user_ids
    LOOP
      -- Don't notify the author
      IF v_mentioned_user != v_user_id THEN
        INSERT INTO notifications (
          user_id,
          entity_type,
          entity_id,
          entity_title,
          notification_type,
          actor_id,
          title,
          message,
          action_url,
          thread_key,
          priority_score,
          status
        ) VALUES (
          v_mentioned_user,
          'resource_discussion',
          v_discussion_id,
          v_discussion_title,
          'mention',
          v_user_id,
          v_actor_name || ' mentioned you in "' || v_discussion_title || '"',
          v_discussion_preview,
          v_action_url,
          'resource_discussion:' || v_discussion_id::TEXT,
          v_priority_score,
          'unread'
        );
      END IF;
    END LOOP;
  END IF;

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

-- Add comment for documentation
COMMENT ON FUNCTION create_resource_discussion IS
  'Creates a new resource discussion/question/answer and automatically sends mention notifications to tagged users via the unified notifications system';
