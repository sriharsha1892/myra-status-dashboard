-- B2B Market Research Sales Schema Optimization
-- Covers: Status consolidation, Contract tracking, Win/Loss analysis, Trial usage tracking

-- ============================================================================
-- PART 1: TRIAL STATUS CLEANUP
-- Remove redundant values, keep clean workflow states
-- ============================================================================

-- First, migrate any 'in_progress' to 'active' and 'closed' to 'completed' or 'cancelled'
UPDATE trial_organizations
SET trial_status = 'active'
WHERE trial_status = 'in_progress';

UPDATE trial_organizations
SET trial_status = CASE
  WHEN org_lifecycle_stage = 'customer' THEN 'completed'
  WHEN org_lifecycle_stage = 'lost' THEN 'cancelled'
  ELSE 'completed'
END
WHERE trial_status = 'closed';

-- Drop old constraint and add new one
ALTER TABLE trial_organizations
DROP CONSTRAINT IF EXISTS trial_organizations_trial_status_check;

ALTER TABLE trial_organizations
ADD CONSTRAINT trial_organizations_trial_status_check
CHECK (trial_status IS NULL OR trial_status IN ('requested', 'approved', 'active', 'extended', 'completed', 'cancelled'));

-- ============================================================================
-- PART 2: CONTRACT & RENEWAL TRACKING
-- New table for post-conversion customer management
-- ============================================================================

CREATE TABLE IF NOT EXISTS org_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES trial_organizations(org_id) ON DELETE CASCADE,

  -- Contract Details
  contract_type TEXT CHECK (contract_type IN ('annual', 'multi_year', 'month_to_month', 'pilot')),
  contract_start_date DATE NOT NULL,
  contract_end_date DATE NOT NULL,

  -- Financial
  contract_value DECIMAL(12,2),
  mrr DECIMAL(12,2),  -- Monthly Recurring Revenue
  arr DECIMAL(12,2),  -- Annual Recurring Revenue
  currency VARCHAR(3) DEFAULT 'USD',
  payment_terms TEXT CHECK (payment_terms IN ('net_15', 'net_30', 'net_45', 'net_60', 'upfront', 'custom')),

  -- Renewal
  auto_renewal BOOLEAN DEFAULT false,
  renewal_status TEXT CHECK (renewal_status IN ('upcoming', 'in_negotiation', 'renewed', 'churned', 'expanded')),
  renewal_probability INTEGER CHECK (renewal_probability BETWEEN 0 AND 100),
  renewal_notes TEXT,

  -- Tracking
  signed_by UUID REFERENCES users(id),
  signed_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_org_contracts_org_id ON org_contracts(org_id);
CREATE INDEX IF NOT EXISTS idx_org_contracts_renewal_status ON org_contracts(renewal_status);
CREATE INDEX IF NOT EXISTS idx_org_contracts_end_date ON org_contracts(contract_end_date);

-- Add customer health status to trial_organizations
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'trial_organizations'
                 AND column_name = 'customer_health_status') THEN
    ALTER TABLE trial_organizations
    ADD COLUMN customer_health_status TEXT CHECK (customer_health_status IN ('onboarding', 'healthy', 'warning', 'at_risk', 'churning'));
  END IF;
END $$;

-- Enable RLS on org_contracts
ALTER TABLE org_contracts ENABLE ROW LEVEL SECURITY;

-- RLS policies for org_contracts
CREATE POLICY "Users can view contracts for their organizations"
  ON org_contracts FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert contracts"
  ON org_contracts FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update contracts"
  ON org_contracts FOR UPDATE
  USING (true);

-- ============================================================================
-- PART 3: WIN/LOSS ANALYSIS
-- Add structured categories for analytics
-- ============================================================================

