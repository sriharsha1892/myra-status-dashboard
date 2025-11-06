-- Create junction table for Feature Requests ↔ Product Roadmap linking
-- NOTE: This assumes feature_requests and org_product_roadmap tables exist
-- If you get "relation does not exist" error, apply 20250103_roadmap_features_followup.sql first
CREATE TABLE IF NOT EXISTS feature_roadmap_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  feature_id UUID NOT NULL,
  roadmap_id UUID NOT NULL,

  -- Link metadata
  link_type VARCHAR(50) NOT NULL DEFAULT 'implements', -- 'implements', 'addresses', 'related_to', 'blocks', 'blocked_by'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Constraints
  CONSTRAINT unique_link UNIQUE(feature_id, roadmap_id),
  CONSTRAINT valid_link_type CHECK (link_type IN ('implements', 'addresses', 'related_to', 'blocks', 'blocked_by'))
);

-- Add foreign key constraints if tables exist
-- Note: We reference only the id columns (which are PKs) rather than (id, org_id)
-- because the id is globally unique and is the primary key
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'feature_requests'
  ) THEN
    ALTER TABLE feature_roadmap_links
    ADD CONSTRAINT fk_feature FOREIGN KEY (feature_id)
    REFERENCES feature_requests(id) ON DELETE CASCADE;
  END IF;

  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'org_product_roadmap'
  ) THEN
    ALTER TABLE feature_roadmap_links
    ADD CONSTRAINT fk_roadmap FOREIGN KEY (roadmap_id)
    REFERENCES org_product_roadmap(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create indexes for optimal query performance
CREATE INDEX idx_feature_roadmap_links_org_id ON feature_roadmap_links(org_id);
CREATE INDEX idx_feature_roadmap_links_feature_id ON feature_roadmap_links(feature_id);
CREATE INDEX idx_feature_roadmap_links_roadmap_id ON feature_roadmap_links(roadmap_id);
CREATE INDEX idx_feature_roadmap_links_link_type ON feature_roadmap_links(link_type);
CREATE INDEX idx_feature_roadmap_links_created_at ON feature_roadmap_links(created_at DESC);

-- Enable RLS on the junction table
ALTER TABLE feature_roadmap_links ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Team/Admin users can view all links for their organization
CREATE POLICY "Team users can view feature_roadmap_links"
  ON feature_roadmap_links
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
      AND u.raw_user_meta_data->>'role' IN ('team', 'admin')
    )
  );

-- RLS Policy: Team/Admin users can insert links
CREATE POLICY "Team users can create feature_roadmap_links"
  ON feature_roadmap_links
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
      AND u.raw_user_meta_data->>'role' IN ('team', 'admin')
    )
  );

-- RLS Policy: Team/Admin users can update links
CREATE POLICY "Team users can update feature_roadmap_links"
  ON feature_roadmap_links
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
      AND u.raw_user_meta_data->>'role' IN ('team', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
      AND u.raw_user_meta_data->>'role' IN ('team', 'admin')
    )
  );

-- RLS Policy: Team/Admin users can delete links
CREATE POLICY "Team users can delete feature_roadmap_links"
  ON feature_roadmap_links
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
      AND u.raw_user_meta_data->>'role' IN ('team', 'admin')
    )
  );

-- Create view to get feature details with roadmap count
CREATE OR REPLACE VIEW feature_requests_with_roadmap_count AS
SELECT
  fr.id,
  fr.org_id,
  fr.title,
  fr.status,
  fr.priority,
  fr.votes,
  fr.product_response,
  fr.expected_availability_date,
  fr.created_at,
  COUNT(frl.id) as linked_roadmap_count,
  STRING_AGG(DISTINCT orm.title, ', ' ORDER BY orm.title) as linked_roadmap_items
FROM feature_requests fr
LEFT JOIN feature_roadmap_links frl ON fr.id = frl.feature_id
LEFT JOIN org_product_roadmap orm ON frl.roadmap_id = orm.id
GROUP BY fr.id, fr.org_id, fr.title, fr.status, fr.priority, fr.votes,
         fr.product_response, fr.expected_availability_date, fr.created_at;

-- Create view to get roadmap details with feature count
CREATE OR REPLACE VIEW org_product_roadmap_with_feature_count AS
SELECT
  orm.id,
  orm.org_id,
  orm.title,
  orm.description,
  orm.status,
  orm.priority,
  orm.target_date,
  orm.estimated_completion_date,
  orm.created_by,
  orm.created_at,
  COUNT(frl.id) as linked_feature_count,
  STRING_AGG(DISTINCT fr.title, ', ' ORDER BY fr.title) as linked_features,
  STRING_AGG(DISTINCT frl.link_type, ', ') as link_types
