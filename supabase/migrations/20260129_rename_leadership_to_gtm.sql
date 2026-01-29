-- Migration: Rename leadership → gtm across database objects
-- Created: 2026-01-29
-- Purpose: Rebrand "leadership" to "gtm" (go-to-market) for consistency

-- ============================================
-- PART 1: Rename tables
-- ============================================

ALTER TABLE leadership_campaigns RENAME TO gtm_campaigns;
ALTER TABLE leadership_campaign_orgs RENAME TO gtm_campaign_orgs;

-- ============================================
-- PART 2: Drop and recreate views with gtm_ prefix
-- Views cannot be renamed in Postgres, must drop & recreate
-- ============================================

-- Drop all leadership views (order matters for dependencies)
DROP VIEW IF EXISTS leadership_campaign_summary;
DROP VIEW IF EXISTS leadership_team_performance;
DROP VIEW IF EXISTS leadership_stage_orgs;
DROP VIEW IF EXISTS leadership_recently_rolled_out;
DROP VIEW IF EXISTS leadership_costs_by_org;
DROP VIEW IF EXISTS leadership_pipeline_summary;

-- Recreate: gtm_pipeline_summary
CREATE OR REPLACE VIEW gtm_pipeline_summary AS
SELECT
  COUNT(*) FILTER (WHERE org_lifecycle_stage = 'customer') AS paying_count,
  COALESCE(SUM(deal_value) FILTER (WHERE org_lifecycle_stage = 'customer'), 0) AS paying_value,
  COUNT(*) FILTER (WHERE org_lifecycle_stage = 'trial_expired' AND deal_value > 0) AS strong_prospects_count,
  COALESCE(SUM(deal_value) FILTER (WHERE org_lifecycle_stage = 'trial_expired' AND deal_value > 0), 0) AS strong_prospects_value,
  COUNT(*) FILTER (WHERE org_lifecycle_stage = 'trial_pending') AS prospects_count,
  COALESCE(SUM(deal_value) FILTER (WHERE org_lifecycle_stage = 'trial_pending'), 0) AS prospects_value,
  COUNT(*) FILTER (WHERE org_lifecycle_stage = 'trial_active') AS active_count,
  COALESCE(SUM(deal_value) FILTER (WHERE org_lifecycle_stage = 'trial_active'), 0) AS active_value,
  COUNT(*) FILTER (WHERE org_lifecycle_stage = 'trial_expired' AND (deal_value IS NULL OR deal_value = 0)) AS dormant_count,
  COALESCE(SUM(deal_value) FILTER (WHERE org_lifecycle_stage = 'trial_expired' AND (deal_value IS NULL OR deal_value = 0)), 0) AS dormant_value,
  COUNT(*) FILTER (WHERE org_lifecycle_stage = 'lost') AS lost_count,
  COUNT(*) FILTER (WHERE org_lifecycle_stage = 'prospect') AS early_prospects_count,
  COUNT(*) FILTER (WHERE demo_date IS NOT NULL) AS total_demos,
  COUNT(*) FILTER (WHERE org_lifecycle_stage IN ('trial_active', 'trial_expired', 'customer')
    AND trial_start_date IS NOT NULL) AS trials_provided,
  COUNT(*) FILTER (WHERE trial_start_date >= CURRENT_DATE - INTERVAL '7 days') AS recently_rolled_out
FROM trial_organizations;

COMMENT ON VIEW gtm_pipeline_summary IS 'Aggregated pipeline metrics for GTM dashboard';

-- Recreate: org_activity_status (unchanged, no rename needed)
-- This view has no leadership_ prefix, keeping as-is

-- Recreate: gtm_costs_by_org
CREATE OR REPLACE VIEW gtm_costs_by_org AS
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

COMMENT ON VIEW gtm_costs_by_org IS 'Cost breakdown by organization for GTM costs panel';

-- Recreate: gtm_recently_rolled_out
CREATE OR REPLACE VIEW gtm_recently_rolled_out AS
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

COMMENT ON VIEW gtm_recently_rolled_out IS 'Recently rolled out trials (last 7 days) with usage status';

-- Recreate: gtm_stage_orgs (with gtm_stage column alias)
CREATE OR REPLACE VIEW gtm_stage_orgs AS
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
  END AS gtm_stage,
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

