-- Roadmap Owner Assignments System
-- Supports multiple owners with roles (primary, contributor, reviewer)

-- ============================================================================
-- ROADMAP OWNER ASSIGNMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS roadmap_owner_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES trial_organizations(org_id) ON DELETE CASCADE,
  roadmap_item_id UUID NOT NULL REFERENCES org_product_roadmap(id) ON DELETE CASCADE,

  -- Owner Details
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL, -- Denormalized for easy display
  user_email TEXT, -- Optional, for reference

  -- Role: primary (main responsible person), contributor (co-owner), reviewer (oversight)
  role VARCHAR(50) NOT NULL DEFAULT 'contributor' CHECK (role IN ('primary', 'contributor', 'reviewer')),

  -- Metadata
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_by_name TEXT,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_roadmap_user_assignment UNIQUE(roadmap_item_id, user_id)
);

-- Enable RLS
ALTER TABLE roadmap_owner_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow all for authenticated users"
  ON roadmap_owner_assignments
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_owner_assignments_roadmap_id ON roadmap_owner_assignments(roadmap_item_id);
CREATE INDEX IF NOT EXISTS idx_owner_assignments_user_id ON roadmap_owner_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_owner_assignments_org_id ON roadmap_owner_assignments(org_id);
CREATE INDEX IF NOT EXISTS idx_owner_assignments_role ON roadmap_owner_assignments(role);

-- Update timestamp trigger
CREATE TRIGGER roadmap_owner_assignments_update_timestamp
  BEFORE UPDATE ON roadmap_owner_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_roadmap_timestamp();

-- ============================================================================
-- HELPER VIEW: Get roadmap items with owner details
-- ============================================================================
CREATE OR REPLACE VIEW roadmap_items_with_owners AS
SELECT
  r.id,
  r.org_id,
  r.title,
  r.description,
  r.status,
  r.priority,
  r.target_date,
  r.progress_percentage,
  r.created_at,
  r.updated_at,
  -- Primary owner
  (
    SELECT jsonb_build_object(
      'user_id', oa.user_id,
      'user_name', oa.user_name,
      'user_email', oa.user_email
    )
    FROM roadmap_owner_assignments oa
    WHERE oa.roadmap_item_id = r.id AND oa.role = 'primary'
    LIMIT 1
  ) as primary_owner,
  -- All owners array
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', oa.id,
        'user_id', oa.user_id,
        'user_name', oa.user_name,
        'user_email', oa.user_email,
        'role', oa.role
      ) ORDER BY
        CASE oa.role
          WHEN 'primary' THEN 1
          WHEN 'contributor' THEN 2
          WHEN 'reviewer' THEN 3
        END
    )
    FROM roadmap_owner_assignments oa
    WHERE oa.roadmap_item_id = r.id
  ) as all_owners,
  -- Owner count
  (
    SELECT COUNT(*)
    FROM roadmap_owner_assignments oa
    WHERE oa.roadmap_item_id = r.id
  ) as owner_count
FROM org_product_roadmap r;

-- ============================================================================
-- FUNCTION: Assign owner to roadmap item
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
      AND org_id = p_org_id;
  END IF;

  -- Insert or update assignment
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
    p_user_name,
    p_user_email,
    p_role,
    auth.uid(),
    v_assigned_by_name
  )
  ON CONFLICT (roadmap_item_id, user_id)
  DO UPDATE SET
    role = p_role,
    user_name = p_user_name,
    user_email = COALESCE(p_user_email, roadmap_owner_assignments.user_email),
    updated_at = NOW()
  RETURNING
    roadmap_owner_assignments.id,
    roadmap_owner_assignments.user_name,
    roadmap_owner_assignments.role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: Remove owner from roadmap item
-- ============================================================================
CREATE OR REPLACE FUNCTION remove_roadmap_owner(
  p_org_id UUID,
  p_roadmap_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  DELETE FROM roadmap_owner_assignments
  WHERE org_id = p_org_id
    AND roadmap_item_id = p_roadmap_id
    AND user_id = p_user_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: Change owner role
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
      AND org_id = p_org_id
      AND user_id != p_user_id;
  END IF;

  -- Update the role
  UPDATE roadmap_owner_assignments
  SET role = p_new_role, updated_at = NOW()
  WHERE org_id = p_org_id
    AND roadmap_item_id = p_roadmap_id
    AND user_id = p_user_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- MIGRATION: Migrate existing owner_name data to assignments
-- ============================================================================
DO $$
DECLARE
  roadmap_rec RECORD;
BEGIN
  FOR roadmap_rec IN
    SELECT id, org_id, owner_name
    FROM org_product_roadmap
    WHERE owner_name IS NOT NULL AND owner_name != ''
  LOOP
    -- Insert as primary owner
    INSERT INTO roadmap_owner_assignments (
      org_id,
      roadmap_item_id,
      user_name,
      role
    )
    VALUES (
      roadmap_rec.org_id,
      roadmap_rec.id,
      roadmap_rec.owner_name,
      'primary'
    )
    ON CONFLICT (roadmap_item_id, user_id) DO NOTHING;
  END LOOP;
END $$;

-- Note: We keep the owner_name column for backward compatibility
-- but the roadmap_owner_assignments table is now the source of truth
