-- Add missing columns to match product roadmap spreadsheet structure
-- Migration created: 2025-11-05

ALTER TABLE org_product_roadmap
ADD COLUMN IF NOT EXISTS proposer TEXT,
ADD COLUMN IF NOT EXISTS goal TEXT,
ADD COLUMN IF NOT EXISTS area TEXT,
ADD COLUMN IF NOT EXISTS rationale TEXT,
ADD COLUMN IF NOT EXISTS version_planned TEXT,
ADD COLUMN IF NOT EXISTS assigned_to TEXT; -- Comma-separated list of assignees

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_org_roadmap_goal ON org_product_roadmap(goal);
CREATE INDEX IF NOT EXISTS idx_org_roadmap_area ON org_product_roadmap(area);
CREATE INDEX IF NOT EXISTS idx_org_roadmap_version_planned ON org_product_roadmap(version_planned);

-- Add comment explaining the structure
COMMENT ON COLUMN org_product_roadmap.proposer IS 'Person who proposed this roadmap item';
COMMENT ON COLUMN org_product_roadmap.goal IS 'Goal category: Addtl. Functionality, Better Data, Better Security, Better Support, Better UX, Cost optimization, etc.';
COMMENT ON COLUMN org_product_roadmap.area IS 'Specific area: Dashboards, Sharing, API, Support, Language Selection, etc.';
COMMENT ON COLUMN org_product_roadmap.rationale IS 'Why this item matters';
COMMENT ON COLUMN org_product_roadmap.version_planned IS 'Target version (e.g., V2, V3)';
COMMENT ON COLUMN org_product_roadmap.assigned_to IS 'Comma-separated list of assignees (e.g., "Harsha,Abin")';
