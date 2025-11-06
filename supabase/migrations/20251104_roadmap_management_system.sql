-- Enhanced Roadmap Management System
-- Adds forwarding, notes, ownership, and dependencies tracking

-- ============================================================================
-- UPDATE org_product_roadmap TABLE - Add ownership & tracking fields
-- ============================================================================
ALTER TABLE org_product_roadmap ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE org_product_roadmap ADD COLUMN IF NOT EXISTS owner_name TEXT; -- Denormalized for easier display
ALTER TABLE org_product_roadmap ADD COLUMN IF NOT EXISTS progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100);
ALTER TABLE org_product_roadmap ADD COLUMN IF NOT EXISTS external_blocker TEXT; -- e.g., "waiting on vendor response", "awaiting customer decision"
ALTER TABLE org_product_roadmap ADD COLUMN IF NOT EXISTS milestone_id UUID; -- For grouping related items

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_org_roadmap_owner_id ON org_product_roadmap(owner_id);
CREATE INDEX IF NOT EXISTS idx_org_roadmap_milestone_id ON org_product_roadmap(milestone_id);
CREATE INDEX IF NOT EXISTS idx_org_roadmap_progress ON org_product_roadmap(progress_percentage);

-- ============================================================================
-- ROADMAP MILESTONES TABLE - Group related roadmap items
-- ============================================================================
CREATE TABLE IF NOT EXISTS roadmap_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES trial_organizations(org_id) ON DELETE CASCADE,

  -- Milestone Info
  title TEXT NOT NULL,
  description TEXT,
  target_date DATE,
  status VARCHAR(50) NOT NULL DEFAULT 'planned', -- planned, in_progress, completed, cancelled

  -- Metadata
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE roadmap_milestones ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_milestones_org_id ON roadmap_milestones(org_id);
CREATE INDEX idx_milestones_target_date ON roadmap_milestones(target_date);

CREATE POLICY "Allow all for now on roadmap_milestones" ON roadmap_milestones FOR ALL USING (true) WITH CHECK (true);

-- Add FK constraint from roadmap items to milestones
ALTER TABLE org_product_roadmap ADD CONSTRAINT fk_milestone FOREIGN KEY (milestone_id) REFERENCES roadmap_milestones(id) ON DELETE SET NULL;

-- ============================================================================
-- ROADMAP FORWARDS TABLE - Track feature requests forwarded to roadmap items
-- ============================================================================
CREATE TABLE IF NOT EXISTS roadmap_forwards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES trial_organizations(org_id) ON DELETE CASCADE,

  -- Links
  feature_request_id UUID NOT NULL REFERENCES feature_requests(id) ON DELETE CASCADE,
  roadmap_item_id UUID NOT NULL REFERENCES org_product_roadmap(id) ON DELETE CASCADE,

  -- Forwarding Details
  forwarded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  forwarded_by_name TEXT, -- Denormalized
  forwarded_to_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  forwarded_to_name TEXT, -- Denormalized (admin/product person)

  -- Context
  urgency VARCHAR(20) NOT NULL DEFAULT 'medium', -- low, medium, high, critical
  context_notes TEXT NOT NULL, -- Why this feature matters for the roadmap item
  customer_impact TEXT, -- How this affects the customer

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'forwarded', -- forwarded, acknowledged, in_progress, resolved, dismissed
  acknowledged_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_forward UNIQUE(feature_request_id, roadmap_item_id)
);

ALTER TABLE roadmap_forwards ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_forwards_org_id ON roadmap_forwards(org_id);
CREATE INDEX idx_forwards_feature_id ON roadmap_forwards(feature_request_id);
CREATE INDEX idx_forwards_roadmap_id ON roadmap_forwards(roadmap_item_id);
CREATE INDEX idx_forwards_forwarded_to ON roadmap_forwards(forwarded_to_user_id);
CREATE INDEX idx_forwards_status ON roadmap_forwards(status);
CREATE INDEX idx_forwards_created_at ON roadmap_forwards(created_at DESC);

CREATE POLICY "Allow all for now on roadmap_forwards" ON roadmap_forwards FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- ROADMAP NOTES TABLE - Internal discussion/notes on roadmap items
-- ============================================================================
CREATE TABLE IF NOT EXISTS roadmap_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES trial_organizations(org_id) ON DELETE CASCADE,
  roadmap_item_id UUID NOT NULL REFERENCES org_product_roadmap(id) ON DELETE CASCADE,

  -- Note Content
  content TEXT NOT NULL,
  note_type VARCHAR(50) NOT NULL DEFAULT 'comment', -- comment, update, blocker, decision

  -- Author
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name TEXT,

  -- Mentions/Assignments
  mentioned_users TEXT[], -- Array of user IDs for @mentions

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE roadmap_notes ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_notes_org_id ON roadmap_notes(org_id);
CREATE INDEX idx_notes_roadmap_id ON roadmap_notes(roadmap_item_id);
CREATE INDEX idx_notes_author_id ON roadmap_notes(author_id);
CREATE INDEX idx_notes_type ON roadmap_notes(note_type);

CREATE POLICY "Allow all for now on roadmap_notes" ON roadmap_notes FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- ROADMAP DEPENDENCIES TABLE - Track blocking relationships
-- ============================================================================
CREATE TABLE IF NOT EXISTS roadmap_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES trial_organizations(org_id) ON DELETE CASCADE,

  -- Dependency relationship
  depends_on_id UUID NOT NULL REFERENCES org_product_roadmap(id) ON DELETE CASCADE,
  blocks_id UUID NOT NULL REFERENCES org_product_roadmap(id) ON DELETE CASCADE,

  -- Type
  dependency_type VARCHAR(50) NOT NULL DEFAULT 'blocks', -- blocks, blocked_by, related_to, depends_on

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_dependency UNIQUE(depends_on_id, blocks_id)
);

