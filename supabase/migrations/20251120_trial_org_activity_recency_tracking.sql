-- Migration: Trial Organization Activity Recency Tracking
-- Description: Adds fields and triggers to track activity recency and data completeness
-- Date: 2025-01-20

-- ============================================================================
-- PHASE 1: Add new columns to trial_organizations
-- ============================================================================

-- Add activity tracking columns
ALTER TABLE trial_organizations
  ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS activity_count INTEGER DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS completeness_score INTEGER DEFAULT 0 NOT NULL CHECK (completeness_score >= 0 AND completeness_score <= 100);

-- Add comment for documentation
COMMENT ON COLUMN trial_organizations.last_activity_at IS 'Timestamp of most recent activity (engagement log, query, login, etc.)';
COMMENT ON COLUMN trial_organizations.activity_count IS 'Total number of activities logged for this organization';
COMMENT ON COLUMN trial_organizations.completeness_score IS 'Data completeness score 0-100 based on filled fields';

-- ============================================================================
-- PHASE 2: Create function to calculate completeness score
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_org_completeness_score(org_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  score INTEGER := 0;
  user_count INTEGER;
  activity_cnt INTEGER;
BEGIN
  -- Start with base score for required fields (always have these if org exists)
  score := 30; -- org_name, domain, parent_company assumed filled

  -- Check optional but important fields (10 points each)
  SELECT INTO score score +
    CASE WHEN org_url IS NOT NULL AND org_url != '' THEN 10 ELSE 0 END +
    CASE WHEN logo_url IS NOT NULL AND logo_url != '' THEN 10 ELSE 0 END +
    CASE WHEN description IS NOT NULL AND description != '' THEN 10 ELSE 0 END +
    CASE WHEN account_manager_id IS NOT NULL THEN 10 ELSE 0 END +
    CASE WHEN trial_start_date IS NOT NULL THEN 5 ELSE 0 END +
    CASE WHEN trial_end_date IS NOT NULL THEN 5 ELSE 0 END
  FROM trial_organizations
  WHERE trial_organizations.org_id = calculate_org_completeness_score.org_id;

  -- Check for users (10 points if at least 1 user)
  SELECT COUNT(*) INTO user_count
  FROM trial_users
  WHERE trial_users.org_id = calculate_org_completeness_score.org_id;

  IF user_count > 0 THEN
    score := score + 10;
  END IF;

  -- Check for activities (10 points if at least 3 activities)
  SELECT COUNT(*) INTO activity_cnt
  FROM trial_engagement_log
  WHERE trial_engagement_log.org_id = calculate_org_completeness_score.org_id;

  IF activity_cnt >= 3 THEN
    score := score + 10;
  END IF;

  -- Cap at 100
  IF score > 100 THEN
    score := 100;
  END IF;

  RETURN score;
END;
$$;

COMMENT ON FUNCTION calculate_org_completeness_score IS 'Calculates data completeness score (0-100) for a trial organization';

-- ============================================================================
-- PHASE 3: Create function to update last_activity_at timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION update_org_last_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update trial_organizations with new activity timestamp and increment count
  UPDATE trial_organizations
  SET
    last_activity_at = NOW(),
    activity_count = activity_count + 1,
    completeness_score = calculate_org_completeness_score(NEW.org_id)
  WHERE org_id = NEW.org_id;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION update_org_last_activity IS 'Trigger function to update last_activity_at when activity is logged';

-- ============================================================================
-- PHASE 4: Create triggers for automatic activity tracking
-- ============================================================================

-- Trigger on trial_engagement_log (manual activity logging)
DROP TRIGGER IF EXISTS update_org_activity_on_engagement ON trial_engagement_log;
CREATE TRIGGER update_org_activity_on_engagement
  AFTER INSERT ON trial_engagement_log
  FOR EACH ROW
  WHEN (NEW.org_id IS NOT NULL)
  EXECUTE FUNCTION update_org_last_activity();

-- Trigger on platform_queries (usage tracking)
DROP TRIGGER IF EXISTS update_org_activity_on_query ON platform_queries;
CREATE TRIGGER update_org_activity_on_query
  AFTER INSERT ON platform_queries
  FOR EACH ROW
  WHEN (NEW.org_id IS NOT NULL)
  EXECUTE FUNCTION update_org_last_activity();

-- ============================================================================
-- PHASE 5: Create function to update completeness on org/user changes
-- ============================================================================

CREATE OR REPLACE FUNCTION update_org_completeness_on_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  target_org_id UUID;
BEGIN
  -- Determine the org_id based on the trigger source
  IF TG_TABLE_NAME = 'trial_organizations' THEN
    target_org_id := COALESCE(NEW.org_id, OLD.org_id);
  ELSIF TG_TABLE_NAME = 'trial_users' THEN
    target_org_id := COALESCE(NEW.org_id, OLD.org_id);
  END IF;

  -- Update completeness score
  IF target_org_id IS NOT NULL THEN
    UPDATE trial_organizations
    SET completeness_score = calculate_org_completeness_score(target_org_id)
    WHERE org_id = target_org_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

COMMENT ON FUNCTION update_org_completeness_on_change IS 'Updates completeness score when org or users are modified';

-- Trigger on trial_organizations updates
DROP TRIGGER IF EXISTS update_completeness_on_org_change ON trial_organizations;
CREATE TRIGGER update_completeness_on_org_change
  AFTER INSERT OR UPDATE ON trial_organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_org_completeness_on_change();

-- Trigger on trial_users changes (adding/removing users affects completeness)
DROP TRIGGER IF EXISTS update_completeness_on_user_change ON trial_users;
CREATE TRIGGER update_completeness_on_user_change
  AFTER INSERT OR DELETE ON trial_users
  FOR EACH ROW
  EXECUTE FUNCTION update_org_completeness_on_change();

-- ============================================================================
-- PHASE 6: Create indexes for performance
-- ============================================================================

-- Index for filtering by last_activity_at
CREATE INDEX IF NOT EXISTS idx_trial_orgs_last_activity
  ON trial_organizations(last_activity_at DESC NULLS LAST);

-- Index for filtering by completeness_score
CREATE INDEX IF NOT EXISTS idx_trial_orgs_completeness
  ON trial_organizations(completeness_score);

-- Composite index for common queries (company + activity)
CREATE INDEX IF NOT EXISTS idx_trial_orgs_company_activity
  ON trial_organizations(parent_company, last_activity_at DESC NULLS LAST);

-- ============================================================================
-- PHASE 7: Backfill existing data
-- ============================================================================

-- Backfill last_activity_at from most recent engagement log entry
UPDATE trial_organizations t
SET last_activity_at = (
  SELECT MAX(created_at)
  FROM trial_engagement_log e
  WHERE e.org_id = t.org_id
)
WHERE last_activity_at IS NULL;

-- Backfill activity_count from engagement log
UPDATE trial_organizations t
SET activity_count = (
  SELECT COUNT(*)
  FROM trial_engagement_log e
  WHERE e.org_id = t.org_id
);

-- Backfill completeness_score for all existing orgs
UPDATE trial_organizations
SET completeness_score = calculate_org_completeness_score(org_id)
WHERE completeness_score = 0 OR completeness_score IS NULL;

-- ============================================================================
-- PHASE 8: Create helper view for recency analysis
-- ============================================================================

CREATE OR REPLACE VIEW trial_org_recency_stats AS
SELECT
  org_id,
  org_name,
  parent_company,
  current_stage,
  last_activity_at,
  activity_count,
  completeness_score,

  -- Days since last activity
  CASE
    WHEN last_activity_at IS NULL THEN NULL
    ELSE EXTRACT(DAY FROM (NOW() - last_activity_at))::INTEGER
  END AS days_since_last_activity,

  -- Activity status classification
  CASE
    WHEN last_activity_at IS NULL THEN 'never_active'
    WHEN EXTRACT(DAY FROM (NOW() - last_activity_at)) < 7 THEN 'active'
    WHEN EXTRACT(DAY FROM (NOW() - last_activity_at)) < 14 THEN 'quiet'
    WHEN EXTRACT(DAY FROM (NOW() - last_activity_at)) < 30 THEN 'stale'
    ELSE 'dormant'
  END AS activity_status,

  -- Completeness classification
  CASE
    WHEN completeness_score >= 70 THEN 'complete'
    WHEN completeness_score >= 40 THEN 'partial'
    ELSE 'incomplete'
  END AS completeness_status,

  -- Trial expiry info
  trial_end_date,
  CASE
    WHEN trial_end_date IS NULL THEN NULL
    ELSE EXTRACT(DAY FROM (trial_end_date - NOW()))::INTEGER
  END AS days_until_expiry,

  -- Risk flags
  CASE
    WHEN current_stage = 'trial_active'
      AND last_activity_at IS NOT NULL
      AND EXTRACT(DAY FROM (NOW() - last_activity_at)) > 7
    THEN TRUE
    ELSE FALSE
  END AS at_risk_stale,

  CASE
    WHEN trial_end_date IS NOT NULL
      AND EXTRACT(DAY FROM (trial_end_date - NOW())) BETWEEN 0 AND 7
      AND (last_activity_at IS NULL OR EXTRACT(DAY FROM (NOW() - last_activity_at)) > 3)
    THEN TRUE
    ELSE FALSE
  END AS at_risk_expiring_soon

FROM trial_organizations;

COMMENT ON VIEW trial_org_recency_stats IS 'Consolidated view of trial org activity recency and risk indicators';

-- Grant permissions
GRANT SELECT ON trial_org_recency_stats TO authenticated;

-- ============================================================================
-- Verification and summary
-- ============================================================================

DO $$
DECLARE
  total_orgs INTEGER;
  orgs_with_activity INTEGER;
  avg_score NUMERIC;
BEGIN
  SELECT COUNT(*) INTO total_orgs FROM trial_organizations;
  SELECT COUNT(*) INTO orgs_with_activity FROM trial_organizations WHERE last_activity_at IS NOT NULL;
  SELECT ROUND(AVG(completeness_score), 1) INTO avg_score FROM trial_organizations;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Activity Recency Tracking Migration Complete';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total Organizations: %', total_orgs;
  RAISE NOTICE 'Orgs with Activity: %', orgs_with_activity;
  RAISE NOTICE 'Average Completeness Score: %/100', avg_score;
  RAISE NOTICE '';
  RAISE NOTICE 'New Columns Added:';
  RAISE NOTICE '  - last_activity_at (timestamp)';
  RAISE NOTICE '  - activity_count (integer)';
  RAISE NOTICE '  - completeness_score (0-100)';
  RAISE NOTICE '';
  RAISE NOTICE 'Triggers Created:';
  RAISE NOTICE '  - Auto-update on engagement log entries';
  RAISE NOTICE '  - Auto-update on platform queries';
  RAISE NOTICE '  - Auto-recalculate completeness on changes';
  RAISE NOTICE '';
  RAISE NOTICE 'View Created: trial_org_recency_stats';
  RAISE NOTICE '========================================';
END $$;