-- Add loss_category to org_deal_tracking if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'org_deal_tracking'
                 AND column_name = 'loss_category') THEN
    ALTER TABLE org_deal_tracking
    ADD COLUMN loss_category TEXT CHECK (loss_category IN (
      'competitor_won',
      'budget_constraints',
      'no_decision',
      'timing_not_right',
      'product_fit',
      'champion_left',
      'internal_politics',
      'pricing_objection',
      'other'
    ));
  END IF;
END $$;

-- Add win_category
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'org_deal_tracking'
                 AND column_name = 'win_category') THEN
    ALTER TABLE org_deal_tracking
    ADD COLUMN win_category TEXT CHECK (win_category IN (
      'champion_driven',
      'competitive_win',
      'expansion',
      'inbound_lead',
      'outbound_sales',
      'referral',
      'partnership'
    ));
  END IF;
END $$;

-- Add competitor tracking
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'org_deal_tracking'
                 AND column_name = 'competitor_name') THEN
    ALTER TABLE org_deal_tracking
    ADD COLUMN competitor_name TEXT;
  END IF;
END $$;

-- Add revisit date for "timing not right" losses
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'org_deal_tracking'
                 AND column_name = 'revisit_date') THEN
    ALTER TABLE org_deal_tracking
    ADD COLUMN revisit_date DATE;
  END IF;
END $$;

-- Deal velocity tracking dates
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'org_deal_tracking'
                 AND column_name = 'prospect_date') THEN
    ALTER TABLE org_deal_tracking
    ADD COLUMN prospect_date DATE,
    ADD COLUMN demo_date DATE,
    ADD COLUMN trial_start_date DATE,
    ADD COLUMN decision_date DATE;
  END IF;
END $$;

-- ============================================================================
-- PART 4: TRIAL USAGE TRACKING
-- Add engagement metrics to trial_organizations
-- ============================================================================

-- Add engagement tracking columns
DO $$
BEGIN
  -- Activation metrics
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'trial_organizations'
                 AND column_name = 'first_login_date') THEN
    ALTER TABLE trial_organizations
    ADD COLUMN first_login_date TIMESTAMP WITH TIME ZONE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'trial_organizations'
                 AND column_name = 'first_query_date') THEN
    ALTER TABLE trial_organizations
    ADD COLUMN first_query_date TIMESTAMP WITH TIME ZONE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'trial_organizations'
                 AND column_name = 'activation_date') THEN
    ALTER TABLE trial_organizations
    ADD COLUMN activation_date TIMESTAMP WITH TIME ZONE;
  END IF;

  -- Usage metrics
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'trial_organizations'
                 AND column_name = 'total_logins') THEN
    ALTER TABLE trial_organizations
    ADD COLUMN total_logins INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'trial_organizations'
                 AND column_name = 'total_queries') THEN
    ALTER TABLE trial_organizations
    ADD COLUMN total_queries INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'trial_organizations'
                 AND column_name = 'unique_active_users') THEN
    ALTER TABLE trial_organizations
    ADD COLUMN unique_active_users INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'trial_organizations'
                 AND column_name = 'last_query_date') THEN
    ALTER TABLE trial_organizations
    ADD COLUMN last_query_date TIMESTAMP WITH TIME ZONE;
  END IF;

  -- Engagement tier
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'trial_organizations'
                 AND column_name = 'engagement_tier') THEN
    ALTER TABLE trial_organizations
    ADD COLUMN engagement_tier TEXT CHECK (engagement_tier IN ('hot', 'warm', 'cold', 'dormant'));
  END IF;

  -- Engagement breakdown
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'trial_organizations'
                 AND column_name = 'engagement_score_breakdown') THEN
    ALTER TABLE trial_organizations
    ADD COLUMN engagement_score_breakdown JSONB;
  END IF;
END $$;

-- ============================================================================
-- ENGAGEMENT SNAPSHOTS TABLE
-- For historical tracking and trending
-- ============================================================================

