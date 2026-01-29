-- Migration: Add manual cost tracking fields to trial_organizations
-- Created: 2026-01-28
-- Purpose: Allow manual entry of total_cost and conversation_count per organization

-- Add manual cost tracking column (override/supplement to calculated cost)
ALTER TABLE trial_organizations ADD COLUMN IF NOT EXISTS manual_cost DECIMAL(12,2);

-- Add manual conversation count column (override/supplement to calculated count)
ALTER TABLE trial_organizations ADD COLUMN IF NOT EXISTS manual_conversation_count INTEGER;

-- Comments for clarity
COMMENT ON COLUMN trial_organizations.manual_cost IS 'Manual cost entry in USD for organizations without myRA usage logs';
COMMENT ON COLUMN trial_organizations.manual_conversation_count IS 'Manual conversation count for organizations without myRA usage logs';

-- Update the leadership_costs_by_org view to include manual costs
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
  -- Use manual values if set, otherwise use calculated values
  COALESCE(o.manual_cost, COALESCE(SUM(m.cost_usd), 0)) AS total_cost,
  COALESCE(o.manual_conversation_count, COUNT(m.id)) AS conversation_count,
  -- Also expose raw calculated values for reference
  COALESCE(SUM(m.cost_usd), 0) AS calculated_cost,
  COUNT(m.id) AS calculated_conversations,
  MIN(m.usage_timestamp) AS first_usage,
  MAX(m.usage_timestamp) AS last_usage
FROM trial_organizations o
LEFT JOIN myra_usage_logs m ON m.matched_org_id = o.org_id
GROUP BY o.org_id, o.org_name, o.org_lifecycle_stage, o.domain, o.sales_poc, o.manual_cost, o.manual_conversation_count
ORDER BY total_cost DESC;

COMMENT ON VIEW leadership_costs_by_org IS 'Cost breakdown by organization for leadership costs panel (includes manual overrides)';
