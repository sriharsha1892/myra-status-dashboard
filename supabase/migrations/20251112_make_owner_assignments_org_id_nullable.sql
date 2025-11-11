-- Make org_id nullable in roadmap_owner_assignments to support global roadmap items
-- This aligns with org_product_roadmap which also has nullable org_id

-- Drop the NOT NULL constraint
ALTER TABLE roadmap_owner_assignments
ALTER COLUMN org_id DROP NOT NULL;

-- Update the foreign key to handle NULL values
-- First drop the existing constraint
ALTER TABLE roadmap_owner_assignments
DROP CONSTRAINT IF EXISTS roadmap_owner_assignments_org_id_fkey;

-- Add it back without the NOT NULL requirement (it's handled by the column definition)
ALTER TABLE roadmap_owner_assignments
ADD CONSTRAINT roadmap_owner_assignments_org_id_fkey
FOREIGN KEY (org_id) REFERENCES trial_organizations(org_id) ON DELETE CASCADE;

-- Add comment explaining the change
COMMENT ON COLUMN roadmap_owner_assignments.org_id IS
  'Optional: Links assignment to specific trial org. NULL for global roadmap item assignments.';
