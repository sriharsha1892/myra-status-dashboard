-- Update lifecycle stages for trial organizations
-- Fix: Drop old check constraint, update values, add new constraint

-- Step 1: Drop the old check constraint if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'trial_organizations_org_lifecycle_stage_check'
    ) THEN
        ALTER TABLE trial_organizations
        DROP CONSTRAINT trial_organizations_org_lifecycle_stage_check;
        RAISE NOTICE 'Dropped old check constraint';
    END IF;
END $$;

-- Step 2: Update existing values to new nomenclature
UPDATE trial_organizations
SET org_lifecycle_stage = 'customer'
WHERE org_lifecycle_stage = 'converted';

UPDATE trial_organizations
SET org_lifecycle_stage = 'lost'
WHERE org_lifecycle_stage = 'churned';

UPDATE trial_organizations
SET org_lifecycle_stage = 'trial_pending'
WHERE org_lifecycle_stage = 'demo_scheduled';

-- Step 3: Add new check constraint with updated values
ALTER TABLE trial_organizations
ADD CONSTRAINT trial_organizations_org_lifecycle_stage_check
CHECK (org_lifecycle_stage IN ('prospect', 'trial_pending', 'trial_active', 'trial_expired', 'customer', 'lost'));

-- Add comment for documentation
COMMENT ON COLUMN trial_organizations.org_lifecycle_stage IS 'Lifecycle stage: prospect, trial_pending, trial_active, trial_expired, customer, lost';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Lifecycle stages updated successfully!';
    RAISE NOTICE 'Old values migrated:';
    RAISE NOTICE '  - converted → customer';
    RAISE NOTICE '  - churned → lost';
    RAISE NOTICE '  - demo_scheduled → trial_pending';
    RAISE NOTICE 'New valid stages: prospect, trial_pending, trial_active, trial_expired, customer, lost';
END $$;
