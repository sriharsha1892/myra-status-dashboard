-- Make org_id nullable to support general product roadmap items
-- not tied to specific trial organizations
-- Migration created: 2025-11-07

ALTER TABLE org_product_roadmap
ALTER COLUMN org_id DROP NOT NULL;

-- Add comment explaining the change
COMMENT ON COLUMN org_product_roadmap.org_id IS 'Optional: Links roadmap item to specific trial org. NULL for general company roadmap items.';
