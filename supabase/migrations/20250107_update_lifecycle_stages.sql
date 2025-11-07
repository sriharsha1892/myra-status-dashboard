-- Update lifecycle stages for trial organizations
-- New stages: prospect, trial_pending, trial_active, trial_expired, customer, lost

-- First, update existing values to new nomenclature
UPDATE trial_organizations
SET org_lifecycle_stage = 'customer'
WHERE org_lifecycle_stage = 'converted';

UPDATE trial_organizations
SET org_lifecycle_stage = 'lost'
WHERE org_lifecycle_stage = 'churned';

UPDATE trial_organizations
SET org_lifecycle_stage = 'trial_pending'
WHERE org_lifecycle_stage = 'demo_scheduled';

-- Add new stage options (if using enum, recreate it; if using TEXT, add check constraint)
-- Assuming org_lifecycle_stage is TEXT, we'll add a comment for documentation
COMMENT ON COLUMN trial_organizations.org_lifecycle_stage IS 'Lifecycle stage: prospect, trial_pending, trial_active, trial_expired, customer, lost';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Lifecycle stages updated successfully!';
    RAISE NOTICE 'New stages: prospect, trial_pending, trial_active, trial_expired, customer, lost';
END $$;
