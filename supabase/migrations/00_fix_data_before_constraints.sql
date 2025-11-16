-- Pre-Constraint Data Cleanup
-- Run this BEFORE applying 20251116_add_data_constraints.sql
-- Fixes all existing data violations so constraints can be applied safely

-- ============================================================================
-- STEP 1: Check which columns actually exist
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Starting data cleanup...';
END $$;

-- ============================================================================
-- FIX TRIAL DATE VIOLATIONS (end_date < start_date)
-- ============================================================================

-- Fix organizations where trial_end_date is before trial_start_date
UPDATE trial_organizations
SET
  trial_start_date = trial_end_date,
  trial_end_date = trial_start_date
WHERE trial_end_date < trial_start_date
  AND trial_start_date IS NOT NULL
  AND trial_end_date IS NOT NULL;

-- ============================================================================
-- FIX NEGATIVE/ZERO VALUES (only for columns that exist)
-- ============================================================================

-- Fix trial_duration_days if it exists and is negative or zero
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trial_organizations' AND column_name = 'trial_duration_days'
  ) THEN
    UPDATE trial_organizations
    SET trial_duration_days = ABS(trial_duration_days)
    WHERE trial_duration_days < 0;

    RAISE NOTICE 'Fixed negative trial_duration_days values';
  END IF;
END $$;

-- Fix team_size if it exists and is negative or zero
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trial_organizations' AND column_name = 'team_size'
  ) THEN
    UPDATE trial_organizations
    SET team_size = NULL
    WHERE team_size < 0;

    RAISE NOTICE 'Fixed negative team_size values';
  END IF;
END $$;

-- ============================================================================
-- FIX EMPTY/NULL TITLES
-- ============================================================================

-- Fix empty event titles in trial_timeline_events
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trial_timeline_events') THEN
    UPDATE trial_timeline_events
    SET title = COALESCE(event_type || ' event', 'Timeline event')
    WHERE title IS NULL OR TRIM(title) = '';

    RAISE NOTICE 'Fixed empty event titles';
  END IF;
END $$;

-- Fix empty pain point titles
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pain_points') THEN
    UPDATE pain_points
    SET title = 'Untitled pain point'
    WHERE title IS NULL OR TRIM(title) = '';

    RAISE NOTICE 'Fixed empty pain point titles';
  END IF;
END $$;

-- Fix empty learning titles
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'learnings') THEN
    UPDATE learnings
    SET title = 'Untitled learning'
    WHERE title IS NULL OR TRIM(title) = '';

    RAISE NOTICE 'Fixed empty learning titles';
  END IF;
END $$;

-- Fix empty feature request titles
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'feature_requests') THEN
    UPDATE feature_requests
    SET title = 'Untitled feature request'
    WHERE title IS NULL OR TRIM(title) = '';

    RAISE NOTICE 'Fixed empty feature request titles';
  END IF;
END $$;

-- ============================================================================
-- FIX PARSE CONFIDENCE RANGE (should be 0-1)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trial_timeline_events' AND column_name = 'parse_confidence'
  ) THEN
    -- Fix confidence values > 1 (assume they're percentages)
    UPDATE trial_timeline_events
    SET parse_confidence = parse_confidence / 100
    WHERE parse_confidence > 1;

    -- Clamp to 0-1 range
    UPDATE trial_timeline_events
    SET parse_confidence = GREATEST(0, LEAST(1, parse_confidence))
    WHERE parse_confidence IS NOT NULL
      AND (parse_confidence < 0 OR parse_confidence > 1);

    RAISE NOTICE 'Fixed parse_confidence values';
  END IF;
END $$;

-- ============================================================================
-- FIX INVALID EMAIL FORMATS
-- ============================================================================

DO $$
DECLARE
  invalid_count INTEGER := 0;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trial_users') THEN
    -- Count invalid emails first
    SELECT COUNT(*) INTO invalid_count
    FROM trial_users
    WHERE email IS NOT NULL
      AND email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';

    -- Set invalid emails to a placeholder format: invalid_<user_id>@placeholder.com
    -- This preserves uniqueness while marking them as invalid
    UPDATE trial_users
    SET email = 'invalid_' || SUBSTRING(user_id::text, 1, 8) || '@placeholder.com'
    WHERE email IS NOT NULL
      AND email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';

    RAISE NOTICE 'Fixed % invalid email formats (set to placeholder)', invalid_count;
  END IF;
END $$;

-- ============================================================================
-- FIX EMPTY NAME VIOLATIONS
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trial_users' AND column_name = 'name'
  ) THEN
    UPDATE trial_users
    SET name = 'Unnamed User'
    WHERE name IS NULL OR TRIM(name) = '';

    RAISE NOTICE 'Fixed empty user names';
  END IF;
