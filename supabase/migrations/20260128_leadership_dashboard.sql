-- Migration: Leadership Dashboard Views
-- Created: 2026-01-28
-- Purpose: Support the Leadership GTM Dashboard with pipeline metrics and cost tracking
-- Note: Uses trial_organizations table (not organizations_unified)

-- ============================================
-- PART 0: Add missing columns to trial_organizations
-- These columns are required for the leadership dashboard
-- ============================================

-- Deal value for pipeline tracking
ALTER TABLE trial_organizations ADD COLUMN IF NOT EXISTS deal_value DECIMAL(12,2);

-- Region for geographic segmentation
ALTER TABLE trial_organizations ADD COLUMN IF NOT EXISTS region TEXT CHECK (region IS NULL OR region IN ('MEA', 'EMEA', 'APAC', 'Americas', 'Global'));

-- Trial dates (different from trial_request_date/trial_expiry_date)
ALTER TABLE trial_organizations ADD COLUMN IF NOT EXISTS trial_start_date DATE;
ALTER TABLE trial_organizations ADD COLUMN IF NOT EXISTS trial_end_date DATE;

-- Unified lifecycle stage for leadership view
ALTER TABLE trial_organizations ADD COLUMN IF NOT EXISTS org_lifecycle_stage TEXT DEFAULT 'prospect' CHECK (org_lifecycle_stage IS NULL OR org_lifecycle_stage IN (
  'prospect',           -- Pre-engagement cold/warm lead
  'trial_pending',      -- Trial requested but not yet provided
  'trial_active',       -- Active trial in progress
  'trial_expired',      -- Trial ended, not converted
  'customer',           -- Paying customer
  'lost'                -- Lost deal (never converted)
));

-- Notes for general observations
ALTER TABLE trial_organizations ADD COLUMN IF NOT EXISTS notes TEXT;

-- Demo tracking
ALTER TABLE trial_organizations ADD COLUMN IF NOT EXISTS demo_date DATE;

-- Index for leadership stage filtering
CREATE INDEX IF NOT EXISTS idx_trial_orgs_lifecycle_stage ON trial_organizations(org_lifecycle_stage);
CREATE INDEX IF NOT EXISTS idx_trial_orgs_region ON trial_organizations(region);
CREATE INDEX IF NOT EXISTS idx_trial_orgs_trial_start ON trial_organizations(trial_start_date);

-- ============================================
-- VIEW: leadership_pipeline_summary
-- Aggregated counts and values by leadership stage
-- Maps org_lifecycle_stage to leadership view stages
-- ============================================
CREATE OR REPLACE VIEW leadership_pipeline_summary AS
SELECT
  -- Paying Customers (customer)
  COUNT(*) FILTER (WHERE org_lifecycle_stage = 'customer') AS paying_count,
  COALESCE(SUM(deal_value) FILTER (WHERE org_lifecycle_stage = 'customer'), 0) AS paying_value,

  -- Strong Prospects (trial_expired with deal_value > 0, indicating negotiation)
  COUNT(*) FILTER (WHERE org_lifecycle_stage = 'trial_expired' AND deal_value > 0) AS strong_prospects_count,
  COALESCE(SUM(deal_value) FILTER (WHERE org_lifecycle_stage = 'trial_expired' AND deal_value > 0), 0) AS strong_prospects_value,

  -- Prospects (trial_pending)
  COUNT(*) FILTER (WHERE org_lifecycle_stage = 'trial_pending') AS prospects_count,
  COALESCE(SUM(deal_value) FILTER (WHERE org_lifecycle_stage = 'trial_pending'), 0) AS prospects_value,

  -- Active (trial_active)
  COUNT(*) FILTER (WHERE org_lifecycle_stage = 'trial_active') AS active_count,
  COALESCE(SUM(deal_value) FILTER (WHERE org_lifecycle_stage = 'trial_active'), 0) AS active_value,

  -- Dormant (trial_expired with no deal_value or zero)
  COUNT(*) FILTER (WHERE org_lifecycle_stage = 'trial_expired' AND (deal_value IS NULL OR deal_value = 0)) AS dormant_count,
  COALESCE(SUM(deal_value) FILTER (WHERE org_lifecycle_stage = 'trial_expired' AND (deal_value IS NULL OR deal_value = 0)), 0) AS dormant_value,

  -- Lost
  COUNT(*) FILTER (WHERE org_lifecycle_stage = 'lost') AS lost_count,

  -- Prospects (all non-trial stages)
  COUNT(*) FILTER (WHERE org_lifecycle_stage = 'prospect') AS early_prospects_count,

  -- Total demos (orgs with demo_date set)
  COUNT(*) FILTER (WHERE demo_date IS NOT NULL) AS total_demos,

  -- Trials provided (trial_active + trial_expired + customer that came from trial)
  COUNT(*) FILTER (WHERE org_lifecycle_stage IN ('trial_active', 'trial_expired', 'customer')
    AND trial_start_date IS NOT NULL) AS trials_provided,

  -- Recently rolled out (trial started in last 7 days)
  COUNT(*) FILTER (WHERE trial_start_date >= CURRENT_DATE - INTERVAL '7 days') AS recently_rolled_out

