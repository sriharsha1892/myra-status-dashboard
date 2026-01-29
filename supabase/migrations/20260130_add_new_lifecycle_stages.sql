-- Migration: Add demo_done and negotiation lifecycle stages
-- Created: 2026-01-30
-- Purpose: Support JSON import with additional stages

-- Drop the old check constraint
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'trial_organizations_org_lifecycle_stage_check'
    ) THEN
        ALTER TABLE trial_organizations
        DROP CONSTRAINT trial_organizations_org_lifecycle_stage_check;
        RAISE NOTICE 'Dropped old org_lifecycle_stage check constraint';
    END IF;
END $$;

-- Add new check constraint with additional stages: demo_done, negotiation
ALTER TABLE trial_organizations
ADD CONSTRAINT trial_organizations_org_lifecycle_stage_check
CHECK (org_lifecycle_stage IS NULL OR org_lifecycle_stage IN (
  'prospect',        -- Pre-engagement cold/warm lead
  'trial_pending',   -- Trial requested but not yet provided
  'demo_done',       -- Demo completed, evaluating
  'trial_active',    -- Active trial in progress
  'trial_expired',   -- Trial ended, not converted (dormant)
  'negotiation',     -- In negotiation/strong prospect
  'customer',        -- Paying customer
  'lost'             -- Lost deal (never converted)
));

-- Update comment for documentation
COMMENT ON COLUMN trial_organizations.org_lifecycle_stage IS
  'Lifecycle stage: prospect, trial_pending, demo_done, trial_active, trial_expired, negotiation, customer, lost';

-- Add deal_momentum column if not exists (for tracking deal health)
ALTER TABLE trial_organizations ADD COLUMN IF NOT EXISTS deal_momentum TEXT
  CHECK (deal_momentum IS NULL OR deal_momentum IN ('positive', 'neutral', 'stalled', 'at_risk'));

COMMENT ON COLUMN trial_organizations.deal_momentum IS
  'Deal momentum indicator: positive, neutral, stalled, at_risk';

-- Add index for deal_momentum
CREATE INDEX IF NOT EXISTS idx_trial_orgs_deal_momentum ON trial_organizations(deal_momentum);

-- Success message
DO $$
BEGIN
    RAISE NOTICE '----------------------------------------';
    RAISE NOTICE 'Added new lifecycle stages:';
    RAISE NOTICE '  - demo_done (Demo completed, evaluating)';
    RAISE NOTICE '  - negotiation (Strong prospect, in negotiation)';
    RAISE NOTICE '';
    RAISE NOTICE 'Valid stages now: prospect, trial_pending, demo_done,';
    RAISE NOTICE '  trial_active, trial_expired, negotiation, customer, lost';
    RAISE NOTICE '----------------------------------------';
END $$;
