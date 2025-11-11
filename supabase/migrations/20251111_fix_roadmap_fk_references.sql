-- Fix foreign key references for roadmap tables
-- Change from organizations to trial_organizations

-- ============================================================================
-- FIX ROADMAP_MILESTONES TABLE
-- ============================================================================

-- Drop existing foreign key constraint
ALTER TABLE roadmap_milestones
DROP CONSTRAINT IF EXISTS roadmap_milestones_org_id_fkey;

-- Add correct foreign key to trial_organizations
ALTER TABLE roadmap_milestones
ADD CONSTRAINT roadmap_milestones_org_id_fkey
FOREIGN KEY (org_id) REFERENCES trial_organizations(org_id) ON DELETE CASCADE;

-- ============================================================================
-- FIX ROADMAP_LABELS TABLE (if it exists)
-- ============================================================================

-- Drop existing foreign key constraint
ALTER TABLE IF EXISTS roadmap_labels
DROP CONSTRAINT IF EXISTS roadmap_labels_org_id_fkey;

-- Add correct foreign key to trial_organizations
ALTER TABLE IF EXISTS roadmap_labels
ADD CONSTRAINT roadmap_labels_org_id_fkey
FOREIGN KEY (org_id) REFERENCES trial_organizations(org_id) ON DELETE CASCADE;

-- ============================================================================
-- FIX ORG_PRODUCT_ROADMAP TABLE
-- ============================================================================

-- Drop existing foreign key constraint
ALTER TABLE org_product_roadmap
DROP CONSTRAINT IF EXISTS org_product_roadmap_org_id_fkey;

-- Add correct foreign key to trial_organizations
ALTER TABLE org_product_roadmap
ADD CONSTRAINT org_product_roadmap_org_id_fkey
FOREIGN KEY (org_id) REFERENCES trial_organizations(org_id) ON DELETE CASCADE;

-- ============================================================================
-- FIX ROADMAP_NOTES TABLE
-- ============================================================================

-- Drop existing foreign key constraint
ALTER TABLE roadmap_notes
DROP CONSTRAINT IF EXISTS roadmap_notes_org_id_fkey;

-- Add correct foreign key to trial_organizations
ALTER TABLE roadmap_notes
ADD CONSTRAINT roadmap_notes_org_id_fkey
FOREIGN KEY (org_id) REFERENCES trial_organizations(org_id) ON DELETE CASCADE;

-- ============================================================================
-- FIX ROADMAP_OWNER_ASSIGNMENTS TABLE
-- ============================================================================

-- Drop existing foreign key constraint
ALTER TABLE IF EXISTS roadmap_owner_assignments
DROP CONSTRAINT IF EXISTS roadmap_owner_assignments_org_id_fkey;

-- Add correct foreign key to trial_organizations
ALTER TABLE IF EXISTS roadmap_owner_assignments
ADD CONSTRAINT roadmap_owner_assignments_org_id_fkey
FOREIGN KEY (org_id) REFERENCES trial_organizations(org_id) ON DELETE CASCADE;

-- ============================================================================
-- FIX ROADMAP_FORWARDS TABLE
-- ============================================================================

-- Drop existing foreign key constraint
ALTER TABLE IF EXISTS roadmap_forwards
DROP CONSTRAINT IF EXISTS roadmap_forwards_org_id_fkey;

-- Add correct foreign key to trial_organizations
ALTER TABLE IF EXISTS roadmap_forwards
ADD CONSTRAINT roadmap_forwards_org_id_fkey
FOREIGN KEY (org_id) REFERENCES trial_organizations(org_id) ON DELETE CASCADE;

-- ============================================================================
-- VERIFY CHANGES
-- ============================================================================

-- You can verify the changes by running:
-- SELECT
--   tc.table_name,
--   kcu.column_name,
--   ccu.table_name AS foreign_table_name
-- FROM information_schema.table_constraints AS tc
-- JOIN information_schema.key_column_usage AS kcu
--   ON tc.constraint_name = kcu.constraint_name
-- JOIN information_schema.constraint_column_usage AS ccu
--   ON ccu.constraint_name = tc.constraint_name
-- WHERE tc.constraint_type = 'FOREIGN KEY'
--   AND tc.table_name LIKE 'roadmap%'
--   AND kcu.column_name = 'org_id';
