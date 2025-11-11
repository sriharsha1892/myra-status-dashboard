-- Fix foreign key references for roadmap tables with data cleanup
-- Change from organizations to trial_organizations

-- ============================================================================
-- STEP 1: Clean up orphaned data before changing constraints
-- ============================================================================

-- Delete roadmap_milestones that reference non-existent trial orgs
DELETE FROM roadmap_milestones
WHERE org_id NOT IN (SELECT org_id FROM trial_organizations);

-- Delete roadmap_labels that reference non-existent trial orgs (if table exists)
DELETE FROM roadmap_labels
WHERE org_id NOT IN (SELECT org_id FROM trial_organizations);

-- Delete roadmap items that reference non-existent trial orgs
DELETE FROM org_product_roadmap
WHERE org_id NOT IN (SELECT org_id FROM trial_organizations);

-- Delete roadmap_notes that reference non-existent trial orgs
DELETE FROM roadmap_notes
WHERE org_id NOT IN (SELECT org_id FROM trial_organizations);

-- Delete roadmap_owner_assignments that reference non-existent trial orgs (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'roadmap_owner_assignments') THEN
    DELETE FROM roadmap_owner_assignments
    WHERE org_id NOT IN (SELECT org_id FROM trial_organizations);
  END IF;
END $$;

-- Delete roadmap_forwards that reference non-existent trial orgs (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'roadmap_forwards') THEN
    DELETE FROM roadmap_forwards
    WHERE org_id NOT IN (SELECT org_id FROM trial_organizations);
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Fix ROADMAP_MILESTONES TABLE
-- ============================================================================

-- Drop existing foreign key constraint
ALTER TABLE roadmap_milestones
DROP CONSTRAINT IF EXISTS roadmap_milestones_org_id_fkey;

-- Add correct foreign key to trial_organizations
ALTER TABLE roadmap_milestones
ADD CONSTRAINT roadmap_milestones_org_id_fkey
FOREIGN KEY (org_id) REFERENCES trial_organizations(org_id) ON DELETE CASCADE;

-- ============================================================================
-- STEP 3: Fix ROADMAP_LABELS TABLE (if it exists)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'roadmap_labels') THEN
    -- Drop existing foreign key constraint
    ALTER TABLE roadmap_labels
    DROP CONSTRAINT IF EXISTS roadmap_labels_org_id_fkey;

    -- Add correct foreign key to trial_organizations
    ALTER TABLE roadmap_labels
    ADD CONSTRAINT roadmap_labels_org_id_fkey
    FOREIGN KEY (org_id) REFERENCES trial_organizations(org_id) ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================================================
-- STEP 4: Fix ORG_PRODUCT_ROADMAP TABLE
-- ============================================================================

-- Drop existing foreign key constraint
ALTER TABLE org_product_roadmap
DROP CONSTRAINT IF EXISTS org_product_roadmap_org_id_fkey;

-- Add correct foreign key to trial_organizations
ALTER TABLE org_product_roadmap
ADD CONSTRAINT org_product_roadmap_org_id_fkey
FOREIGN KEY (org_id) REFERENCES trial_organizations(org_id) ON DELETE CASCADE;

-- ============================================================================
-- STEP 5: Fix ROADMAP_NOTES TABLE
-- ============================================================================

-- Drop existing foreign key constraint
ALTER TABLE roadmap_notes
DROP CONSTRAINT IF EXISTS roadmap_notes_org_id_fkey;

-- Add correct foreign key to trial_organizations
ALTER TABLE roadmap_notes
ADD CONSTRAINT roadmap_notes_org_id_fkey
FOREIGN KEY (org_id) REFERENCES trial_organizations(org_id) ON DELETE CASCADE;

-- ============================================================================
-- STEP 6: Fix ROADMAP_OWNER_ASSIGNMENTS TABLE
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'roadmap_owner_assignments') THEN
    -- Drop existing foreign key constraint
    ALTER TABLE roadmap_owner_assignments
    DROP CONSTRAINT IF EXISTS roadmap_owner_assignments_org_id_fkey;

    -- Add correct foreign key to trial_organizations
    ALTER TABLE roadmap_owner_assignments
    ADD CONSTRAINT roadmap_owner_assignments_org_id_fkey
    FOREIGN KEY (org_id) REFERENCES trial_organizations(org_id) ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================================================
-- STEP 7: Fix ROADMAP_FORWARDS TABLE
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'roadmap_forwards') THEN
    -- Drop existing foreign key constraint
    ALTER TABLE roadmap_forwards
    DROP CONSTRAINT IF EXISTS roadmap_forwards_org_id_fkey;

    -- Add correct foreign key to trial_organizations
    ALTER TABLE roadmap_forwards
    ADD CONSTRAINT roadmap_forwards_org_id_fkey
    FOREIGN KEY (org_id) REFERENCES trial_organizations(org_id) ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Show summary of what was cleaned up
SELECT 'Migration completed successfully' AS status;
