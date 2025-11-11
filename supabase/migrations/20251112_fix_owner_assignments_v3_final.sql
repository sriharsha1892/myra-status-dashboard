-- FINAL FIX: Roadmap Owner Assignments
-- Clean slate approach - drop and recreate everything correctly

-- ============================================================================
-- CLEANUP: Drop existing objects
-- ============================================================================
DROP FUNCTION IF EXISTS assign_roadmap_owner(UUID, UUID, UUID, TEXT, TEXT, VARCHAR);
DROP FUNCTION IF EXISTS remove_roadmap_owner(UUID, UUID, UUID);
DROP FUNCTION IF EXISTS change_roadmap_owner_role(UUID, UUID, UUID, VARCHAR);
DROP INDEX IF EXISTS idx_unique_roadmap_user_or_name;
ALTER TABLE roadmap_owner_assignments DROP CONSTRAINT IF EXISTS unique_roadmap_user_assignment;

-- ============================================================================
-- CREATE UNIQUE INDEX
-- ============================================================================
CREATE UNIQUE INDEX idx_unique_roadmap_user_or_name
  ON roadmap_owner_assignments (roadmap_item_id, COALESCE(user_id::TEXT, user_name));

-- ============================================================================
-- FUNCTION: assign_roadmap_owner
-- ============================================================================
CREATE OR REPLACE FUNCTION assign_roadmap_owner(
  p_org_id UUID,
  p_roadmap_id UUID,
  p_user_id UUID DEFAULT NULL,
  p_user_name TEXT DEFAULT NULL,
  p_user_email TEXT DEFAULT NULL,
  p_role VARCHAR DEFAULT 'contributor'
)
RETURNS TABLE (
  out_id UUID,
  out_user_name TEXT,
  out_role VARCHAR
) AS $$
DECLARE
  v_assigned_by_name TEXT;
  v_existing_id UUID;
BEGIN
  -- Get current user's name
  SELECT raw_user_meta_data->>'name' INTO v_assigned_by_name
  FROM auth.users
  WHERE auth.users.id = auth.uid();

  -- If assigning a primary owner, demote existing primary owners
  IF p_role = 'primary' THEN
    UPDATE roadmap_owner_assignments
    SET
      role = 'contributor',
      updated_at = NOW()
    WHERE roadmap_item_id = p_roadmap_id
      AND role = 'primary'
      AND (
        (p_org_id IS NOT NULL AND org_id = p_org_id) OR
        (p_org_id IS NULL AND org_id IS NULL)
      );
  END IF;

  -- Check if assignment already exists
  SELECT id INTO v_existing_id
  FROM roadmap_owner_assignments
  WHERE roadmap_item_id = p_roadmap_id
    AND COALESCE(user_id::TEXT, user_name) = COALESCE(p_user_id::TEXT, COALESCE(p_user_name, 'Unknown'));

  IF v_existing_id IS NOT NULL THEN
    -- Update existing
    RETURN QUERY
    UPDATE roadmap_owner_assignments
    SET
      role = p_role,
      user_name = COALESCE(p_user_name, roadmap_owner_assignments.user_name),
      user_email = COALESCE(p_user_email, roadmap_owner_assignments.user_email),
      updated_at = NOW()
    WHERE id = v_existing_id
    RETURNING id, user_name, role;
  ELSE
    -- Insert new
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
      COALESCE(p_user_name, 'Unknown'),
      p_user_email,
      p_role,
      auth.uid(),
      v_assigned_by_name
    )
    RETURNING id, user_name, role;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: remove_roadmap_owner
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
-- FUNCTION: change_roadmap_owner_role
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
    SET
      role = 'contributor',
      updated_at = NOW()
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
  SET
    role = p_new_role,
    updated_at = NOW()
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
  'Ensures each roadmap item can have only one assignment per user (by user_id) or per user_name (when user_id is NULL).';

COMMENT ON FUNCTION assign_roadmap_owner IS
  'Assigns an owner to a roadmap item. Handles both user_id and user_name based assignments. Returns out_id, out_user_name, out_role to avoid column ambiguity.';
