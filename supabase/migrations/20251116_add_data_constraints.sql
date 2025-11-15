-- Data Validation Constraints
-- Created: 2025-11-16
-- Purpose: Add database-level validation for data integrity

-- ============================================================================
-- TRIAL ORGANIZATIONS CONSTRAINTS
-- ============================================================================

-- Ensure trial_end_date is not before trial_start_date
ALTER TABLE trial_organizations
DROP CONSTRAINT IF EXISTS trial_dates_valid;

ALTER TABLE trial_organizations
ADD CONSTRAINT trial_dates_valid
CHECK (
  trial_end_date IS NULL OR
  trial_start_date IS NULL OR
  trial_end_date >= trial_start_date
);

-- Ensure trial_duration_days is positive if specified
ALTER TABLE trial_organizations
DROP CONSTRAINT IF EXISTS trial_duration_positive;

ALTER TABLE trial_organizations
ADD CONSTRAINT trial_duration_positive
CHECK (
  trial_duration_days IS NULL OR
  trial_duration_days > 0
);

-- Ensure contract_value is non-negative if specified
ALTER TABLE trial_organizations
DROP CONSTRAINT IF EXISTS contract_value_non_negative;

ALTER TABLE trial_organizations
ADD CONSTRAINT contract_value_non_negative
CHECK (
  contract_value IS NULL OR
  contract_value >= 0
);

-- Ensure team_size is positive if specified
ALTER TABLE trial_organizations
DROP CONSTRAINT IF EXISTS team_size_positive;

ALTER TABLE trial_organizations
ADD CONSTRAINT team_size_positive
CHECK (
  team_size IS NULL OR
  team_size > 0
);

-- ============================================================================
-- TRIAL USERS CONSTRAINTS
-- ============================================================================

-- Basic email format validation (contains @ and .)
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

-- Basic phone format validation (if provided)
-- Allows: +1-234-567-8900, (123) 456-7890, 123-456-7890, 1234567890, etc.
ALTER TABLE trial_users
DROP CONSTRAINT IF EXISTS phone_format_valid;

ALTER TABLE trial_users
ADD CONSTRAINT phone_format_valid
CHECK (
  phone IS NULL OR
  phone = '' OR
  (
    phone ~* '^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,9}$'
  )
);

-- Ensure name is not empty if provided
ALTER TABLE trial_users
DROP CONSTRAINT IF EXISTS name_not_empty;

ALTER TABLE trial_users
ADD CONSTRAINT name_not_empty
CHECK (
  name IS NULL OR
  trim(name) != ''
);

-- ============================================================================
-- USER INTERACTIONS CONSTRAINTS
-- ============================================================================

-- Ensure duration_minutes is non-negative if specified
ALTER TABLE user_interactions
DROP CONSTRAINT IF EXISTS duration_non_negative;

ALTER TABLE user_interactions
ADD CONSTRAINT duration_non_negative
CHECK (
  duration_minutes IS NULL OR
  duration_minutes >= 0
);

-- Ensure title is not empty
ALTER TABLE user_interactions
DROP CONSTRAINT IF EXISTS title_not_empty;

ALTER TABLE user_interactions
ADD CONSTRAINT title_not_empty
CHECK (
  title IS NULL OR
  trim(title) != ''
);

-- ============================================================================
-- TIMELINE EVENTS CONSTRAINTS
-- ============================================================================

-- Ensure follow_up_date is in the future if follow_up is required
ALTER TABLE trial_timeline_events
DROP CONSTRAINT IF EXISTS follow_up_date_logic;

ALTER TABLE trial_timeline_events
ADD CONSTRAINT follow_up_date_logic
CHECK (
  follow_up_required = FALSE OR
  follow_up_date IS NOT NULL
);

-- Ensure parse_confidence is between 0 and 1
ALTER TABLE trial_timeline_events
DROP CONSTRAINT IF EXISTS parse_confidence_range;

ALTER TABLE trial_timeline_events
ADD CONSTRAINT parse_confidence_range
CHECK (
  parse_confidence IS NULL OR
  (parse_confidence >= 0 AND parse_confidence <= 1)
);

-- Ensure title is not empty
ALTER TABLE trial_timeline_events
DROP CONSTRAINT IF EXISTS event_title_not_empty;

ALTER TABLE trial_timeline_events
ADD CONSTRAINT event_title_not_empty
CHECK (
  title IS NULL OR
  trim(title) != ''
);

-- ============================================================================
-- PAIN POINTS CONSTRAINTS
-- ============================================================================

-- Ensure reported_count is positive
ALTER TABLE pain_points
DROP CONSTRAINT IF EXISTS reported_count_positive;

ALTER TABLE pain_points
ADD CONSTRAINT reported_count_positive
CHECK (
  reported_count IS NULL OR
  reported_count > 0
);

-- Ensure title is not empty
ALTER TABLE pain_points
DROP CONSTRAINT IF EXISTS pain_point_title_not_empty;

ALTER TABLE pain_points
ADD CONSTRAINT pain_point_title_not_empty
CHECK (
  title IS NULL OR
  trim(title) != ''
);

-- ============================================================================
-- LEARNINGS CONSTRAINTS
-- ============================================================================

-- Ensure reported_count is positive
ALTER TABLE learnings
DROP CONSTRAINT IF EXISTS learning_reported_count_positive;

ALTER TABLE learnings
ADD CONSTRAINT learning_reported_count_positive
CHECK (
  reported_count IS NULL OR
  reported_count > 0
);

-- Ensure title is not empty
ALTER TABLE learnings
DROP CONSTRAINT IF EXISTS learning_title_not_empty;

ALTER TABLE learnings
ADD CONSTRAINT learning_title_not_empty
CHECK (
  title IS NULL OR
  trim(title) != ''
);

-- ============================================================================
-- FEATURE REQUESTS CONSTRAINTS
-- ============================================================================

-- Ensure votes is non-negative
ALTER TABLE feature_requests
DROP CONSTRAINT IF EXISTS votes_non_negative;

ALTER TABLE feature_requests
ADD CONSTRAINT votes_non_negative
CHECK (
  votes IS NULL OR
  votes >= 0
);

-- Ensure title is not empty
ALTER TABLE feature_requests
DROP CONSTRAINT IF EXISTS feature_request_title_not_empty;

ALTER TABLE feature_requests
ADD CONSTRAINT feature_request_title_not_empty
CHECK (
  title IS NULL OR
  trim(title) != ''
);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON CONSTRAINT trial_dates_valid ON trial_organizations IS
'Ensures trial end date is not before start date';

COMMENT ON CONSTRAINT email_format_valid ON trial_users IS
'Basic email format validation requiring @ and domain';

COMMENT ON CONSTRAINT phone_format_valid ON trial_users IS
'Validates phone number format allowing various international formats';

COMMENT ON CONSTRAINT parse_confidence_range ON trial_timeline_events IS
'Ensures parse confidence is a decimal between 0 and 1';

COMMENT ON CONSTRAINT follow_up_date_logic ON trial_timeline_events IS
'If follow-up is required, a follow-up date must be specified';
