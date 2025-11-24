-- Migration: Make org_id nullable for Master Roadmap entries
-- Purpose: Allow creation of organization-agnostic strategic roadmap items
-- Author: Claude Code
-- Date: 2025-11-23

BEGIN;

-- Step 1: Make org_id nullable
-- This allows Master Roadmap entries to exist without org assignment
ALTER TABLE org_product_roadmap
ALTER COLUMN org_id DROP NOT NULL;

-- Step 2: Add constraint to ensure proper scoping
-- Items must be either org-specific OR have strategic categories
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

-- Step 4: Add index for strategic categories (used in Master Roadmap view)
CREATE INDEX IF NOT EXISTS idx_roadmap_strategic_categories
ON org_product_roadmap USING GIN(strategic_categories)
WHERE strategic_categories IS NOT NULL;

-- Step 5: Update the existing view to handle null org_id
-- Drop and recreate the view with LEFT JOIN instead of INNER JOIN
DROP VIEW IF EXISTS roadmap_items_with_org_links CASCADE;

CREATE OR REPLACE VIEW roadmap_items_with_org_links AS
SELECT
  r.*,
  to_json(o.*) AS organization,
  COALESCE(
    json_agg(
      json_build_object(
        'org_id', rol.org_id,
        'org_name', ro.org_name,
        'link_type', rol.link_type,
        'priority', rol.priority,
        'demand_score', rol.demand_score
      )
    ) FILTER (WHERE rol.roadmap_item_id IS NOT NULL),
    '[]'::json
  ) AS org_links
FROM org_product_roadmap r
LEFT JOIN trial_organizations o ON r.org_id = o.org_id  -- Changed to LEFT JOIN
LEFT JOIN roadmap_org_links rol ON r.id = rol.roadmap_item_id
LEFT JOIN trial_organizations ro ON rol.org_id = ro.org_id
GROUP BY r.id, o.org_id;

-- Step 6: Comment on the changes
COMMENT ON COLUMN org_product_roadmap.org_id IS
  'Organization ID (nullable for Master Roadmap entries). Required for org-specific items, NULL for strategic master roadmap items.';

COMMENT ON CONSTRAINT roadmap_item_must_be_scoped ON org_product_roadmap IS
  'Ensures roadmap items are properly scoped: either to an organization (org_id) or as strategic master items (strategic_categories)';

COMMIT;
