-- ============================================================================
-- CRITICAL: Run this SQL in Supabase Dashboard > SQL Editor
-- ============================================================================
--
-- This adds the missing columns needed for roadmap import
-- After running this, the import will work!
--
-- Steps:
-- 1. Go to https://supabase.com/dashboard
-- 2. Select your project
-- 3. Go to SQL Editor
-- 4. Paste this entire file and click "Run"
-- 5. Then run: node scripts/apply-roadmap-migrations-and-import.js /Users/sriharsha/Desktop/roadmap_transformed.xlsx
--
-- ============================================================================

-- Step 1: Add missing columns
ALTER TABLE org_product_roadmap
ADD COLUMN IF NOT EXISTS proposer TEXT,
ADD COLUMN IF NOT EXISTS goal TEXT,
ADD COLUMN IF NOT EXISTS area TEXT,
ADD COLUMN IF NOT EXISTS rationale TEXT,
ADD COLUMN IF NOT EXISTS version_planned TEXT,
ADD COLUMN IF NOT EXISTS assigned_to TEXT;

-- Step 2: Make org_id nullable for general roadmap items
ALTER TABLE org_product_roadmap
ALTER COLUMN org_id DROP NOT NULL;

-- Step 3: Add helpful comments
COMMENT ON COLUMN org_product_roadmap.proposer IS 'Person who proposed this roadmap item';
COMMENT ON COLUMN org_product_roadmap.goal IS 'Goal category: Addtl. Functionality, Better Data, Better Security, Better Support, Better UX, Cost optimization, etc.';
COMMENT ON COLUMN org_product_roadmap.area IS 'Specific area: Dashboards, Sharing, API, Support, Language Selection, etc.';
COMMENT ON COLUMN org_product_roadmap.rationale IS 'Why this item matters';
COMMENT ON COLUMN org_product_roadmap.version_planned IS 'Target version (e.g., V2, V3)';
COMMENT ON COLUMN org_product_roadmap.assigned_to IS 'Comma-separated list of assignees (e.g., "Harsha,Abin")';
COMMENT ON COLUMN org_product_roadmap.org_id IS 'Optional: Links roadmap item to specific trial org. NULL for general company roadmap items.';

-- Step 4: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_org_roadmap_goal ON org_product_roadmap(goal);
CREATE INDEX IF NOT EXISTS idx_org_roadmap_area ON org_product_roadmap(area);
CREATE INDEX IF NOT EXISTS idx_org_roadmap_version_planned ON org_product_roadmap(version_planned);

-- Verify columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'org_product_roadmap'
AND column_name IN ('proposer', 'goal', 'area', 'rationale', 'version_planned', 'assigned_to', 'org_id')
ORDER BY column_name;

-- ============================================================================
-- After running this, you should see 7 rows confirming the columns exist
-- Then run the import script!
-- ============================================================================
