-- Migration: Make org_id nullable for Master Roadmap entries (FINAL VERSION)
-- Purpose: Allow creation of organization-agnostic strategic roadmap items
-- Author: Claude Code
-- Date: 2025-11-23
-- Note: Simplified version compatible with existing schema

BEGIN;

-- Step 0: Ensure strategic_categories column exists
-- This is safe to run even if column already exists due to IF NOT EXISTS
ALTER TABLE org_product_roadmap
ADD COLUMN IF NOT EXISTS strategic_categories TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS parent_item_id UUID REFERENCES org_product_roadmap(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS item_type TEXT DEFAULT 'task' CHECK (item_type IN ('macro-goal', 'task'));

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_roadmap_parent_item
ON org_product_roadmap(parent_item_id)
WHERE parent_item_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_roadmap_strategic_categories
ON org_product_roadmap USING GIN(strategic_categories);

CREATE INDEX IF NOT EXISTS idx_roadmap_item_type
ON org_product_roadmap(item_type);

-- Step 1: Make org_id nullable
-- This allows Master Roadmap entries to exist without org assignment
ALTER TABLE org_product_roadmap
ALTER COLUMN org_id DROP NOT NULL;

-- Step 2: Add constraint to ensure proper scoping
-- Items must be either org-specific OR have strategic categories
-- First drop if exists (for reruns)
DO $$
BEGIN
    ALTER TABLE org_product_roadmap DROP CONSTRAINT IF EXISTS roadmap_item_must_be_scoped;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE org_product_roadmap
ADD CONSTRAINT roadmap_item_must_be_scoped
CHECK (
  -- Either: has org_id (organization-specific roadmap item)
  org_id IS NOT NULL
  OR
  -- Or: has strategic categories (master roadmap item)
  (strategic_categories IS NOT NULL AND array_length(strategic_categories, 1) > 0)
);

-- Step 3: Add index for efficient queries on master roadmap items
CREATE INDEX IF NOT EXISTS idx_roadmap_master_items
ON org_product_roadmap(id)
WHERE org_id IS NULL;

-- Step 4: Update the roadmap_items_with_org_links view
-- Drop and recreate with LEFT JOIN to handle null org_id
DROP VIEW IF EXISTS roadmap_items_with_org_links CASCADE;

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

-- Step 5: Create or replace the roadmap_org_demand view
-- Uses actual columns from roadmap_org_links table
CREATE OR REPLACE VIEW roadmap_org_demand AS
SELECT
  roadmap_item_id,
  COUNT(DISTINCT org_id) as org_count,
  ARRAY_AGG(DISTINCT org_id) FILTER (WHERE org_id IS NOT NULL) as org_ids,
  MAX(CASE
    WHEN priority = 'critical' THEN 4
    WHEN priority = 'high' THEN 3
    WHEN priority = 'medium' THEN 2
    WHEN priority = 'low' THEN 1
    ELSE 0
  END) as max_priority_level,
  ARRAY_AGG(DISTINCT link_type) FILTER (WHERE link_type IS NOT NULL) as link_types
FROM roadmap_org_links
WHERE deleted_at IS NULL OR deleted_at IS NULL  -- Handle case where deleted_at doesn't exist
GROUP BY roadmap_item_id;

-- Step 6: Add helpful comments
COMMENT ON COLUMN org_product_roadmap.org_id IS
  'Organization ID (nullable for Master Roadmap entries). Required for org-specific items, NULL for strategic master roadmap items.';

COMMENT ON COLUMN org_product_roadmap.strategic_categories IS
  'Flexible array of strategic category tags (e.g., ["Datasets Expansion", "Enterprise Integrations"]). Supports multiple categories per item. Required for Master Roadmap items when org_id is NULL.';

COMMENT ON CONSTRAINT roadmap_item_must_be_scoped ON org_product_roadmap IS
  'Ensures roadmap items are properly scoped: either to an organization (org_id) or as strategic master items (strategic_categories)';

COMMIT;
