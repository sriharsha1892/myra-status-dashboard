-- Migration: Add missing trial dates to existing organizations
-- Date: 2025-11-18
-- Purpose: Set default trial dates for organizations that don't have them

-- Set default trial dates for organizations missing them
-- Default: Start = today, End = today + 14 days
UPDATE trial_organizations
SET
  trial_start_date = CURRENT_DATE,
  trial_end_date = CURRENT_DATE + INTERVAL '14 days'
WHERE trial_start_date IS NULL OR trial_end_date IS NULL;

-- Verify the fix
-- Should return 0
-- SELECT COUNT(*) FROM trial_organizations WHERE trial_start_date IS NULL OR trial_end_date IS NULL;
