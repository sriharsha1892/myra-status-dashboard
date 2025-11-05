-- Add timestamp tracking for trial organizations
-- This migration updates trial dates to include time component

-- Change trial_start_date and trial_end_date from DATE to TIMESTAMP WITH TIME ZONE
ALTER TABLE trial_organizations
  ALTER COLUMN trial_start_date TYPE TIMESTAMP WITH TIME ZONE
  USING trial_start_date::TIMESTAMP WITH TIME ZONE;

ALTER TABLE trial_organizations
  ALTER COLUMN trial_end_date TYPE TIMESTAMP WITH TIME ZONE
  USING trial_end_date::TIMESTAMP WITH TIME ZONE;

-- Add access_granted_at timestamp to track when trial access was actually granted
ALTER TABLE trial_organizations
  ADD COLUMN IF NOT EXISTS access_granted_at TIMESTAMP WITH TIME ZONE;

-- Add access_revoked_at timestamp to track when trial access was revoked
ALTER TABLE trial_organizations
  ADD COLUMN IF NOT EXISTS access_revoked_at TIMESTAMP WITH TIME ZONE;

-- Add lifecycle_stage_changed_at to track when the stage last changed
ALTER TABLE trial_organizations
  ADD COLUMN IF NOT EXISTS lifecycle_stage_changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create function to track lifecycle stage changes
CREATE OR REPLACE FUNCTION track_lifecycle_stage_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.org_lifecycle_stage IS DISTINCT FROM NEW.org_lifecycle_stage THEN
    NEW.lifecycle_stage_changed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for lifecycle stage changes
DROP TRIGGER IF EXISTS trial_org_lifecycle_change ON trial_organizations;
CREATE TRIGGER trial_org_lifecycle_change
  BEFORE UPDATE ON trial_organizations
  FOR EACH ROW
  EXECUTE FUNCTION track_lifecycle_stage_change();

-- Add indexes for timestamp queries
CREATE INDEX IF NOT EXISTS idx_trial_orgs_start_date ON trial_organizations(trial_start_date);
CREATE INDEX IF NOT EXISTS idx_trial_orgs_end_date ON trial_organizations(trial_end_date);
CREATE INDEX IF NOT EXISTS idx_trial_orgs_access_granted ON trial_organizations(access_granted_at);

-- Add comments for documentation
COMMENT ON COLUMN trial_organizations.trial_start_date IS 'When the trial period officially started (with timestamp)';
COMMENT ON COLUMN trial_organizations.trial_end_date IS 'When the trial period is scheduled to end (with timestamp)';
COMMENT ON COLUMN trial_organizations.access_granted_at IS 'When trial access was actually granted to the organization';
COMMENT ON COLUMN trial_organizations.access_revoked_at IS 'When trial access was revoked (if applicable)';
COMMENT ON COLUMN trial_organizations.lifecycle_stage_changed_at IS 'Last time the lifecycle stage was updated';
