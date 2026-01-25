-- myRA Usage Logs
-- Created: 2026-01-23
-- Purpose: Track myRA AI usage data (conversations, costs) parsed from admin panel

-- ============================================
-- TABLE: myra_usage_logs
-- Store individual conversation usage records
-- ============================================
CREATE TABLE IF NOT EXISTS myra_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Conversation details
  conversation_title TEXT,
  user_name TEXT NOT NULL,
  usage_timestamp TIMESTAMPTZ NOT NULL,
  cost_usd DECIMAL(10,2) NOT NULL,

  -- Organization/User matching
  matched_user_id UUID REFERENCES trial_users(user_id) ON DELETE SET NULL,
  matched_org_id UUID REFERENCES trial_organizations(org_id) ON DELETE SET NULL,
  match_method TEXT,                  -- 'auto', 'manual', 'fuzzy'
  match_confidence TEXT,              -- 'high', 'low', 'none'

  -- Import tracking
  raw_text TEXT,                      -- Original parsed line
  import_batch_id UUID,               -- Group entries from same paste
  import_date DATE DEFAULT CURRENT_DATE,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_myra_usage_org ON myra_usage_logs(matched_org_id);
CREATE INDEX idx_myra_usage_user ON myra_usage_logs(matched_user_id);
CREATE INDEX idx_myra_usage_date ON myra_usage_logs(usage_timestamp DESC);
CREATE INDEX idx_myra_usage_import ON myra_usage_logs(import_batch_id);
CREATE INDEX idx_myra_usage_user_name ON myra_usage_logs(user_name);

-- ============================================
-- TABLE: myra_user_org_mappings
-- Cache user name to org mappings for auto-matching
-- ============================================
CREATE TABLE IF NOT EXISTS myra_user_org_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_name TEXT NOT NULL,
  org_id UUID REFERENCES trial_organizations(org_id) ON DELETE CASCADE,
  user_id UUID REFERENCES trial_users(user_id) ON DELETE SET NULL,
  confidence TEXT DEFAULT 'manual',   -- 'manual', 'verified', 'suggested'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_name)
);

CREATE INDEX idx_myra_mappings_user ON myra_user_org_mappings(user_name);

-- ============================================
-- VIEW: myra_usage_summary
-- Aggregated usage stats by org and date
-- ============================================
CREATE OR REPLACE VIEW myra_usage_summary AS
SELECT
  matched_org_id,
  DATE(usage_timestamp) as usage_date,
  COUNT(*) as conversation_count,
  SUM(cost_usd) as total_cost,
  COUNT(DISTINCT user_name) as unique_users,
  ARRAY_AGG(DISTINCT user_name) as users
FROM myra_usage_logs
WHERE matched_org_id IS NOT NULL
GROUP BY matched_org_id, DATE(usage_timestamp);

-- ============================================
-- VIEW: myra_usage_by_user
-- Usage breakdown by user name
-- ============================================
CREATE OR REPLACE VIEW myra_usage_by_user AS
SELECT
  user_name,
  matched_org_id,
  COUNT(*) as conversation_count,
  SUM(cost_usd) as total_cost,
  MIN(usage_timestamp) as first_usage,
  MAX(usage_timestamp) as last_usage
FROM myra_usage_logs
GROUP BY user_name, matched_org_id;

-- ============================================
-- VIEW: myra_usage_totals
-- Overall usage totals
-- ============================================
CREATE OR REPLACE VIEW myra_usage_totals AS
SELECT
  COUNT(*) as total_conversations,
  SUM(cost_usd) as total_cost,
  COUNT(DISTINCT user_name) as total_users,
  COUNT(DISTINCT matched_org_id) as total_orgs,
  MIN(usage_timestamp) as earliest_usage,
  MAX(usage_timestamp) as latest_usage,
  COUNT(*) FILTER (WHERE usage_timestamp >= NOW() - INTERVAL '7 days') as conversations_last_7_days,
  SUM(cost_usd) FILTER (WHERE usage_timestamp >= NOW() - INTERVAL '7 days') as cost_last_7_days,
  COUNT(*) FILTER (WHERE usage_timestamp >= NOW() - INTERVAL '30 days') as conversations_last_30_days,
  SUM(cost_usd) FILTER (WHERE usage_timestamp >= NOW() - INTERVAL '30 days') as cost_last_30_days
FROM myra_usage_logs;

-- ============================================
-- Enable RLS
-- ============================================
ALTER TABLE myra_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE myra_user_org_mappings ENABLE ROW LEVEL SECURITY;

-- Allow all operations (internal tool)
CREATE POLICY "myra_usage_logs_all" ON myra_usage_logs
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "myra_user_org_mappings_all" ON myra_user_org_mappings
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- Trigger for mappings updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_myra_mappings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER myra_mappings_updated_at_trigger
  BEFORE UPDATE ON myra_user_org_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_myra_mappings_updated_at();

-- ============================================
-- Comments
-- ============================================
COMMENT ON TABLE myra_usage_logs IS 'Individual myRA AI conversation usage records with costs';
COMMENT ON TABLE myra_user_org_mappings IS 'Cached mappings from user names to organizations for auto-matching';
COMMENT ON VIEW myra_usage_summary IS 'Aggregated usage stats by organization and date';
COMMENT ON VIEW myra_usage_by_user IS 'Usage breakdown by user name';
COMMENT ON VIEW myra_usage_totals IS 'Overall usage totals and recent stats';