ALTER TABLE roadmap_dependencies ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_dependencies_depends_on ON roadmap_dependencies(depends_on_id);
CREATE INDEX idx_dependencies_blocks ON roadmap_dependencies(blocks_id);

CREATE POLICY "Allow all for now on roadmap_dependencies" ON roadmap_dependencies FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- TRIGGER: Update timestamps
-- ============================================================================
CREATE OR REPLACE FUNCTION update_roadmap_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER roadmap_milestones_update_timestamp BEFORE UPDATE ON roadmap_milestones FOR EACH ROW EXECUTE FUNCTION update_roadmap_timestamp();
CREATE TRIGGER roadmap_forwards_update_timestamp BEFORE UPDATE ON roadmap_forwards FOR EACH ROW EXECUTE FUNCTION update_roadmap_timestamp();
CREATE TRIGGER roadmap_notes_update_timestamp BEFORE UPDATE ON roadmap_notes FOR EACH ROW EXECUTE FUNCTION update_roadmap_timestamp();

-- ============================================================================
-- VIEW: Roadmap with all enriched data
-- ============================================================================
CREATE OR REPLACE VIEW roadmap_items_detailed AS
SELECT
  orm.id,
  orm.org_id,
  orm.title,
  orm.description,
  orm.status,
  orm.priority,
  orm.target_date,
  orm.estimated_completion_date,
  orm.owner_name,
  orm.progress_percentage,
  orm.external_blocker,
  orm.created_at,
  orm.updated_at,
  COUNT(DISTINCT frl.feature_id) as linked_feature_count,
  COUNT(DISTINCT rf.feature_request_id) as forwarded_feature_count,
  COUNT(DISTINCT rn.id) as notes_count,
  COUNT(DISTINCT rd1.blocks_id) as blocks_count,
  COUNT(DISTINCT rd2.depends_on_id) as blocked_by_count
FROM org_product_roadmap orm
LEFT JOIN feature_roadmap_links frl ON orm.id = frl.roadmap_id
LEFT JOIN roadmap_forwards rf ON orm.id = rf.roadmap_item_id
LEFT JOIN roadmap_notes rn ON orm.id = rn.roadmap_item_id
LEFT JOIN roadmap_dependencies rd1 ON orm.id = rd1.depends_on_id
LEFT JOIN roadmap_dependencies rd2 ON orm.id = rd2.blocks_id
GROUP BY orm.id, orm.org_id, orm.title, orm.description, orm.status, orm.priority,
         orm.target_date, orm.estimated_completion_date, orm.owner_name, orm.progress_percentage,
         orm.external_blocker, orm.created_at, orm.updated_at;

-- ============================================================================
-- FUNCTION: Forward feature request to roadmap item
-- ============================================================================
CREATE OR REPLACE FUNCTION forward_feature_to_roadmap(
  p_org_id UUID,
  p_feature_id UUID,
  p_roadmap_id UUID,
  p_forwarded_to_user_id UUID,
  p_context_notes TEXT,
  p_customer_impact TEXT DEFAULT NULL,
  p_urgency VARCHAR DEFAULT 'medium'
)
RETURNS TABLE (
  id UUID,
  status VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
  v_feature_title VARCHAR;
  v_roadmap_title VARCHAR;
  v_forwarded_by_name VARCHAR;
BEGIN
  -- Get titles for notification context
  SELECT title INTO v_feature_title FROM feature_requests WHERE id = p_feature_id;
  SELECT title INTO v_roadmap_title FROM org_product_roadmap WHERE id = p_roadmap_id;
  SELECT raw_user_meta_data->>'name' INTO v_forwarded_by_name FROM auth.users WHERE id = auth.uid();

  -- Insert forward record
  RETURN QUERY
  INSERT INTO roadmap_forwards (
    org_id,
    feature_request_id,
    roadmap_item_id,
    forwarded_by,
    forwarded_by_name,
    forwarded_to_user_id,
    context_notes,
    customer_impact,
    urgency
  )
  VALUES (
    p_org_id,
    p_feature_id,
    p_roadmap_id,
    auth.uid(),
    v_forwarded_by_name,
    p_forwarded_to_user_id,
    p_context_notes,
    p_customer_impact,
    p_urgency
  )
  ON CONFLICT (feature_request_id, roadmap_item_id) DO UPDATE
  SET
    context_notes = p_context_notes,
    customer_impact = p_customer_impact,
    urgency = p_urgency,
    updated_at = NOW()
  RETURNING roadmap_forwards.id, roadmap_forwards.status, roadmap_forwards.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: Add note to roadmap item
-- ============================================================================
CREATE OR REPLACE FUNCTION add_roadmap_note(
  p_org_id UUID,
  p_roadmap_id UUID,
  p_content TEXT,
  p_note_type VARCHAR DEFAULT 'comment',
  p_mentioned_users TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  created_at TIMESTAMP WITH TIME ZONE,
  author_name VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  INSERT INTO roadmap_notes (
    org_id,
    roadmap_item_id,
    content,
    note_type,
    author_id,
    author_name,
    mentioned_users
  )
  VALUES (
    p_org_id,
    p_roadmap_id,
    p_content,
    p_note_type,
    auth.uid(),
    (SELECT raw_user_meta_data->>'name' FROM auth.users WHERE id = auth.uid()),
    p_mentioned_users
  )
  RETURNING roadmap_notes.id, roadmap_notes.created_at, roadmap_notes.author_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
