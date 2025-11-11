-- Fix roadmap_owner_assignments UNIQUE constraint to handle NULL user_id
-- CRITICAL FIX: The original constraint UNIQUE(roadmap_item_id, user_id) doesn't work properly
-- when user_id is NULL, because PostgreSQL treats NULL as distinct values in UNIQUE constraints.
-- This causes multiple owners with NULL user_id to be allowed, breaking the assignment system.

-- ============================================================================
-- DROP BROKEN CONSTRAINT
-- ============================================================================
ALTER TABLE roadmap_owner_assignments
  DROP CONSTRAINT IF EXISTS unique_roadmap_user_assignment;

-- ============================================================================
-- ADD NEW UNIQUE INDEX THAT HANDLES NULL user_id
-- ============================================================================
-- Strategy: Use a UNIQUE INDEX with an expression to combine user_id (when present)
-- and user_name (when user_id is NULL). This ensures uniqueness properly.
CREATE UNIQUE INDEX idx_unique_roadmap_user_or_name
  ON roadmap_owner_assignments (roadmap_item_id, COALESCE(user_id::TEXT, user_name));

-- ============================================================================
-- UPDATE RPC FUNCTIONS TO WORK WITH NEW CONSTRAINT
-- ============================================================================

-- Function: Assign owner to roadmap item (UPDATED)
CREATE OR REPLACE FUNCTION assign_roadmap_owner(
  p_org_id UUID,
  p_roadmap_id UUID,
  p_user_id UUID DEFAULT NULL,
  p_user_name TEXT DEFAULT NULL,
  p_user_email TEXT DEFAULT NULL,
  p_role VARCHAR DEFAULT 'contributor'
)
RETURNS TABLE (
  id UUID,
  user_name TEXT,
  role VARCHAR
) AS $$
DECLARE
  v_assigned_by_name TEXT;
BEGIN
  -- Get current user's name
  SELECT raw_user_meta_data->>'name' INTO v_assigned_by_name
  FROM auth.users
  WHERE id = auth.uid();

  -- If assigning a primary owner, demote any existing primary owner to contributor
  IF p_role = 'primary' THEN
    UPDATE roadmap_owner_assignments
    SET role = 'contributor', updated_at = NOW()
    WHERE roadmap_item_id = p_roadmap_id
      AND role = 'primary'
      AND (
        (p_org_id IS NOT NULL AND org_id = p_org_id) OR
        (p_org_id IS NULL AND org_id IS NULL)
      );
  END IF;

  -- Insert or update assignment
  -- ON CONFLICT now uses the new constraint based on COALESCE(user_id::TEXT, user_name)
  RETURN QUERY
  INSERT INTO roadmap_owner_assignments (
    org_id,
    roadmap_item_id,
    user_id,
    user_name,
    user_email,
    role,
    assigned_by,
    assigned_by_name
  )
  VALUES (
    p_org_id,
    p_roadmap_id,
    p_user_id,
    COALESCE(p_user_name, 'Unknown'), -- Ensure user_name is never NULL
    p_user_email,
    p_role,
    auth.uid(),
    v_assigned_by_name
  )
  ON CONFLICT (roadmap_item_id, COALESCE(user_id::TEXT, user_name))
  DO UPDATE SET
    role = p_role,
    user_name = COALESCE(p_user_name, roadmap_owner_assignments.user_name),
    user_email = COALESCE(p_user_email, roadmap_owner_assignments.user_email),
    updated_at = NOW()
  RETURNING
    roadmap_owner_assignments.id,
    roadmap_owner_assignments.user_name,
    roadmap_owner_assignments.role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- UPDATE remove_roadmap_owner TO HANDLE NULL org_id
-- ============================================================================
CREATE OR REPLACE FUNCTION remove_roadmap_owner(
  p_org_id UUID,
  p_roadmap_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  DELETE FROM roadmap_owner_assignments
  WHERE roadmap_item_id = p_roadmap_id
    AND (
      (p_user_id IS NOT NULL AND user_id = p_user_id) OR
      (p_user_id IS NULL AND user_id IS NULL)
    )
    AND (
      (p_org_id IS NOT NULL AND org_id = p_org_id) OR
      (p_org_id IS NULL AND org_id IS NULL)
    );

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- UPDATE change_roadmap_owner_role TO HANDLE NULL org_id
-- ============================================================================
CREATE OR REPLACE FUNCTION change_roadmap_owner_role(
  p_org_id UUID,
  p_roadmap_id UUID,
  p_user_id UUID,
  p_new_role VARCHAR
)
RETURNS BOOLEAN AS $$
BEGIN
  -- If promoting to primary, demote existing primary
  IF p_new_role = 'primary' THEN
    UPDATE roadmap_owner_assignments
    SET role = 'contributor', updated_at = NOW()
    WHERE roadmap_item_id = p_roadmap_id
      AND role = 'primary'
      AND (
        (p_org_id IS NOT NULL AND org_id = p_org_id) OR
        (p_org_id IS NULL AND org_id IS NULL)
      )
      AND (
        (p_user_id IS NOT NULL AND user_id != p_user_id) OR
        (p_user_id IS NULL AND user_id IS NOT NULL)
      );
  END IF;

  -- Update the role
  UPDATE roadmap_owner_assignments
  SET role = p_new_role, updated_at = NOW()
  WHERE roadmap_item_id = p_roadmap_id
    AND (
      (p_user_id IS NOT NULL AND user_id = p_user_id) OR
      (p_user_id IS NULL AND user_id IS NULL)
    )
    AND (
      (p_org_id IS NOT NULL AND org_id = p_org_id) OR
      (p_org_id IS NULL AND org_id IS NULL)
    );

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON INDEX idx_unique_roadmap_user_or_name IS
  'Ensures each roadmap item can have only one assignment per user (by user_id) or per user_name (when user_id is NULL). Uses COALESCE to handle NULL user_id values properly.';
