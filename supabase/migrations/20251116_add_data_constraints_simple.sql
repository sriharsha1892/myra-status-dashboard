-- Data Validation Constraints (Simplified - Safe for Production)
-- Created: 2025-11-16
-- Purpose: Add database-level validation for data integrity
-- Only adds constraints for columns that exist

-- ============================================================================
-- TRIAL ORGANIZATIONS - Trial Date Validation
-- ============================================================================

ALTER TABLE trial_organizations
DROP CONSTRAINT IF EXISTS trial_dates_valid;

ALTER TABLE trial_organizations
ADD CONSTRAINT trial_dates_valid
CHECK (
  trial_end_date IS NULL OR
  trial_start_date IS NULL OR
  trial_end_date >= trial_start_date
);

-- ============================================================================
-- TRIAL USERS - Email Format Validation
-- ============================================================================

ALTER TABLE trial_users
DROP CONSTRAINT IF EXISTS email_format_valid;

ALTER TABLE trial_users
ADD CONSTRAINT email_format_valid
CHECK (
  email IS NULL OR
  (
    email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  )
);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON CONSTRAINT trial_dates_valid ON trial_organizations IS
'Ensures trial end date is not before start date';

COMMENT ON CONSTRAINT email_format_valid ON trial_users IS
'Basic email format validation requiring @ and domain';

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Successfully added data validation constraints!';
  RAISE NOTICE '  ✓ Trial date validation (end >= start)';
  RAISE NOTICE '  ✓ Email format validation';
END $$;