COMMENT ON VIEW gtm_stage_orgs IS 'Organizations mapped to GTM pipeline stages';

-- Recreate: gtm_campaign_summary
CREATE OR REPLACE VIEW gtm_campaign_summary AS
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
FROM gtm_campaigns c
LEFT JOIN gtm_campaign_orgs co ON co.campaign_id = c.id
LEFT JOIN trial_organizations o ON o.org_id = co.org_id
GROUP BY c.id
ORDER BY c.created_at DESC;

COMMENT ON VIEW gtm_campaign_summary IS 'Campaign metrics with attribution summary';

-- Recreate: gtm_team_performance
CREATE OR REPLACE VIEW gtm_team_performance AS
SELECT
  o.sales_poc AS sales_poc,
  COUNT(*) AS total_orgs,
  COUNT(*) FILTER (WHERE o.org_lifecycle_stage = 'customer') AS won_deals,
  COUNT(*) FILTER (WHERE o.demo_date IS NOT NULL) AS demos,
  COUNT(*) FILTER (WHERE o.org_lifecycle_stage IN ('trial_active', 'trial_expired')) AS trials,
  COUNT(*) FILTER (WHERE o.org_lifecycle_stage = 'trial_expired' AND o.deal_value > 0) AS in_negotiation,
  COUNT(*) FILTER (WHERE o.org_lifecycle_stage = 'lost') AS lost,
  COALESCE(SUM(o.deal_value) FILTER (WHERE o.org_lifecycle_stage NOT IN ('customer', 'lost')), 0) AS pipeline_value,
  COALESCE(SUM(o.deal_value) FILTER (WHERE o.org_lifecycle_stage = 'customer'), 0) AS won_value,
  0 AS total_arr,
  CASE
    WHEN COUNT(*) FILTER (WHERE o.org_lifecycle_stage IN ('trial_active', 'trial_expired', 'customer', 'lost')) > 0
    THEN ROUND(
      100.0 * COUNT(*) FILTER (WHERE o.org_lifecycle_stage = 'customer') /
      COUNT(*) FILTER (WHERE o.org_lifecycle_stage IN ('trial_active', 'trial_expired', 'customer', 'lost'))
    , 1)
    ELSE 0
  END AS trial_to_won_rate,
  AVG(EXTRACT(EPOCH FROM (o.updated_at - o.created_at)) / 86400)::INTEGER AS avg_days_in_pipeline
FROM trial_organizations o
WHERE o.sales_poc IS NOT NULL
GROUP BY o.sales_poc
ORDER BY won_value DESC;

COMMENT ON VIEW gtm_team_performance IS 'Sales POC performance metrics for team tab';

-- ============================================
-- PART 3: Rename trigger function and trigger
-- ============================================

DROP TRIGGER IF EXISTS leadership_campaigns_updated_at ON gtm_campaigns;
DROP FUNCTION IF EXISTS update_leadership_campaigns_updated_at();

CREATE OR REPLACE FUNCTION update_gtm_campaigns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER gtm_campaigns_updated_at
  BEFORE UPDATE ON gtm_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_gtm_campaigns_updated_at();

-- ============================================
-- PART 4: Rename RLS policies
-- ============================================

-- Drop old policies and create new ones on renamed tables
DROP POLICY IF EXISTS "leadership_campaigns_all" ON gtm_campaigns;
CREATE POLICY "gtm_campaigns_all" ON gtm_campaigns
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "leadership_campaign_orgs_all" ON gtm_campaign_orgs;
CREATE POLICY "gtm_campaign_orgs_all" ON gtm_campaign_orgs
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- PART 5: Rename indexes (drop old, create new on renamed tables)
-- ============================================

DROP INDEX IF EXISTS idx_campaigns_type;
DROP INDEX IF EXISTS idx_campaigns_status;
DROP INDEX IF EXISTS idx_campaign_orgs_campaign;
DROP INDEX IF EXISTS idx_campaign_orgs_org;

CREATE INDEX IF NOT EXISTS idx_gtm_campaigns_type ON gtm_campaigns(campaign_type);
CREATE INDEX IF NOT EXISTS idx_gtm_campaigns_status ON gtm_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_gtm_campaign_orgs_campaign ON gtm_campaign_orgs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_gtm_campaign_orgs_org ON gtm_campaign_orgs(org_id);
