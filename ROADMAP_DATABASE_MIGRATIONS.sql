-- Roadmap Feature Database Migrations
-- Run these in Supabase SQL Editor

-- ============================================
-- LABELS/TAGS SYSTEM
-- ============================================

-- Create labels table
CREATE TABLE IF NOT EXISTS roadmap_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3B82F6', -- Hex color code
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, name)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_roadmap_labels_org_id ON roadmap_labels(org_id);

-- Add labels array column to org_product_roadmap
ALTER TABLE org_product_roadmap
ADD COLUMN IF NOT EXISTS label_ids UUID[] DEFAULT NULL;

-- Create index for label filtering
CREATE INDEX IF NOT EXISTS idx_org_product_roadmap_labels
ON org_product_roadmap USING GIN (label_ids);

-- ============================================
-- MILESTONES/RELEASES SYSTEM
-- ============================================

-- Create milestones table
CREATE TABLE IF NOT EXISTS roadmap_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  target_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  color TEXT NOT NULL DEFAULT '#8B5CF6', -- Hex color code
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_roadmap_milestones_org_id ON roadmap_milestones(org_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_milestones_status ON roadmap_milestones(status);

-- Add milestone_id column to org_product_roadmap
ALTER TABLE org_product_roadmap
ADD COLUMN IF NOT EXISTS milestone_id UUID REFERENCES roadmap_milestones(id) ON DELETE SET NULL;

-- Create index for milestone filtering
CREATE INDEX IF NOT EXISTS idx_org_product_roadmap_milestone
ON org_product_roadmap(milestone_id);

-- ============================================
-- EXISTING DEPENDENCIES (from previous migration)
-- ============================================

-- Add dependency tracking columns (if not already added)
ALTER TABLE org_product_roadmap
ADD COLUMN IF NOT EXISTS blocked_by_ids TEXT[] DEFAULT NULL;

ALTER TABLE org_product_roadmap
ADD COLUMN IF NOT EXISTS blocks_ids TEXT[] DEFAULT NULL;

-- Add indexes for dependencies
CREATE INDEX IF NOT EXISTS idx_org_product_roadmap_blocked_by
ON org_product_roadmap USING GIN (blocked_by_ids);

CREATE INDEX IF NOT EXISTS idx_org_product_roadmap_blocks
ON org_product_roadmap USING GIN (blocks_ids);

-- ============================================
-- HELPER VIEWS
-- ============================================

-- View for milestone progress
CREATE OR REPLACE VIEW roadmap_milestone_progress AS
SELECT
  m.id as milestone_id,
  m.org_id,
  m.name,
  m.target_date,
  m.status,
  COUNT(r.id) as total_items,
  COUNT(r.id) FILTER (WHERE r.status = 'completed') as completed_items,
  COUNT(r.id) FILTER (WHERE r.status = 'in_progress') as in_progress_items,
  COUNT(r.id) FILTER (WHERE r.status = 'planned') as planned_items,
  CASE
    WHEN COUNT(r.id) > 0
    THEN ROUND((COUNT(r.id) FILTER (WHERE r.status = 'completed')::NUMERIC / COUNT(r.id)::NUMERIC) * 100, 1)
    ELSE 0
  END as completion_percentage
FROM roadmap_milestones m
LEFT JOIN org_product_roadmap r ON r.milestone_id = m.id
GROUP BY m.id, m.org_id, m.name, m.target_date, m.status;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on new tables
ALTER TABLE roadmap_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE roadmap_milestones ENABLE ROW LEVEL SECURITY;

-- Labels policies (adjust based on your auth system)
CREATE POLICY "Users can view labels for their org" ON roadmap_labels
  FOR SELECT USING (true);

CREATE POLICY "Users can create labels for their org" ON roadmap_labels
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update labels for their org" ON roadmap_labels
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete labels for their org" ON roadmap_labels
  FOR DELETE USING (true);

-- Milestones policies
CREATE POLICY "Users can view milestones for their org" ON roadmap_milestones
  FOR SELECT USING (true);

CREATE POLICY "Users can create milestones for their org" ON roadmap_milestones
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update milestones for their org" ON roadmap_milestones
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete milestones for their org" ON roadmap_milestones
  FOR DELETE USING (true);

-- ============================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================

-- Uncomment to insert sample labels
/*
INSERT INTO roadmap_labels (org_id, name, color, description) VALUES
  ((SELECT id FROM organizations LIMIT 1), 'Frontend', '#3B82F6', 'Frontend development tasks'),
  ((SELECT id FROM organizations LIMIT 1), 'Backend', '#10B981', 'Backend development tasks'),
  ((SELECT id FROM organizations LIMIT 1), 'API', '#F59E0B', 'API related work'),
  ((SELECT id FROM organizations LIMIT 1), 'UX', '#EC4899', 'User experience improvements'),
  ((SELECT id FROM organizations LIMIT 1), 'Mobile', '#8B5CF6', 'Mobile platform work');
*/

-- Uncomment to insert sample milestones
/*
INSERT INTO roadmap_milestones (org_id, name, description, target_date, status) VALUES
  ((SELECT id FROM organizations LIMIT 1), 'Q1 2025', 'First quarter goals', '2025-03-31', 'active'),
  ((SELECT id FROM organizations LIMIT 1), 'v2.0 Launch', 'Major version release', '2025-06-15', 'active');
*/