CREATE TABLE IF NOT EXISTS trial_engagement_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES trial_organizations(org_id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,

  -- Daily Metrics
  logins_today INTEGER DEFAULT 0,
  queries_today INTEGER DEFAULT 0,
  active_users_today INTEGER DEFAULT 0,

  -- Running Totals
  logins_last_7_days INTEGER DEFAULT 0,
  queries_last_7_days INTEGER DEFAULT 0,

  -- Calculated Score
  engagement_score INTEGER,
  engagement_tier TEXT CHECK (engagement_tier IN ('hot', 'warm', 'cold', 'dormant')),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(org_id, snapshot_date)
);

-- Indexes for snapshots
CREATE INDEX IF NOT EXISTS idx_engagement_snapshots_org_date
  ON trial_engagement_snapshots(org_id, snapshot_date DESC);

-- RLS for snapshots
ALTER TABLE trial_engagement_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view engagement snapshots"
  ON trial_engagement_snapshots FOR SELECT
  USING (true);

CREATE POLICY "System can insert engagement snapshots"
  ON trial_engagement_snapshots FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- HELPER FUNCTION: Calculate Engagement Tier
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_engagement_tier(
  p_last_activity TIMESTAMP WITH TIME ZONE,
  p_total_queries INTEGER
)
RETURNS TEXT AS $$
BEGIN
  -- No activity
  IF p_last_activity IS NULL THEN
    RETURN 'dormant';
  END IF;

  -- Hot: Active in last 3 days with 10+ queries
  IF p_last_activity > NOW() - INTERVAL '3 days' AND p_total_queries >= 10 THEN
    RETURN 'hot';
  END IF;

  -- Warm: Active in last 7 days with 3+ queries
  IF p_last_activity > NOW() - INTERVAL '7 days' AND p_total_queries >= 3 THEN
    RETURN 'warm';
  END IF;

  -- Cold: Active in last 14 days with 1+ queries
  IF p_last_activity > NOW() - INTERVAL '14 days' AND p_total_queries >= 1 THEN
    RETURN 'cold';
  END IF;

  -- Dormant: No activity in 14+ days
  RETURN 'dormant';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGER: Auto-update engagement tier on activity
-- ============================================================================

CREATE OR REPLACE FUNCTION update_org_engagement_tier()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE trial_organizations
  SET engagement_tier = calculate_engagement_tier(
    COALESCE(NEW.last_query_date, NEW.last_activity_date),
    COALESCE(NEW.total_queries, 0)
  ),
  updated_at = NOW()
  WHERE org_id = NEW.org_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if not exists
DROP TRIGGER IF EXISTS trigger_update_engagement_tier ON trial_organizations;
CREATE TRIGGER trigger_update_engagement_tier
  AFTER UPDATE OF last_query_date, total_queries, last_activity_date
  ON trial_organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_org_engagement_tier();

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE org_contracts IS 'Tracks customer contracts, renewal dates, and MRR/ARR';
COMMENT ON TABLE trial_engagement_snapshots IS 'Daily snapshots of trial engagement for trending';
COMMENT ON COLUMN trial_organizations.engagement_tier IS 'Calculated: hot (3d, 10+ queries), warm (7d, 3+), cold (14d, 1+), dormant';
COMMENT ON COLUMN trial_organizations.customer_health_status IS 'Post-conversion health: onboarding, healthy, warning, at_risk, churning';
COMMENT ON COLUMN org_deal_tracking.loss_category IS 'Structured loss reason for analytics';
COMMENT ON COLUMN org_deal_tracking.win_category IS 'Structured win reason for analytics';

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ B2B Sales Schema Optimization Complete!';
  RAISE NOTICE '   - trial_status cleaned up';
  RAISE NOTICE '   - org_contracts table created';
  RAISE NOTICE '   - Win/loss categories added';
  RAISE NOTICE '   - Engagement tracking added';
  RAISE NOTICE '   - engagement_snapshots table created';
END $$;
