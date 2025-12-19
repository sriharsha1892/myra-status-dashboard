-- Organizations table for B2B sales pipeline
-- Supports hierarchy (parent/subsidiaries) and org-level tracking

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Hierarchy
  parent_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  display_name TEXT,

  -- Company info
  industry TEXT,
  country TEXT,
  region TEXT,

  -- Pipeline status
  status TEXT DEFAULT 'prospect' CHECK (status IN ('prospect', 'demo_done', 'trial_access', 'negotiation', 'rejected', 'onboarded')),
  status_updated_at TIMESTAMPTZ,
  rejection_reason TEXT CHECK (rejection_reason IS NULL OR rejection_reason IN ('competitor', 'budget', 'timing', 'no_response', 'not_fit', 'other')),

  -- Trial tracking
  trial_status TEXT DEFAULT 'not_requested' CHECK (trial_status IN ('not_requested', 'requested', 'scheduled', 'active', 'inactive', 'revoked', 'extended', 'expired')),
  trial_start_date DATE,
  trial_end_date DATE,
  trial_given_date DATE,
  trial_usage_notes TEXT,
  login_status TEXT DEFAULT 'not_logged_in' CHECK (login_status IN ('not_logged_in', 'logged_in', 'login_issues')),

  -- Onboarding details (when status = 'onboarded')
  deal_value DECIMAL(12,2),
  contract_period_months INTEGER,
  num_users INTEGER,
  arr DECIMAL(12,2),
  contract_start_date DATE,
  contract_end_date DATE,
  renewal_date DATE,

  -- Assignment
  employee_name TEXT,

  -- Notes
  notes TEXT,
  pain_points TEXT,
  current_tools TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for hierarchy queries
CREATE INDEX IF NOT EXISTS idx_organizations_parent ON organizations(parent_id);

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(status);

-- Index for trial status filtering
CREATE INDEX IF NOT EXISTS idx_organizations_trial_status ON organizations(trial_status);

-- Add organization_id to sales_pipeline (contacts table)
ALTER TABLE sales_pipeline ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

-- Index for contact lookups by org
CREATE INDEX IF NOT EXISTS idx_sales_pipeline_org ON sales_pipeline(organization_id);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_organizations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS organizations_updated_at ON organizations;
CREATE TRIGGER organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_organizations_updated_at();
