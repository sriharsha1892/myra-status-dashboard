-- Fix roadmap_owner_assignments UNIQUE constraint to handle NULL user_id
-- VERSION 2: Fixed ON CONFLICT handling with expression-based index

-- ============================================================================
-- DROP EXISTING INDEX IF IT EXISTS
-- ============================================================================
DROP INDEX IF EXISTS idx_unique_roadmap_user_or_name;

-- ============================================================================
-- DROP BROKEN CONSTRAINT IF IT EXISTS
-- ============================================================================
ALTER TABLE roadmap_owner_assignments
  DROP CONSTRAINT IF EXISTS unique_roadmap_user_assignment;

-- ============================================================================
-- ADD NEW UNIQUE INDEX THAT HANDLES NULL user_id
-- ============================================================================
CREATE UNIQUE INDEX idx_unique_roadmap_user_or_name
  ON roadmap_owner_assignments (roadmap_item_id, COALESCE(user_id::TEXT, user_name));

-- ============================================================================
-- UPDATE RPC FUNCTION: assign_roadmap_owner
-- ============================================================================
-- Since we can't use ON CONFLICT with expression-based index,
-- we'll manually check for existing assignment and update/insert accordingly

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
  v_existing_id UUID;
BEGIN
  -- Get current user's name
  SELECT raw_user_meta_data->>'name' INTO v_assigned_by_name
  FROM auth.users
  WHERE auth.users.id = auth.uid();

  -- If assigning a primary owner, demote any existing primary owner to contributor
  IF p_role = 'primary' THEN
    UPDATE roadmap_owner_assignments
    SET role = 'contributor', updated_at = NOW()
    WHERE roadmap_owner_assignments.roadmap_item_id = p_roadmap_id
      AND roadmap_owner_assignments.role = 'primary'
      AND (
        (p_org_id IS NOT NULL AND roadmap_owner_assignments.org_id = p_org_id) OR
        (p_org_id IS NULL AND roadmap_owner_assignments.org_id IS NULL)
      );
  END IF;

  -- Check if this assignment already exists
  SELECT roadmap_owner_assignments.id INTO v_existing_id
  FROM roadmap_owner_assignments
  WHERE roadmap_owner_assignments.roadmap_item_id = p_roadmap_id
    AND COALESCE(roadmap_owner_assignments.user_id::TEXT, roadmap_owner_assignments.user_name) = COALESCE(p_user_id::TEXT, COALESCE(p_user_name, 'Unknown'));

  IF v_existing_id IS NOT NULL THEN
    -- Update existing assignment
    RETURN QUERY
    UPDATE roadmap_owner_assignments roa
    SET
      role = p_role,
      user_name = COALESCE(p_user_name, roa.user_name),
      user_email = COALESCE(p_user_email, roa.user_email),
      updated_at = NOW()
    WHERE roa.id = v_existing_id
    RETURNING
      roa.id,
      roa.user_name,
      roa.role;
  ELSE
    -- Insert new assignment
    RETURN QUERY
    INSERT INTO roadmap_owner_assignments AS roa (
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
      COALESCE(p_user_name, 'Unknown'),
      p_user_email,
      p_role,
      auth.uid(),
      v_assigned_by_name
    )
    RETURNING
      roa.id,
      roa.user_name,
      roa.role;
  END IF;
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
