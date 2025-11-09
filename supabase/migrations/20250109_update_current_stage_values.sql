-- Migration: Update current_stage values for trial_users
-- Description: Professional, clear taxonomy for user engagement lifecycle
-- Date: 2025-01-09

/*
  New Current Stage Taxonomy (mutually exclusive, filter-optimized):

  1. 'invited'      - Never logged in, credentials sent
  2. 'low_activity' - Logged in but minimal activity
  3. 'active'       - Regular, consistent usage
  4. 'power_user'   - Heavy usage, advanced adoption
  5. 'dormant'      - Previously active, now inactive

  Migration Strategy:
  - 'invited' → 'invited' (stays same)
  - 'registered' → 'low_activity' (minimal usage)
  - 'exploring' → 'low_activity' (minimal usage)
  - 'onboarding' → 'low_activity' (minimal usage)
  - 'active' → 'active' (stays same)
  - 'inactive' → 'dormant' (clearer terminology)

  No CHECK constraint exists, so new values can be used immediately.
*/

-- Update existing stages to new taxonomy
UPDATE trial_users
SET current_stage = 'low_activity'
WHERE current_stage IN ('registered', 'exploring', 'onboarding');

UPDATE trial_users
SET current_stage = 'dormant'
WHERE current_stage = 'inactive';

-- Add comment documenting the allowed values
COMMENT ON COLUMN trial_users.current_stage IS
'User engagement stage: invited | low_activity | active | power_user | dormant';
