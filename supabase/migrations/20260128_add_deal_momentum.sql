-- Migration: Add deal_momentum column to trial_organizations
-- Created: 2026-01-28
-- Purpose: Track deal momentum for pipeline management

-- Add deal_momentum column
ALTER TABLE trial_organizations ADD COLUMN IF NOT EXISTS deal_momentum TEXT
  CHECK (deal_momentum IS NULL OR deal_momentum IN ('positive', 'neutral', 'stalled', 'at_risk'));

-- Index for filtering by momentum
CREATE INDEX IF NOT EXISTS idx_trial_orgs_deal_momentum ON trial_organizations(deal_momentum);

COMMENT ON COLUMN trial_organizations.deal_momentum IS 'Deal momentum indicator: positive, neutral, stalled, at_risk';
