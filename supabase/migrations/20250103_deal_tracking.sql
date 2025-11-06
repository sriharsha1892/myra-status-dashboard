-- Deal Tracking for Trial Organizations
-- Allows Account Managers to track deal outcomes: Won, Lost, or Future Prospect

CREATE TYPE deal_status AS ENUM (
  'prospect',        -- Initial state, no deal status yet
  'negotiating',     -- In active negotiation
  'won',             -- Deal won
  'lost',            -- Deal lost
  'future_prospect'  -- Future prospect, not immediate
);

CREATE TABLE IF NOT EXISTS org_deal_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL UNIQUE REFERENCES trial_organizations(org_id) ON DELETE CASCADE,
  deal_status deal_status NOT NULL DEFAULT 'prospect',
  deal_value DECIMAL(12, 2), -- Deal amount if won
  deal_currency VARCHAR(10) DEFAULT 'USD',
  loss_reason TEXT, -- Why deal was lost
  future_prospect_reason TEXT, -- Why marked as future prospect
  notes TEXT, -- Account manager notes
  status_updated_by UUID,
  status_updated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE org_deal_tracking ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_org_deal_tracking_org_id ON org_deal_tracking(org_id);
CREATE INDEX idx_org_deal_tracking_deal_status ON org_deal_tracking(deal_status);
CREATE INDEX idx_org_deal_tracking_status_updated_at ON org_deal_tracking(status_updated_at DESC);

-- RLS Policy: Allow all for now
CREATE POLICY "Allow all for now on org_deal_tracking"
  ON org_deal_tracking
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_deal_tracking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_org_deal_tracking_updated_at
  BEFORE UPDATE ON org_deal_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_deal_tracking_updated_at();

-- Auto-create deal_tracking record when org is created
CREATE OR REPLACE FUNCTION create_deal_tracking_for_org()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO org_deal_tracking (org_id, deal_status)
  VALUES (NEW.org_id, 'prospect');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_deal_tracking_on_org_create
  AFTER INSERT ON trial_organizations
  FOR EACH ROW
  EXECUTE FUNCTION create_deal_tracking_for_org();
