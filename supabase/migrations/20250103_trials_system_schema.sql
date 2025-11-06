-- Migration: Complete Trials Management System Schema
-- Description: Org → Users → Activity hierarchy with analytics

-- ============================================================================
-- SALES POCs TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS sales_pocs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  account_manager_id UUID NOT NULL REFERENCES users(id),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sales_pocs_account_manager ON sales_pocs(account_manager_id);
CREATE INDEX idx_sales_pocs_email ON sales_pocs(email);

-- ============================================================================
-- ENHANCE TRIAL ORGANIZATIONS TABLE
-- ============================================================================
-- Add new columns to existing trial_organizations table if they don't exist
ALTER TABLE trial_organizations ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE trial_organizations ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE trial_organizations ADD COLUMN IF NOT EXISTS domain TEXT CHECK (domain IN ('TMT', 'NEO', 'AF&B', 'E&C', 'HC', 'AAD'));
ALTER TABLE trial_organizations ADD COLUMN IF NOT EXISTS sales_poc_id UUID REFERENCES sales_pocs(id) ON DELETE SET NULL;
ALTER TABLE trial_organizations ADD COLUMN IF NOT EXISTS account_manager_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE trial_organizations ADD COLUMN IF NOT EXISTS trial_request_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE trial_organizations ADD COLUMN IF NOT EXISTS trial_access_provided_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE trial_organizations ADD COLUMN IF NOT EXISTS trial_expiry_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE trial_organizations ADD COLUMN IF NOT EXISTS trial_status TEXT DEFAULT 'requested' CHECK (trial_status IN ('requested', 'approved', 'in_progress', 'active', 'extended', 'completed', 'closed'));
ALTER TABLE trial_organizations ADD COLUMN IF NOT EXISTS access_provided_by UUID REFERENCES users(id);
ALTER TABLE trial_organizations ADD COLUMN IF NOT EXISTS access_provided_by_role TEXT CHECK (access_provided_by_role IN ('product', 'admin'));

CREATE INDEX IF NOT EXISTS idx_trial_orgs_sales_poc ON trial_organizations(sales_poc_id);
CREATE INDEX IF NOT EXISTS idx_trial_orgs_account_manager ON trial_organizations(account_manager_id);
CREATE INDEX IF NOT EXISTS idx_trial_orgs_domain ON trial_organizations(domain);
CREATE INDEX IF NOT EXISTS idx_trial_orgs_status ON trial_organizations(trial_status);

-- ============================================================================
-- ENHANCE TRIAL USERS TABLE
-- ============================================================================
ALTER TABLE trial_users ADD COLUMN IF NOT EXISTS freshsales_id TEXT;
ALTER TABLE trial_users ADD COLUMN IF NOT EXISTS is_primary_contact BOOLEAN DEFAULT false;
ALTER TABLE trial_users ADD COLUMN IF NOT EXISTS user_designation TEXT;
ALTER TABLE trial_users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_trial_users_freshsales ON trial_users(freshsales_id);
CREATE INDEX IF NOT EXISTS idx_trial_users_primary_contact ON trial_users(is_primary_contact);

-- ============================================================================
-- TRIAL SUPPORT QUERIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS trial_support_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES trial_organizations(org_id) ON DELETE CASCADE,
  user_id UUID REFERENCES trial_users(user_id) ON DELETE SET NULL, -- NULL if org-level query

  query_type TEXT NOT NULL CHECK (query_type IN (
    'general_support',
    'security_related',
    'functionality_related',
    'onboard_more_users',
    'technical_guidance',
    'other'
  )),

  title TEXT NOT NULL,
  description TEXT,

  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),

  -- Who logged this query
  created_by UUID NOT NULL REFERENCES users(id),
  created_by_role TEXT CHECK (created_by_role IN ('account_manager', 'product', 'admin')),

  -- Product/Admin response
  product_notes TEXT,
  product_updated_by UUID REFERENCES users(id),
  product_updated_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_support_queries_org ON trial_support_queries(org_id);
CREATE INDEX idx_support_queries_user ON trial_support_queries(user_id);
CREATE INDEX idx_support_queries_status ON trial_support_queries(status);
CREATE INDEX idx_support_queries_type ON trial_support_queries(query_type);

-- ============================================================================
-- TRIAL ENGAGEMENT LOG TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS trial_engagement_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES trial_organizations(org_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES trial_users(user_id) ON DELETE CASCADE,

  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'trial_access_requested',
    'trial_access_provided',
    'user_logged_in',
    'usage_observed',
    'feedback_received',
    'learning_captured',
    'follow_up_note',
    'trial_extended'
  )),

  description TEXT NOT NULL,
  observations TEXT, -- Additional details

  -- Who logged this
  logged_by UUID NOT NULL REFERENCES users(id),
  logged_by_role TEXT CHECK (logged_by_role IN ('account_manager', 'product', 'admin')),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_engagement_log_org ON trial_engagement_log(org_id);
CREATE INDEX idx_engagement_log_user ON trial_engagement_log(user_id);
CREATE INDEX idx_engagement_log_type ON trial_engagement_log(activity_type);
CREATE INDEX idx_engagement_log_created ON trial_engagement_log(created_at DESC);

-- ============================================================================
-- TRIAL EXTENSIONS TABLE (to track extended trial dates)
-- ============================================================================
CREATE TABLE IF NOT EXISTS trial_extensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES trial_organizations(org_id) ON DELETE CASCADE,

  extended_from_date TIMESTAMP WITH TIME ZONE NOT NULL,
  extended_to_date TIMESTAMP WITH TIME ZONE NOT NULL,

  reason TEXT,
  approved_by UUID NOT NULL REFERENCES users(id),
  approved_by_role TEXT CHECK (approved_by_role IN ('product', 'admin')),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_trial_extensions_org ON trial_extensions(org_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Sales POCs - admins and users can read, only admins can modify
ALTER TABLE sales_pocs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for now on sales_pocs" ON sales_pocs
  FOR ALL USING (true) WITH CHECK (true);

-- Trial Organizations - role-based access
ALTER TABLE trial_organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for now on trial_orgs" ON trial_organizations
  FOR ALL USING (true) WITH CHECK (true);

-- Trial Users
ALTER TABLE trial_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for now on trial_users" ON trial_users
  FOR ALL USING (true) WITH CHECK (true);

-- Support Queries
ALTER TABLE trial_support_queries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for now on support_queries" ON trial_support_queries
  FOR ALL USING (true) WITH CHECK (true);

-- Engagement Log
ALTER TABLE trial_engagement_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for now on engagement_log" ON trial_engagement_log
  FOR ALL USING (true) WITH CHECK (true);

-- Trial Extensions
ALTER TABLE trial_extensions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for now on trial_extensions" ON trial_extensions
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE sales_pocs IS 'Sales POCs (Point of Contacts) - 50 total, each assigned to Account Managers';
COMMENT ON TABLE trial_organizations IS 'Trial organizations with lifecycle tracking and sales/account manager assignment';
COMMENT ON TABLE trial_users IS 'Users within each trial organization with Freshsales integration';
COMMENT ON TABLE trial_support_queries IS 'Support queries logged by Account Managers, resolved by Product/Admin teams';
COMMENT ON TABLE trial_engagement_log IS 'User-level engagement log: logins, usage, feedback, learnings, notes';
COMMENT ON TABLE trial_extensions IS 'Track trial period extensions beyond initial 14 days';