FROM org_product_roadmap orm
LEFT JOIN feature_roadmap_links frl ON orm.id = frl.roadmap_id AND orm.org_id = frl.org_id
LEFT JOIN feature_requests fr ON frl.feature_id = fr.id AND frl.org_id = fr.org_id
GROUP BY orm.id, orm.org_id, orm.title, orm.description, orm.status, orm.priority,
         orm.target_date, orm.estimated_completion_date, orm.created_by, orm.created_at;

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_feature_roadmap_links_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER feature_roadmap_links_update_timestamp
BEFORE UPDATE ON feature_roadmap_links
FOR EACH ROW
EXECUTE FUNCTION update_feature_roadmap_links_timestamp();

-- Create function to link feature to roadmap with validation
CREATE OR REPLACE FUNCTION link_feature_to_roadmap(
  p_org_id UUID,
  p_feature_id UUID,
  p_roadmap_id UUID,
  p_link_type VARCHAR,
  p_notes TEXT DEFAULT NULL
)
RETURNS SETOF feature_roadmap_links AS $$
DECLARE
  v_feature_status VARCHAR;
  v_roadmap_status VARCHAR;
BEGIN
  -- Validate feature exists and belongs to org
  SELECT status INTO v_feature_status
  FROM feature_requests
  WHERE id = p_feature_id AND org_id = p_org_id;

  IF v_feature_status IS NULL THEN
    RAISE EXCEPTION 'Feature not found for organization';
  END IF;

  -- Validate feature status is linkable (planned, in_progress, completed, under_consideration)
  IF v_feature_status NOT IN ('planned', 'in_progress', 'completed', 'under_consideration') THEN
    RAISE EXCEPTION 'Feature with status % cannot be linked to roadmap', v_feature_status;
  END IF;

  -- Validate roadmap exists and belongs to org
  SELECT status INTO v_roadmap_status
  FROM org_product_roadmap
  WHERE id = p_roadmap_id AND org_id = p_org_id;

  IF v_roadmap_status IS NULL THEN
    RAISE EXCEPTION 'Roadmap item not found for organization';
  END IF;

  -- Insert the link
  RETURN QUERY
  INSERT INTO feature_roadmap_links (
    org_id,
    feature_id,
    roadmap_id,
    link_type,
    notes,
    created_by,
    updated_by
  )
  VALUES (
    p_org_id,
    p_feature_id,
    p_roadmap_id,
    p_link_type,
    p_notes,
    auth.uid(),
    auth.uid()
  )
  ON CONFLICT (feature_id, roadmap_id) DO UPDATE
  SET
    link_type = p_link_type,
    notes = p_notes,
    updated_by = auth.uid(),
    updated_at = NOW()
  RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to unlink feature from roadmap
CREATE OR REPLACE FUNCTION unlink_feature_from_roadmap(
  p_org_id UUID,
  p_feature_id UUID,
  p_roadmap_id UUID
)
RETURNS void AS $$
BEGIN
  DELETE FROM feature_roadmap_links
  WHERE org_id = p_org_id
    AND feature_id = p_feature_id
    AND roadmap_id = p_roadmap_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get features for a roadmap item
CREATE OR REPLACE FUNCTION get_linked_features(
  p_org_id UUID,
  p_roadmap_id UUID
)
RETURNS TABLE (
  id UUID,
  title VARCHAR,
  status VARCHAR,
  priority VARCHAR,
  votes INT,
  link_type VARCHAR,
  notes TEXT,
  created_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    fr.id,
    fr.title,
    fr.status,
    fr.priority,
    fr.votes,
    frl.link_type,
    frl.notes,
    frl.created_at
  FROM feature_requests fr
  INNER JOIN feature_roadmap_links frl ON fr.id = frl.feature_id
  WHERE frl.org_id = p_org_id
    AND frl.roadmap_id = p_roadmap_id
  ORDER BY fr.votes DESC, fr.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Create function to get roadmap items for a feature
CREATE OR REPLACE FUNCTION get_linked_roadmap_items(
  p_org_id UUID,
  p_feature_id UUID
)
RETURNS TABLE (
  id UUID,
  title VARCHAR,
  status VARCHAR,
  priority VARCHAR,
  target_date DATE,
  link_type VARCHAR,
  notes TEXT,
  created_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    orm.id,
    orm.title,
    orm.status,
    orm.priority,
    orm.target_date,
    frl.link_type,
    frl.notes,
    frl.created_at
  FROM org_product_roadmap orm
  INNER JOIN feature_roadmap_links frl ON orm.id = frl.roadmap_id
  WHERE frl.org_id = p_org_id
    AND frl.feature_id = p_feature_id
  ORDER BY orm.target_date ASC, orm.created_at DESC;
END;
$$ LANGUAGE plpgsql;