FROM trial_organizations;

COMMENT ON VIEW leadership_pipeline_summary IS 'Aggregated pipeline metrics for leadership dashboard';

-- ============================================
-- VIEW: org_activity_status
-- Organization details with activity status based on myRA usage
-- ============================================
CREATE OR REPLACE VIEW org_activity_status AS
SELECT
  o.org_id AS id,
  o.org_name AS name,
  o.org_name AS display_name,
  o.org_lifecycle_stage AS lifecycle_stage,
  o.trial_start_date,
  o.trial_end_date,
  o.deal_value,
  NULL::decimal AS contract_value,
  NULL::decimal AS arr,
  o.sales_poc AS employee_name,
  o.account_manager_id,
  NULL::uuid AS sales_poc_id,
  o.domain AS vertical,
  o.region,
  NULL AS domain_url,
  NULL AS customer_health,
  NULL AS expected_close_date,
  o.notes,
  o.prospect_source,
  o.created_at,
  o.updated_at,

  -- Usage metrics (joined with myra_usage_logs)
  MAX(m.usage_timestamp) AS last_usage,
  CASE
    WHEN MAX(m.usage_timestamp) >= NOW() - INTERVAL '7 days' THEN 'active'
    WHEN MAX(m.usage_timestamp) >= NOW() - INTERVAL '14 days' THEN 'low_activity'
    WHEN MAX(m.usage_timestamp) IS NOT NULL THEN 'dormant'
    ELSE 'never_used'
  END AS activity_status,
  COUNT(DISTINCT m.user_name) AS active_users,
  COALESCE(SUM(m.cost_usd), 0) AS total_cost,
  COUNT(m.id) AS total_conversations,

  -- First usage date
  MIN(m.usage_timestamp) AS first_usage

FROM trial_organizations o
LEFT JOIN myra_usage_logs m ON m.matched_org_id = o.org_id
GROUP BY o.org_id;

COMMENT ON VIEW org_activity_status IS 'Organization details enriched with myRA usage activity status';

-- ============================================
-- VIEW: leadership_costs_by_org
-- Cost aggregation by organization for costs panel
-- ============================================
CREATE OR REPLACE VIEW leadership_costs_by_org AS
SELECT
  o.org_id AS org_id,
  o.org_name AS org_name,
  o.org_name AS display_name,
  o.org_lifecycle_stage AS lifecycle_stage,
  o.domain AS vertical,
  o.sales_poc AS sales_poc,
  COUNT(DISTINCT m.user_name) AS user_count,
  COUNT(m.id) AS total_conversations,
  COALESCE(SUM(m.cost_usd), 0) AS total_cost,
  MIN(m.usage_timestamp) AS first_usage,
  MAX(m.usage_timestamp) AS last_usage
FROM trial_organizations o
LEFT JOIN myra_usage_logs m ON m.matched_org_id = o.org_id
GROUP BY o.org_id, o.org_name, o.org_lifecycle_stage, o.domain, o.sales_poc
ORDER BY total_cost DESC;

COMMENT ON VIEW leadership_costs_by_org IS 'Cost breakdown by organization for leadership costs panel';

-- ============================================
-- VIEW: leadership_recently_rolled_out
-- Organizations with trial started in last 7 days
-- ============================================
CREATE OR REPLACE VIEW leadership_recently_rolled_out AS
SELECT
  o.org_id AS id,
  o.org_name AS name,
  o.org_name AS display_name,
  o.org_lifecycle_stage AS lifecycle_stage,
  o.trial_start_date,
  o.trial_end_date,
  o.deal_value,
  o.sales_poc AS sales_poc,
  o.domain AS vertical,
  o.region,
  NULL AS domain_url,
  COUNT(DISTINCT m.user_name) AS active_users,
  COUNT(m.id) AS conversations,
  COALESCE(SUM(m.cost_usd), 0) AS total_cost,
  MAX(m.usage_timestamp) AS last_usage,
  CASE
    WHEN MAX(m.usage_timestamp) >= NOW() - INTERVAL '7 days' THEN 'active'
    WHEN MAX(m.usage_timestamp) >= NOW() - INTERVAL '14 days' THEN 'low_activity'
    WHEN MAX(m.usage_timestamp) IS NOT NULL THEN 'dormant'
    ELSE 'never_used'
  END AS activity_status
