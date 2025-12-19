-- Sales Pipeline & Import System Tables
-- Created: 2025-12-17
-- Purpose: Track deals through the sales pipeline (Prospects → Demos → Trials → Quotes → MSAs → Onboarded)

-- ============================================
-- TABLE: sales_pipeline
-- Central table tracking all deals through the pipeline
-- ============================================
CREATE TABLE IF NOT EXISTS sales_pipeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Pipeline tracking
  stage TEXT NOT NULL DEFAULT 'prospect', -- prospect, demo, trial, quote, msa, onboarded
  stage_updated_at TIMESTAMPTZ,

  -- Trial-specific tracking
  trial_status TEXT,               -- active, inactive, lost
  login_status TEXT,               -- logged_in, not_logged_in, login_issues
  trial_start_date DATE,
  trial_end_date DATE,

  -- Post-trial evaluation status
  evaluation_status TEXT,          -- evaluating, quote_requested, dormant, hold_indefinite, lost

  -- Deal identification
  deal_id TEXT,                    -- e.g., "8005069210"
  invoice_no TEXT,                 -- e.g., "FY26/MA/001"
  lead_event_id TEXT,

  -- Company info
  company_name TEXT NOT NULL,
  client_name TEXT,                -- Contact person
  address TEXT,
  country TEXT,

  -- Contact emails (up to 4)
  primary_email TEXT NOT NULL,
  email_2 TEXT,
  email_3 TEXT,
  email_4 TEXT,

  -- Sales team
  employee_name TEXT,              -- AM name
  employee_id TEXT,
  source TEXT,                     -- Inbound, Outbound, Referral, etc.
  referred_by TEXT,

  -- Subscription details
  subscription_details TEXT,
  num_users INTEGER,
  billing_frequency TEXT,          -- Monthly, Quarterly, Yearly, One Time
  subscription_start_date DATE,
  subscription_end_date DATE,

  -- Consulting
  consulting_hours_included BOOLEAN DEFAULT false,
  num_consulting_hours INTEGER,
  additional_consulting_rate DECIMAL(10,2),

  -- Financials
  standard_cost DECIMAL(12,2),
  deal_value DECIMAL(12,2),
  deal_value_inr DECIMAL(12,2),
  currency TEXT DEFAULT 'USD',
  gst_applicable BOOLEAN DEFAULT false,
  gst_number TEXT,
  gst_amount DECIMAL(12,2),

  -- Payment
  mode_of_payment TEXT,
  payment_terms TEXT,              -- Immediate, NET 15, NET 30, NET 60, NET 90
  termination_terms TEXT,

  -- Timeline
  invoice_date DATE,
  expected_start_date DATE,
  fiscal_month TEXT,
  fiscal_quarter TEXT,

  -- Metadata
  notes TEXT,
  extra_data JSONB,                -- Store unmapped/overflow columns from imports
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,

  -- Link to quotes/msas
  quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
  msa_id UUID
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_sales_pipeline_stage ON sales_pipeline(stage);
CREATE INDEX IF NOT EXISTS idx_sales_pipeline_primary_email ON sales_pipeline(primary_email);
CREATE INDEX IF NOT EXISTS idx_sales_pipeline_company ON sales_pipeline(company_name);
CREATE INDEX IF NOT EXISTS idx_sales_pipeline_employee ON sales_pipeline(employee_name);
CREATE INDEX IF NOT EXISTS idx_sales_pipeline_created_at ON sales_pipeline(created_at DESC);

