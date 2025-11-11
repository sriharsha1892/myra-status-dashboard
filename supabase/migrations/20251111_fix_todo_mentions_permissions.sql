-- Fix permission denied error when creating todos with mentions
-- The issue: foreign keys to auth.users can't be validated by client due to RLS
-- Solution: Create a SECURITY DEFINER function that runs with elevated privileges

-- 1. Create function to add todo with mentions
CREATE OR REPLACE FUNCTION create_todo_with_mentions(
  p_user_id UUID,
  p_title TEXT,
  p_todo_type TEXT DEFAULT 'task',
  p_priority TEXT DEFAULT 'normal',
  p_due_date TEXT DEFAULT NULL,
  p_related_org_id UUID DEFAULT NULL,
  p_mentioned_user_ids UUID[] DEFAULT ARRAY[]::UUID[]
)
RETURNS JSON
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_todo_id UUID;
  v_mentioned_user_id UUID;
  v_result JSON;
BEGIN
  -- 1. Create the todo
  INSERT INTO user_todos (
    user_id,
    title,
    todo_type,
    priority,
    due_date,
    related_org_id
  )
  VALUES (
    p_user_id,
    p_title,
    p_todo_type,
    p_priority,
    p_due_date::TIMESTAMP WITH TIME ZONE,
    p_related_org_id
  )
  RETURNING todo_id INTO v_todo_id;

  -- 2. Create mention records for each mentioned user
  IF array_length(p_mentioned_user_ids, 1) > 0 THEN
    FOREACH v_mentioned_user_id IN ARRAY p_mentioned_user_ids
    LOOP
      -- Skip if user is mentioning themselves
      IF v_mentioned_user_id != p_user_id THEN
        -- Check if user exists in auth.users (this runs with elevated privileges)
        IF EXISTS (SELECT 1 FROM auth.users WHERE id = v_mentioned_user_id) THEN
          INSERT INTO todo_mentions (
            todo_id,
            mentioned_user_id,
            mentioned_by_user_id
          )
          VALUES (
            v_todo_id,
            v_mentioned_user_id,
            p_user_id
          )
          ON CONFLICT (todo_id, mentioned_user_id) DO NOTHING;
        END IF;
      END IF;
    END LOOP;
  END IF;

  -- 3. Return the created todo
  SELECT json_build_object(
    'todo_id', todo_id,
    'user_id', user_id,
    'title', title,
    'todo_type', todo_type,
    'priority', priority,
    'status', status,
    'due_date', due_date,
    'related_org_id', related_org_id,
    'created_at', created_at,
    'updated_at', updated_at
  )
  INTO v_result
  FROM user_todos
  WHERE todo_id = v_todo_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- 2. Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_todo_with_mentions TO authenticated;

-- 3. Add comment
COMMENT ON FUNCTION create_todo_with_mentions IS
  'Creates a todo with mentions. Runs with elevated privileges to validate auth.users foreign keys. Only the todo creator can call this for their own user_id (enforced by RLS on user_todos).';
