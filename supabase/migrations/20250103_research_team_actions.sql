-- Research Team Actions Table
-- Tracks actions that the research team needs to take on organizations
-- Such as preparing proposals, technical guidance, pricing decisions, market analysis

CREATE TYPE research_action_type AS ENUM (
  'proposal_needed',
  'technical_guidance_needed',
  'pricing_decision',
  'competitive_analysis',
  'market_fit_assessment',
  'customization_needs',
  'integration_assessment',
  'roi_modeling'
);

CREATE TYPE research_action_status AS ENUM (
  'open',
  'in_progress',
  'completed',
  'on_hold',
  'cancelled'
);

CREATE TABLE IF NOT EXISTS trial_research_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES trial_organizations(org_id) ON DELETE CASCADE,
  action_type research_action_type NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status research_action_status NOT NULL DEFAULT 'open',
  priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, critical
  assigned_to VARCHAR(255), -- Research team member name or email
  due_date DATE,
  outcome TEXT, -- Filled when status is 'completed'
  created_by UUID NOT NULL,
  created_by_name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE trial_research_actions ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_research_actions_org_id ON trial_research_actions(org_id);
CREATE INDEX idx_research_actions_status ON trial_research_actions(status);
CREATE INDEX idx_research_actions_action_type ON trial_research_actions(action_type);
CREATE INDEX idx_research_actions_assigned_to ON trial_research_actions(assigned_to);
CREATE INDEX idx_research_actions_created_at ON trial_research_actions(created_at DESC);

-- RLS Policy: Allow all for now
CREATE POLICY "Allow all for now on trial_research_actions"
  ON trial_research_actions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_research_actions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_trial_research_actions_updated_at
  BEFORE UPDATE ON trial_research_actions
  FOR EACH ROW
  EXECUTE FUNCTION update_research_actions_updated_at();