FROM trial_organizations o
LEFT JOIN myra_usage_logs m ON m.matched_org_id = o.org_id
WHERE o.trial_start_date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY o.org_id
ORDER BY o.trial_start_date DESC;

COMMENT ON VIEW leadership_recently_rolled_out IS 'Recently rolled out trials (last 7 days) with usage status';

-- ============================================
-- VIEW: leadership_stage_orgs
-- Organizations grouped by leadership stage for pipeline cards
-- ============================================
CREATE OR REPLACE VIEW leadership_stage_orgs AS
SELECT
  o.org_id AS id,
  o.org_name AS name,
  o.org_name AS display_name,
  o.org_lifecycle_stage AS lifecycle_stage,
  CASE
    WHEN o.org_lifecycle_stage = 'customer' THEN 'paying'
    WHEN o.org_lifecycle_stage = 'trial_expired' AND o.deal_value > 0 THEN 'strong_prospects'
    WHEN o.org_lifecycle_stage = 'trial_pending' THEN 'prospects'
    WHEN o.org_lifecycle_stage = 'trial_active' THEN 'active'
    WHEN o.org_lifecycle_stage = 'trial_expired' AND (o.deal_value IS NULL OR o.deal_value = 0) THEN 'dormant'
    WHEN o.org_lifecycle_stage = 'lost' THEN 'lost'
    WHEN o.org_lifecycle_stage = 'prospect' THEN 'prospects'
    ELSE 'other'
  END AS leadership_stage,
  COALESCE(o.deal_value, 0) AS deal_value,
  0 AS contract_value,
  0 AS arr,
  o.sales_poc AS sales_poc,
  o.sales_poc AS employee_name,
  o.domain AS vertical,
  o.region,
  o.trial_start_date,
  o.trial_end_date,
  NULL AS expected_close_date,
  NULL AS customer_health,
  o.notes,
  o.created_at,
  o.updated_at
FROM trial_organizations o
ORDER BY
  CASE o.org_lifecycle_stage
    WHEN 'customer' THEN 1
    WHEN 'trial_expired' THEN 2
    WHEN 'trial_active' THEN 3
    WHEN 'trial_pending' THEN 4
    WHEN 'prospect' THEN 5
    WHEN 'lost' THEN 6
    ELSE 7
  END,
  COALESCE(o.deal_value, 0) DESC;

COMMENT ON VIEW leadership_stage_orgs IS 'Organizations mapped to leadership pipeline stages';

-- ============================================
-- TABLE: leadership_campaigns
-- Track outbound (HubSpot, Apollo) and inbound campaigns
-- ============================================
CREATE TABLE IF NOT EXISTS leadership_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Campaign identity
  name TEXT NOT NULL,
  description TEXT,

  -- Campaign type
  campaign_type TEXT NOT NULL CHECK (campaign_type IN ('hubspot', 'apollo', 'inbound', 'other')),

  -- Campaign metrics
  total_outreach INTEGER DEFAULT 0,
  total_responses INTEGER DEFAULT 0,
  total_leads INTEGER DEFAULT 0,
  qualified_leads INTEGER DEFAULT 0,
  ongoing_cases INTEGER DEFAULT 0,

  -- External tracking
  external_id TEXT,
  external_url TEXT,

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
  start_date DATE,
  end_date DATE,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID
);

CREATE INDEX IF NOT EXISTS idx_campaigns_type ON leadership_campaigns(campaign_type);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON leadership_campaigns(status);

-- RLS for campaigns
ALTER TABLE leadership_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leadership_campaigns_all" ON leadership_campaigns;
CREATE POLICY "leadership_campaigns_all" ON leadership_campaigns
  FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE leadership_campaigns IS 'Track outbound (HubSpot, Apollo) and inbound marketing campaigns';