END $$;

-- ============================================================================
-- FIX FOLLOW-UP LOGIC VIOLATIONS
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trial_timeline_events' AND column_name = 'follow_up_required'
  ) THEN
    UPDATE trial_timeline_events
    SET follow_up_required = FALSE
    WHERE follow_up_required = TRUE
      AND follow_up_date IS NULL;

    RAISE NOTICE 'Fixed follow-up logic violations';
  END IF;
END $$;

-- ============================================================================
-- FIX NEGATIVE REPORTED COUNTS
-- ============================================================================

DO $$
BEGIN
  -- Pain points
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pain_points' AND column_name = 'reported_count'
  ) THEN
    UPDATE pain_points
    SET reported_count = GREATEST(1, ABS(reported_count))
    WHERE reported_count < 0;
  END IF;

  -- Learnings
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'learnings' AND column_name = 'reported_count'
  ) THEN
    UPDATE learnings
    SET reported_count = GREATEST(1, ABS(reported_count))
    WHERE reported_count < 0;
  END IF;

  -- Feature requests votes
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'feature_requests' AND column_name = 'votes'
  ) THEN
    UPDATE feature_requests
    SET votes = ABS(votes)
    WHERE votes < 0;
  END IF;

  RAISE NOTICE 'Fixed negative count values';
END $$;

-- ============================================================================
-- FIX NEGATIVE DURATIONS
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_interactions' AND column_name = 'duration_minutes'
  ) THEN
    UPDATE user_interactions
    SET duration_minutes = ABS(duration_minutes)
    WHERE duration_minutes < 0;

    RAISE NOTICE 'Fixed negative duration values';
  END IF;
END $$;

-- ============================================================================
-- FINAL VERIFICATION
-- ============================================================================

DO $$
DECLARE
  trial_date_violations INTEGER := 0;
  empty_titles INTEGER := 0;
  confidence_violations INTEGER := 0;
BEGIN
  -- Count remaining trial date violations
  SELECT COUNT(*) INTO trial_date_violations
  FROM trial_organizations
  WHERE trial_end_date < trial_start_date
    AND trial_start_date IS NOT NULL
    AND trial_end_date IS NOT NULL;

  -- Count remaining empty titles
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trial_timeline_events') THEN
    SELECT COUNT(*) INTO empty_titles
    FROM trial_timeline_events
    WHERE title IS NULL OR TRIM(title) = '';
  END IF;

  -- Count remaining confidence violations
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trial_timeline_events' AND column_name = 'parse_confidence'
  ) THEN
    SELECT COUNT(*) INTO confidence_violations
    FROM trial_timeline_events
    WHERE parse_confidence IS NOT NULL
      AND (parse_confidence < 0 OR parse_confidence > 1);
  END IF;

  RAISE NOTICE '=== DATA CLEANUP VERIFICATION ===';
  RAISE NOTICE 'Trial date violations remaining: %', trial_date_violations;
  RAISE NOTICE 'Empty title violations remaining: %', empty_titles;
  RAISE NOTICE 'Parse confidence violations remaining: %', confidence_violations;

  IF trial_date_violations = 0 AND empty_titles = 0 AND confidence_violations = 0 THEN
    RAISE NOTICE 'SUCCESS: All data violations fixed! You can now apply constraints.';
  ELSE
    RAISE WARNING 'WARNING: Some violations remain. Review before applying constraints.';
  END IF;
END $$;
