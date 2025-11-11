-- Migration: Link global roadmap items to multiple trial organizations
-- This enables many-to-many relationships between roadmap items and trial orgs

-- ============================================================================
-- CREATE JUNCTION TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS roadmap_org_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Links
  roadmap_item_id UUID NOT NULL REFERENCES org_product_roadmap(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES trial_organizations(org_id) ON DELETE CASCADE,

  -- Context
  link_type VARCHAR(50) NOT NULL DEFAULT 'interested',
  -- Options: 'interested', 'requested', 'evaluating', 'committed', 'using'
  notes TEXT,
  priority VARCHAR(20) DEFAULT 'medium',
  -- Options: 'low', 'medium', 'high', 'critical'

  -- Metadata
  linked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  linked_by_name TEXT,
  linked_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicates
  CONSTRAINT unique_roadmap_org_link UNIQUE(roadmap_item_id, org_id)
);

-- ============================================================================
-- CREATE INDEXES
-- ============================================================================

CREATE INDEX idx_roadmap_org_links_roadmap ON roadmap_org_links(roadmap_item_id);
CREATE INDEX idx_roadmap_org_links_org ON roadmap_org_links(org_id);
CREATE INDEX idx_roadmap_org_links_type ON roadmap_org_links(link_type);
CREATE INDEX idx_roadmap_org_links_priority ON roadmap_org_links(priority);

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE roadmap_org_links ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read, create, update, and delete
CREATE POLICY "Allow all for authenticated users" ON roadmap_org_links
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ============================================================================
-- CREATE TIMESTAMP TRIGGER
-- ============================================================================

CREATE TRIGGER roadmap_org_links_update_timestamp
  BEFORE UPDATE ON roadmap_org_links
  FOR EACH ROW
  EXECUTE FUNCTION update_roadmap_timestamp();

-- ============================================================================
-- HELPER FUNCTION: Link org to roadmap item
-- ============================================================================

CREATE OR REPLACE FUNCTION link_org_to_roadmap(
  p_roadmap_id UUID,
  p_org_id UUID,
  p_link_type VARCHAR DEFAULT 'interested',
  p_notes TEXT DEFAULT NULL,
  p_priority VARCHAR DEFAULT 'medium'
)
RETURNS TABLE (
  id UUID,
  created BOOLEAN
) AS $$
DECLARE
  v_linked_by_name TEXT;
  v_existing_id UUID;
BEGIN
  -- Get current user's name
  SELECT raw_user_meta_data->>'name' INTO v_linked_by_name
  FROM auth.users WHERE id = auth.uid();

  -- Check if link already exists
  SELECT roadmap_org_links.id INTO v_existing_id
  FROM roadmap_org_links
  WHERE roadmap_item_id = p_roadmap_id AND org_id = p_org_id;

  IF v_existing_id IS NOT NULL THEN
    -- Update existing link
    UPDATE roadmap_org_links
    SET link_type = p_link_type,
        notes = p_notes,
        priority = p_priority,
        updated_at = NOW()
    WHERE roadmap_org_links.id = v_existing_id;

    RETURN QUERY SELECT v_existing_id, false;
  ELSE
    -- Insert new link
    RETURN QUERY
    INSERT INTO roadmap_org_links (
      roadmap_item_id, org_id, link_type, notes, priority,
      linked_by, linked_by_name
    )
    VALUES (
      p_roadmap_id, p_org_id, p_link_type, p_notes, p_priority,
      auth.uid(), v_linked_by_name
    )
    RETURNING roadmap_org_links.id, true;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- HELPER FUNCTION: Unlink org from roadmap item
-- ============================================================================

CREATE OR REPLACE FUNCTION unlink_org_from_roadmap(
  p_roadmap_id UUID,
  p_org_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  DELETE FROM roadmap_org_links
  WHERE roadmap_item_id = p_roadmap_id AND org_id = p_org_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- VIEW: Roadmap items with linked org counts and details
-- ============================================================================

CREATE OR REPLACE VIEW roadmap_items_with_org_links AS
SELECT
  r.*,
  COUNT(DISTINCT rol.org_id) as linked_org_count,
  jsonb_agg(
    DISTINCT jsonb_build_object(
      'org_id', rol.org_id,
      'org_name', t.org_name,
      'domain', t.domain,
      'link_type', rol.link_type,
      'priority', rol.priority,
      'notes', rol.notes,
      'linked_at', rol.linked_at,
      'linked_by_name', rol.linked_by_name
    ) ORDER BY (jsonb_build_object(
      'org_id', rol.org_id,
      'org_name', t.org_name,
      'domain', t.domain,
      'link_type', rol.link_type,
      'priority', rol.priority,
      'notes', rol.notes,
      'linked_at', rol.linked_at,
      'linked_by_name', rol.linked_by_name
    ))
  ) FILTER (WHERE rol.org_id IS NOT NULL) as linked_orgs
FROM org_product_roadmap r
LEFT JOIN roadmap_org_links rol ON r.id = rol.roadmap_item_id
LEFT JOIN trial_organizations t ON rol.org_id = t.org_id
GROUP BY r.id;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON roadmap_items_with_org_links TO authenticated;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT 'Migration 20251112_roadmap_org_links completed successfully' AS status;