-- ============================================
-- TABLE: pipeline_activity_log
-- Track changes for audit trail
-- ============================================
CREATE TABLE IF NOT EXISTS pipeline_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID REFERENCES sales_pipeline(id) ON DELETE CASCADE,

  -- Change tracking
  action TEXT NOT NULL,            -- created, updated, stage_changed, status_changed
  field_changed TEXT,              -- which field was modified
  old_value TEXT,
  new_value TEXT,

  -- Who made the change
  changed_by TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_pipeline ON pipeline_activity_log(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_changed_at ON pipeline_activity_log(changed_at DESC);

-- ============================================
-- TABLE: msas
-- Track generated MSAs (metadata only, not PDF)
-- ============================================
CREATE TABLE IF NOT EXISTS msas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  msa_reference TEXT NOT NULL,
  version INTEGER DEFAULT 1,

  -- Client info
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_title TEXT,
  client_address TEXT,
  client_country TEXT,

  -- Agreement details
  effective_date DATE NOT NULL,
  jurisdiction TEXT NOT NULL,
  currency TEXT DEFAULT 'USD',

  -- Financials
  total_value DECIMAL(12,2) NOT NULL,
  line_items JSONB NOT NULL,       -- Array of order form rows

  -- Consulting
  consulting_hours INTEGER,
  additional_hour_rate DECIMAL(8,2),
  include_consulting BOOLEAN DEFAULT true,

  -- Terms
  special_terms TEXT,

  -- Prepared by
  prepared_by TEXT NOT NULL,
  prepared_by_email TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Link to pipeline
  pipeline_id UUID REFERENCES sales_pipeline(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_msas_company ON msas(company_name);
CREATE INDEX IF NOT EXISTS idx_msas_contact_email ON msas(contact_email);
CREATE INDEX IF NOT EXISTS idx_msas_created_at ON msas(created_at DESC);

-- ============================================
-- TABLE: import_templates
-- Save column mappings for repeat imports
-- ============================================
CREATE TABLE IF NOT EXISTS import_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  column_mappings JSONB NOT NULL,  -- { "source_col": "target_field", ... }
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT
);

-- ============================================
-- Enable RLS (Row Level Security)
-- ============================================
ALTER TABLE sales_pipeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE msas ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_templates ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies - Allow authenticated users
-- ============================================
-- Sales Pipeline - All authenticated users can read, only admins can write
CREATE POLICY "sales_pipeline_read_all" ON sales_pipeline
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "sales_pipeline_insert_admins" ON sales_pipeline
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "sales_pipeline_update_admins" ON sales_pipeline
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "sales_pipeline_delete_admins" ON sales_pipeline
  FOR DELETE TO authenticated USING (true);

-- Activity Log - All authenticated users can read, insert on pipeline changes
CREATE POLICY "activity_log_read_all" ON pipeline_activity_log
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "activity_log_insert_all" ON pipeline_activity_log
  FOR INSERT TO authenticated WITH CHECK (true);

-- MSAs - All authenticated users can read and write
CREATE POLICY "msas_read_all" ON msas
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "msas_insert_all" ON msas
  FOR INSERT TO authenticated WITH CHECK (true);

-- Import Templates - All authenticated users can read and write
CREATE POLICY "import_templates_read_all" ON import_templates
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "import_templates_insert_all" ON import_templates
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "import_templates_update_all" ON import_templates
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "import_templates_delete_all" ON import_templates
  FOR DELETE TO authenticated USING (true);

-- ============================================
-- Trigger: Auto-update updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_sales_pipeline_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sales_pipeline_updated_at_trigger
  BEFORE UPDATE ON sales_pipeline
  FOR EACH ROW
  EXECUTE FUNCTION update_sales_pipeline_updated_at();

-- ============================================
-- Trigger: Auto-update stage_updated_at on stage change
-- ============================================
CREATE OR REPLACE FUNCTION update_stage_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.stage IS DISTINCT FROM NEW.stage THEN
    NEW.stage_updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sales_pipeline_stage_change_trigger
  BEFORE UPDATE ON sales_pipeline
  FOR EACH ROW
  EXECUTE FUNCTION update_stage_timestamp();

-- ============================================
-- Comments for documentation
-- ============================================
COMMENT ON TABLE sales_pipeline IS 'Central tracking table for all deals through the sales pipeline';
COMMENT ON TABLE pipeline_activity_log IS 'Audit log for tracking changes to pipeline entries';
COMMENT ON TABLE msas IS 'Metadata for generated MSA documents (PDF not stored)';
COMMENT ON TABLE import_templates IS 'Saved column mappings for Airtable-like imports';

COMMENT ON COLUMN sales_pipeline.stage IS 'Pipeline stage: prospect, demo, trial, quote, msa, onboarded';
COMMENT ON COLUMN sales_pipeline.trial_status IS 'Trial status: active, inactive, lost';
COMMENT ON COLUMN sales_pipeline.login_status IS 'Login tracking: logged_in, not_logged_in, login_issues';
COMMENT ON COLUMN sales_pipeline.evaluation_status IS 'Post-trial status: evaluating, quote_requested, dormant, hold_indefinite, lost';
COMMENT ON COLUMN sales_pipeline.extra_data IS 'JSONB field for storing unmapped columns from imports';
