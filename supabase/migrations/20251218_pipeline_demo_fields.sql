-- Pipeline Enhancement: Demo Log + Trial Tracking Fields
-- Created: 2025-12-18
-- Purpose: Add fields from Demo Log spreadsheet + enhanced trial tracking

-- ============================================
-- STAGE UPDATE: Align with actual workflow
-- Old: prospect, demo, trial, quote, msa, onboarded
-- New: intro, demo, pending_trial, trial, feedback, proposal, nego, won, lost
-- ============================================

-- Update stage comment
COMMENT ON COLUMN sales_pipeline.stage IS 'Pipeline stage: intro, demo, pending_trial, trial, feedback, proposal, nego, won, lost';

-- ============================================
-- Demo tracking fields (from Demo Call Log sheet)
-- ============================================
ALTER TABLE sales_pipeline ADD COLUMN IF NOT EXISTS demo_date DATE;
ALTER TABLE sales_pipeline ADD COLUMN IF NOT EXISTS current_tools TEXT;
ALTER TABLE sales_pipeline ADD COLUMN IF NOT EXISTS pain_points TEXT;
ALTER TABLE sales_pipeline ADD COLUMN IF NOT EXISTS next_steps TEXT;
ALTER TABLE sales_pipeline ADD COLUMN IF NOT EXISTS next_step_date DATE;
ALTER TABLE sales_pipeline ADD COLUMN IF NOT EXISTS demo_notes TEXT;
ALTER TABLE sales_pipeline ADD COLUMN IF NOT EXISTS expected_close TEXT;
ALTER TABLE sales_pipeline ADD COLUMN IF NOT EXISTS industry TEXT;
ALTER TABLE sales_pipeline ADD COLUMN IF NOT EXISTS client_title TEXT;

-- ============================================
-- Trial tracking fields (from Request for trial licenses sheet)
-- ============================================
ALTER TABLE sales_pipeline ADD COLUMN IF NOT EXISTS trial_requested_date DATE;
ALTER TABLE sales_pipeline ADD COLUMN IF NOT EXISTS trial_needed_date DATE;
ALTER TABLE sales_pipeline ADD COLUMN IF NOT EXISTS trial_given_date DATE;
ALTER TABLE sales_pipeline ADD COLUMN IF NOT EXISTS trial_usage_notes TEXT;

-- Update trial_status to use the new enum values
-- First, drop the existing constraint if any
ALTER TABLE sales_pipeline DROP CONSTRAINT IF EXISTS valid_trial_status;

-- Add check constraint for trial_status
ALTER TABLE sales_pipeline ADD CONSTRAINT valid_trial_status
  CHECK (trial_status IS NULL OR trial_status IN ('not_requested', 'requested', 'scheduled', 'active', 'inactive', 'expired'));

-- ============================================
-- Indexes for new fields
-- ============================================
CREATE INDEX IF NOT EXISTS idx_sales_pipeline_trial_status ON sales_pipeline(trial_status);
CREATE INDEX IF NOT EXISTS idx_sales_pipeline_industry ON sales_pipeline(industry);
CREATE INDEX IF NOT EXISTS idx_sales_pipeline_demo_date ON sales_pipeline(demo_date);

-- ============================================
-- Comments for documentation
-- ============================================
COMMENT ON COLUMN sales_pipeline.demo_date IS 'Date when demo was conducted';
COMMENT ON COLUMN sales_pipeline.current_tools IS 'Current AI/Research tools used by prospect';
COMMENT ON COLUMN sales_pipeline.pain_points IS 'Current pain points identified during discovery';
COMMENT ON COLUMN sales_pipeline.next_steps IS 'Immediate next steps after demo';
COMMENT ON COLUMN sales_pipeline.next_step_date IS 'Target date for next steps';
COMMENT ON COLUMN sales_pipeline.demo_notes IS 'Observations from demo call';
COMMENT ON COLUMN sales_pipeline.expected_close IS 'Expected closing month (e.g., Jan, Feb)';
COMMENT ON COLUMN sales_pipeline.industry IS 'Industry domain: E&C, AF&B, TMT, NEO, Healthcare, etc.';
COMMENT ON COLUMN sales_pipeline.client_title IS 'Contact persons title/role';

COMMENT ON COLUMN sales_pipeline.trial_requested_date IS 'Date when trial was requested';
COMMENT ON COLUMN sales_pipeline.trial_needed_date IS 'Date when trial license is needed';
COMMENT ON COLUMN sales_pipeline.trial_given_date IS 'Date when trial license was provided';
COMMENT ON COLUMN sales_pipeline.trial_usage_notes IS 'Notes on trial usage and observations';
