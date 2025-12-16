-- Migration: Remove forced strategic categories requirement for master roadmap items
-- Purpose: Allow master roadmap items to exist without strategic categories
-- Author: Claude Code
-- Date: 2025-12-01
-- Context: Part of roadmap feature streamlining - enabling truly independent master items

BEGIN;

-- Step 1: Drop the restrictive constraint that forces strategic categories
-- This constraint required master items (org_id IS NULL) to have strategic categories
-- We want to make strategic categories optional for all items
ALTER TABLE org_product_roadmap
DROP CONSTRAINT IF EXISTS roadmap_item_must_be_scoped;

-- Note: We intentionally do NOT add a replacement constraint
-- The schema now allows:
-- 1. Org-specific items (org_id IS NOT NULL) - with optional strategic_categories
-- 2. Master items (org_id IS NULL) - with optional strategic_categories
-- This provides maximum flexibility for roadmap item creation

-- Step 2: Update column comments to reflect new schema semantics
COMMENT ON COLUMN org_product_roadmap.org_id IS
  'Organization ID (nullable). Set for org-specific items, NULL for master roadmap items. Master items can optionally be linked to orgs via roadmap_org_links table.';

COMMENT ON COLUMN org_product_roadmap.strategic_categories IS
  'Optional array of strategic category tags (e.g., ["Datasets Expansion", "Enterprise Integrations"]). Supports multiple categories per item. Categories help organize and filter roadmap items but are not required.';

COMMIT;
