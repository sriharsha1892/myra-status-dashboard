-- Product Roadmap, Feature Requests, and Follow-up Scheduling
-- ============================================================================

-- Ensure the update function exists (created in deal_tracking migration, but defined here as backup)
CREATE OR REPLACE FUNCTION update_deal_tracking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PRODUCT ROADMAP TABLE
-- ============================================================================
CREATE TYPE roadmap_status AS ENUM (
  'planned',      -- Future roadmap item
  'in_progress',  -- Currently being worked on
  'completed',    -- Finished and released
  'cancelled'     -- Cancelled or on hold
);

CREATE TYPE roadmap_priority AS ENUM (
  'low',
  'medium',
  'high',
  'critical'
);

CREATE TABLE IF NOT EXISTS org_product_roadmap (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES trial_organizations(org_id) ON DELETE CASCADE,

  -- Basic Info
  title TEXT NOT NULL,
  description TEXT,
  status roadmap_status NOT NULL DEFAULT 'planned',
  priority roadmap_priority NOT NULL DEFAULT 'medium',

  -- Timeline
  target_date DATE,
  estimated_completion_date DATE,

  -- Metadata
  created_by TEXT, -- Account manager or product person
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE org_product_roadmap ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_org_roadmap_org_id ON org_product_roadmap(org_id);
CREATE INDEX idx_org_roadmap_status ON org_product_roadmap(status);
CREATE INDEX idx_org_roadmap_priority ON org_product_roadmap(priority);
CREATE INDEX idx_org_roadmap_target_date ON org_product_roadmap(target_date);

-- RLS Policy
CREATE POLICY "Allow all for now on org_product_roadmap"
  ON org_product_roadmap
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Trigger to update updated_at
CREATE TRIGGER update_org_roadmap_updated_at
  BEFORE UPDATE ON org_product_roadmap
  FOR EACH ROW
  EXECUTE FUNCTION update_deal_tracking_updated_at();

-- ============================================================================
-- FEATURE REQUESTS TABLE
-- ============================================================================
CREATE TYPE feature_request_status AS ENUM (
  'submitted',    -- Newly submitted
  'reviewed',     -- Reviewed by product
  'planned',      -- Accepted and planned for roadmap
  'in_progress',  -- Being worked on
  'completed',    -- Released
  'rejected',     -- Rejected or out of scope
  'duplicate'     -- Duplicate of another request
);

CREATE TABLE IF NOT EXISTS feature_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES trial_organizations(org_id) ON DELETE CASCADE,
  user_id UUID REFERENCES trial_users(user_id) ON DELETE SET NULL,

  -- Request Details
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  use_case TEXT, -- How the customer would use this feature

  -- Status & Priority
  status feature_request_status NOT NULL DEFAULT 'submitted',
  priority roadmap_priority NOT NULL DEFAULT 'medium',
  votes INTEGER DEFAULT 0, -- Number of times requested

  -- Product Response
  product_response TEXT, -- Product team's response/notes
  product_responded_at TIMESTAMP WITH TIME ZONE,
  product_responded_by TEXT,

  -- Timeline
  expected_availability_date DATE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE feature_requests ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_feature_requests_org_id ON feature_requests(org_id);
CREATE INDEX idx_feature_requests_user_id ON feature_requests(user_id);
CREATE INDEX idx_feature_requests_status ON feature_requests(status);
CREATE INDEX idx_feature_requests_priority ON feature_requests(priority);
CREATE INDEX idx_feature_requests_votes ON feature_requests(votes DESC);

-- RLS Policy
CREATE POLICY "Allow all for now on feature_requests"
  ON feature_requests
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Trigger to update updated_at
CREATE TRIGGER update_feature_requests_updated_at
  BEFORE UPDATE ON feature_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_deal_tracking_updated_at();

-- ============================================================================
-- FOLLOW-UP SCHEDULING TABLE
-- ============================================================================
CREATE TYPE followup_status AS ENUM (
  'scheduled',    -- Scheduled but not yet due
  'pending',      -- Due but not yet completed
  'completed',    -- Completed
  'cancelled'     -- Cancelled
);

CREATE TABLE IF NOT EXISTS followup_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES trial_organizations(org_id) ON DELETE CASCADE,

  -- Schedule
  followup_date DATE NOT NULL,
  followup_time TIME,
  status followup_status NOT NULL DEFAULT 'scheduled',

  -- Details
  title TEXT NOT NULL,
  description TEXT,
  followup_type TEXT, -- e.g., 'check_in', 'demo', 'support', 'renewal_discussion'

  -- Assignment
  assigned_to TEXT, -- Account manager name

  -- Completion
  completed_at TIMESTAMP WITH TIME ZONE,
  completion_notes TEXT,
  outcome TEXT, -- e.g., 'deal_advanced', 'issue_resolved', 'scheduled_next'

  -- Metadata
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE followup_schedules ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_followup_org_id ON followup_schedules(org_id);
CREATE INDEX idx_followup_date ON followup_schedules(followup_date);
CREATE INDEX idx_followup_status ON followup_schedules(status);
CREATE INDEX idx_followup_assigned_to ON followup_schedules(assigned_to);

-- RLS Policy
CREATE POLICY "Allow all for now on followup_schedules"
  ON followup_schedules
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Trigger to update updated_at
CREATE TRIGGER update_followup_schedules_updated_at
  BEFORE UPDATE ON followup_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_deal_tracking_updated_at();
