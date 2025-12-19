-- Migration: Unified Organizations Table
-- Merges organizations + trial_organizations into single source of truth
-- Supports full lifecycle: prospect -> trial -> customer

-- ============ ORGANIZATIONS_UNIFIED TABLE ============

CREATE TABLE IF NOT EXISTS organizations_unified (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ============ HIERARCHY ============
  parent_id UUID REFERENCES organizations_unified(id) ON DELETE SET NULL,

  -- ============ IDENTITY ============
  name TEXT NOT NULL,
  display_name TEXT,
  domain TEXT,                          -- Company email domain
  website_url TEXT,
  logo_url TEXT,
  description TEXT,

  -- ============ COMPANY INFO ============
  industry TEXT,
  vertical TEXT CHECK (vertical IS NULL OR vertical IN ('TMT', 'NEO', 'AF&B', 'E&C', 'HC', 'AAD', 'Unassigned')),
  country TEXT,
  region TEXT,                          -- MEA, EMEA, APAC, Americas, Global
  team_size INTEGER,

  -- ============ LIFECYCLE STAGE (Single Source of Truth) ============
  lifecycle_stage TEXT NOT NULL DEFAULT 'prospect' CHECK (lifecycle_stage IN (
    'prospect',           -- Pre-engagement cold/warm lead
    'demo_scheduled',     -- Demo meeting booked
    'demo_done',          -- Demo completed, evaluating
    'trial_pending',      -- Trial requested but not yet provided
    'trial_active',       -- Active trial in progress
    'trial_expired',      -- Trial ended, not converted
    'negotiation',        -- In contract negotiation
    'onboarded',          -- Paying customer
    'churned',            -- Former customer
    'lost'                -- Lost deal (never converted)
  )),
  lifecycle_stage_updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- ============ PROSPECT TRACKING ============
  prospect_source TEXT CHECK (prospect_source IS NULL OR prospect_source IN (
    'cold_outreach', 'inbound', 'referral', 'event', 'linkedin', 'website', 'other'
  )),
  icp_fit_score INTEGER CHECK (icp_fit_score IS NULL OR (icp_fit_score >= 0 AND icp_fit_score <= 100)),

  -- ============ TRIAL TRACKING ============
  trial_status TEXT CHECK (trial_status IS NULL OR trial_status IN (
    'not_requested', 'requested', 'approved', 'active', 'extended', 'expired', 'revoked'
  )),
  trial_requested_date DATE,
  trial_start_date DATE,
  trial_end_date DATE,
  trial_extended_until DATE,
  login_status TEXT DEFAULT 'not_logged_in' CHECK (login_status IS NULL OR login_status IN (
    'not_logged_in', 'logged_in', 'login_issues'
  )),
  trial_usage_notes TEXT,

  -- ============ DEAL TRACKING ============
  deal_value DECIMAL(12,2),
  deal_currency TEXT DEFAULT 'USD',
  expected_close_date DATE,
  deal_outcome TEXT CHECK (deal_outcome IS NULL OR deal_outcome IN ('won', 'lost', 'deferred')),
  deal_outcome_reason TEXT,
  deal_deferred_until DATE,

  -- ============ CUSTOMER DETAILS (when lifecycle_stage = 'onboarded') ============
  contract_type TEXT CHECK (contract_type IS NULL OR contract_type IN ('annual', 'multi_year', 'month_to_month', 'pilot')),
  contract_value DECIMAL(12,2),
  contract_start_date DATE,
  contract_end_date DATE,
  renewal_date DATE,
  arr DECIMAL(12,2),
  num_licensed_users INTEGER,
  customer_health TEXT CHECK (customer_health IS NULL OR customer_health IN (
    'onboarding', 'healthy', 'warning', 'at_risk', 'churning'
  )),

  -- ============ CHURN TRACKING ============
  churned_at TIMESTAMPTZ,
  churn_reason TEXT,

  -- ============ ASSIGNMENT ============
  account_manager_id UUID,  -- References users table
  sales_poc_id UUID,        -- References sales_pocs table
  employee_name TEXT,       -- Fallback text field for AM name

  -- ============ DISCOVERY/QUALIFICATION ============
  pain_points TEXT,
  current_tools TEXT,
  notes TEXT,

  -- ============ REJECTION TRACKING ============
  rejection_reason TEXT CHECK (rejection_reason IS NULL OR rejection_reason IN (
    'competitor', 'budget', 'timing', 'no_response', 'not_fit', 'other'
  )),

  -- ============ METADATA ============
  parent_company TEXT CHECK (parent_company IS NULL OR parent_company IN ('Mordor Intelligence', 'GMI')),
  source_system TEXT,                   -- freshsales, manual, import, etc.
  external_id TEXT,                     -- ID from source system
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID
);

-- ============ INDEXES ============
CREATE INDEX IF NOT EXISTS idx_org_unified_parent ON organizations_unified(parent_id);
CREATE INDEX IF NOT EXISTS idx_org_unified_lifecycle ON organizations_unified(lifecycle_stage);
CREATE INDEX IF NOT EXISTS idx_org_unified_trial_status ON organizations_unified(trial_status);
CREATE INDEX IF NOT EXISTS idx_org_unified_account_manager ON organizations_unified(account_manager_id);
CREATE INDEX IF NOT EXISTS idx_org_unified_vertical ON organizations_unified(vertical);
CREATE INDEX IF NOT EXISTS idx_org_unified_domain ON organizations_unified(domain);
CREATE INDEX IF NOT EXISTS idx_org_unified_name ON organizations_unified(name);
CREATE INDEX IF NOT EXISTS idx_org_unified_health ON organizations_unified(customer_health)
  WHERE lifecycle_stage = 'onboarded';
CREATE INDEX IF NOT EXISTS idx_org_unified_renewal ON organizations_unified(renewal_date)
  WHERE lifecycle_stage = 'onboarded';

-- ============ UPDATED_AT TRIGGER ============
CREATE OR REPLACE FUNCTION update_org_unified_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  -- Track lifecycle stage changes
  IF OLD.lifecycle_stage IS DISTINCT FROM NEW.lifecycle_stage THEN
    NEW.lifecycle_stage_updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS org_unified_updated_at ON organizations_unified;
CREATE TRIGGER org_unified_updated_at
  BEFORE UPDATE ON organizations_unified
  FOR EACH ROW
  EXECUTE FUNCTION update_org_unified_updated_at();

-- ============ RLS POLICIES ============
ALTER TABLE organizations_unified ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_unified_select_authenticated" ON organizations_unified
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "org_unified_insert_authenticated" ON organizations_unified
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "org_unified_update_authenticated" ON organizations_unified
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "org_unified_delete_authenticated" ON organizations_unified
  FOR DELETE TO authenticated USING (true);

-- Also allow service role full access
CREATE POLICY "org_unified_service_role" ON organizations_unified
  FOR ALL TO service_role USING (true) WITH CHECK (true);
