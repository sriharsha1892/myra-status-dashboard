-- Pre-Constraint Data Cleanup (Simplified - Only Essential Fixes)
-- Run this BEFORE applying 20251116_add_data_constraints.sql
-- Only fixes data that will definitely cause constraint violations

-- ============================================================================
-- FIX TRIAL DATE VIOLATIONS (end_date < start_date)
-- ============================================================================

UPDATE trial_organizations
SET
  trial_start_date = trial_end_date,
  trial_end_date = trial_start_date
WHERE trial_end_date < trial_start_date
  AND trial_start_date IS NOT NULL
  AND trial_end_date IS NOT NULL;

-- ============================================================================
-- FIX INVALID EMAIL FORMATS
-- ============================================================================

-- Set invalid emails to placeholder format to preserve NOT NULL constraint
UPDATE trial_users
SET email = 'invalid_' || SUBSTRING(user_id::text, 1, 8) || '@placeholder.com'
WHERE email IS NOT NULL
  AND email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  trial_date_violations INTEGER := 0;
  email_violations INTEGER := 0;
BEGIN
  -- Count remaining trial date violations
  SELECT COUNT(*) INTO trial_date_violations
  FROM trial_organizations
  WHERE trial_end_date < trial_start_date
    AND trial_start_date IS NOT NULL
    AND trial_end_date IS NOT NULL;

  -- Count remaining email violations
  SELECT COUNT(*) INTO email_violations
  FROM trial_users
  WHERE email IS NOT NULL
    AND email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';

  RAISE NOTICE '=== DATA CLEANUP VERIFICATION ===';
  RAISE NOTICE 'Trial date violations remaining: %', trial_date_violations;
  RAISE NOTICE 'Email violations remaining: %', email_violations;

  IF trial_date_violations = 0 AND email_violations = 0 THEN
    RAISE NOTICE 'SUCCESS: Critical data violations fixed!';
  ELSE
    RAISE WARNING 'WARNING: Some violations remain.';
  END IF;
END $$;