-- ============================================
-- TABLE: leadership_campaign_orgs
-- Link campaigns to organizations for attribution
-- ============================================
CREATE TABLE IF NOT EXISTS leadership_campaign_orgs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES leadership_campaigns(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES trial_organizations(org_id) ON DELETE CASCADE,

  -- Attribution details
  attribution_type TEXT DEFAULT 'primary' CHECK (attribution_type IN ('primary', 'secondary', 'influenced')),
  attributed_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,

  -- Unique constraint to prevent duplicates
  UNIQUE(campaign_id, org_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_orgs_campaign ON leadership_campaign_orgs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_orgs_org ON leadership_campaign_orgs(org_id);

-- RLS for campaign orgs
ALTER TABLE leadership_campaign_orgs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leadership_campaign_orgs_all" ON leadership_campaign_orgs;
CREATE POLICY "leadership_campaign_orgs_all" ON leadership_campaign_orgs
  FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE leadership_campaign_orgs IS 'Campaign to organization attribution for tracking source';

-- ============================================
-- VIEW: leadership_campaign_summary
-- Campaign summary with attributed org counts
-- ============================================
CREATE OR REPLACE VIEW leadership_campaign_summary AS
SELECT
  c.id,
  c.name,
  c.description,
  c.campaign_type,
  c.total_outreach,
  c.total_responses,
  c.total_leads,
  c.qualified_leads,
  c.ongoing_cases,
  c.status,
  c.start_date,
  c.end_date,
  c.external_url,
  c.created_at,
  COUNT(DISTINCT co.org_id) AS attributed_orgs,
  COUNT(DISTINCT CASE WHEN o.org_lifecycle_stage = 'customer' THEN co.org_id END) AS converted_orgs,
  COALESCE(SUM(o.deal_value), 0) AS attributed_value
FROM leadership_campaigns c
LEFT JOIN leadership_campaign_orgs co ON co.campaign_id = c.id
LEFT JOIN trial_organizations o ON o.org_id = co.org_id
GROUP BY c.id
ORDER BY c.created_at DESC;

COMMENT ON VIEW leadership_campaign_summary IS 'Campaign metrics with attribution summary';

-- ============================================
-- VIEW: leadership_team_performance
-- Sales POC performance metrics
-- ============================================
CREATE OR REPLACE VIEW leadership_team_performance AS
SELECT
  o.sales_poc AS sales_poc,
  COUNT(*) AS total_orgs,
  COUNT(*) FILTER (WHERE o.org_lifecycle_stage = 'customer') AS won_deals,
  COUNT(*) FILTER (WHERE o.demo_date IS NOT NULL) AS demos,
  COUNT(*) FILTER (WHERE o.org_lifecycle_stage IN ('trial_active', 'trial_expired')) AS trials,
  COUNT(*) FILTER (WHERE o.org_lifecycle_stage = 'trial_expired' AND o.deal_value > 0) AS in_negotiation,
  COUNT(*) FILTER (WHERE o.org_lifecycle_stage = 'lost') AS lost,

  -- Values
  COALESCE(SUM(o.deal_value) FILTER (WHERE o.org_lifecycle_stage NOT IN ('customer', 'lost')), 0) AS pipeline_value,
  COALESCE(SUM(o.deal_value) FILTER (WHERE o.org_lifecycle_stage = 'customer'), 0) AS won_value,
  0 AS total_arr,

  -- Conversion metrics
  CASE
    WHEN COUNT(*) FILTER (WHERE o.org_lifecycle_stage IN ('trial_active', 'trial_expired', 'customer', 'lost')) > 0
    THEN ROUND(
      100.0 * COUNT(*) FILTER (WHERE o.org_lifecycle_stage = 'customer') /
      COUNT(*) FILTER (WHERE o.org_lifecycle_stage IN ('trial_active', 'trial_expired', 'customer', 'lost'))
    , 1)
    ELSE 0
  END AS trial_to_won_rate,

  -- Activity metrics
  AVG(EXTRACT(EPOCH FROM (o.updated_at - o.created_at)) / 86400)::INTEGER AS avg_days_in_pipeline

FROM trial_organizations o
WHERE o.sales_poc IS NOT NULL
GROUP BY o.sales_poc
ORDER BY won_value DESC;

COMMENT ON VIEW leadership_team_performance IS 'Sales POC performance metrics for team tab';

-- ============================================
-- Trigger for campaigns updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_leadership_campaigns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS leadership_campaigns_updated_at ON leadership_campaigns;
CREATE TRIGGER leadership_campaigns_updated_at
  BEFORE UPDATE ON leadership_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_leadership_campaigns_updated_at();
