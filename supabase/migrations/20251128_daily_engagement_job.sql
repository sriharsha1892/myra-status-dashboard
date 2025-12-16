-- Daily Engagement Calculation Job
-- Run daily to update engagement tiers and create snapshots

-- ============================================================================
-- FUNCTION: Aggregate activity metrics from user_activity_log
-- ============================================================================

CREATE OR REPLACE FUNCTION aggregate_org_activity_metrics()
RETURNS void AS $$
BEGIN
  -- Update trial_organizations with aggregated metrics from trial_users
  UPDATE trial_organizations o
  SET
    total_logins = COALESCE(agg.total_logins, 0),
    total_queries = COALESCE(agg.total_queries, 0),
    unique_active_users = COALESCE(agg.active_users, 0),
    first_login_date = agg.first_login,
    last_query_date = COALESCE(agg.last_query, o.last_activity_date),
    updated_at = NOW()
  FROM (
    SELECT
      tu.org_id,
      SUM(tu.login_count) as total_logins,
      SUM(tu.queries_executed) as total_queries,
      COUNT(DISTINCT CASE WHEN tu.current_stage = 'active' THEN tu.user_id END) as active_users,
      MIN(tu.first_login_date) as first_login,
      MAX(tu.last_login_date) as last_query
    FROM trial_users tu
    GROUP BY tu.org_id
  ) agg
  WHERE o.org_id = agg.org_id;

  RAISE NOTICE 'Aggregated activity metrics for all organizations';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: Recalculate engagement tiers for all orgs
-- ============================================================================

CREATE OR REPLACE FUNCTION recalculate_all_engagement_tiers()
RETURNS TABLE(org_id uuid, old_tier text, new_tier text) AS $$
BEGIN
  RETURN QUERY
  WITH tier_updates AS (
    UPDATE trial_organizations o
    SET
      engagement_tier = calculate_engagement_tier(
        COALESCE(o.last_query_date, o.last_activity_date),
        COALESCE(o.total_queries, 0)
      ),
      updated_at = NOW()
    WHERE o.org_lifecycle_stage IN ('trial_pending', 'trial_active', 'trial_expired')
    RETURNING
      o.org_id,
      o.engagement_tier as new_tier
  )
  SELECT
    tu.org_id,
    NULL::text as old_tier,  -- We don't track old tier in this simple version
    tu.new_tier
  FROM tier_updates tu;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: Create daily engagement snapshots
-- ============================================================================

CREATE OR REPLACE FUNCTION create_daily_engagement_snapshots()
RETURNS integer AS $$
DECLARE
  snapshot_count integer;
  today date := CURRENT_DATE;
BEGIN
  -- Insert or update snapshots for today
  INSERT INTO trial_engagement_snapshots (
    org_id,
    snapshot_date,
    logins_today,
    queries_today,
    active_users_today,
    logins_last_7_days,
    queries_last_7_days,
    engagement_score,
    engagement_tier
  )
  SELECT
    o.org_id,
    today,
    -- Today's activity (from user_activity_log if available)
    COALESCE((
      SELECT COUNT(*) FROM user_activity_log ual
      WHERE ual.org_id = o.org_id
        AND ual.activity_type = 'login'
        AND DATE(ual.activity_timestamp) = today
    ), 0) as logins_today,
    COALESCE((
      SELECT COUNT(*) FROM user_activity_log ual
      WHERE ual.org_id = o.org_id
        AND ual.activity_type = 'query_executed'
        AND DATE(ual.activity_timestamp) = today
    ), 0) as queries_today,
    COALESCE((
      SELECT COUNT(DISTINCT ual.user_id) FROM user_activity_log ual
      WHERE ual.org_id = o.org_id
        AND DATE(ual.activity_timestamp) = today
    ), 0) as active_users_today,
    -- Last 7 days
    COALESCE((
      SELECT COUNT(*) FROM user_activity_log ual
      WHERE ual.org_id = o.org_id
        AND ual.activity_type = 'login'
        AND ual.activity_timestamp >= NOW() - INTERVAL '7 days'
    ), 0) as logins_last_7_days,
    COALESCE((
      SELECT COUNT(*) FROM user_activity_log ual
      WHERE ual.org_id = o.org_id
        AND ual.activity_type = 'query_executed'
        AND ual.activity_timestamp >= NOW() - INTERVAL '7 days'
    ), 0) as queries_last_7_days,
    o.engagement_score,
    o.engagement_tier
  FROM trial_organizations o
  WHERE o.org_lifecycle_stage IN ('trial_pending', 'trial_active', 'trial_expired')
  ON CONFLICT (org_id, snapshot_date)
  DO UPDATE SET
    logins_today = EXCLUDED.logins_today,
    queries_today = EXCLUDED.queries_today,
    active_users_today = EXCLUDED.active_users_today,
    logins_last_7_days = EXCLUDED.logins_last_7_days,
    queries_last_7_days = EXCLUDED.queries_last_7_days,
    engagement_score = EXCLUDED.engagement_score,
    engagement_tier = EXCLUDED.engagement_tier;

  GET DIAGNOSTICS snapshot_count = ROW_COUNT;

  RAISE NOTICE 'Created % engagement snapshots for %', snapshot_count, today;

  RETURN snapshot_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: Run full daily engagement job
-- ============================================================================

CREATE OR REPLACE FUNCTION run_daily_engagement_job()
RETURNS jsonb AS $$
DECLARE
  result jsonb;
  metrics_start timestamp;
  tiers_start timestamp;
  snapshots_start timestamp;
  snapshot_count integer;
  tier_updates integer;
BEGIN
  result := '{}'::jsonb;

  -- Step 1: Aggregate activity metrics
  metrics_start := clock_timestamp();
  PERFORM aggregate_org_activity_metrics();
  result := result || jsonb_build_object(
    'metrics_aggregation_ms', EXTRACT(MILLISECONDS FROM clock_timestamp() - metrics_start)::integer
  );

  -- Step 2: Recalculate engagement tiers
  tiers_start := clock_timestamp();
  SELECT COUNT(*) INTO tier_updates FROM recalculate_all_engagement_tiers();
  result := result || jsonb_build_object(
    'tiers_updated', tier_updates,
    'tier_calculation_ms', EXTRACT(MILLISECONDS FROM clock_timestamp() - tiers_start)::integer
  );

  -- Step 3: Create daily snapshots
  snapshots_start := clock_timestamp();
  snapshot_count := create_daily_engagement_snapshots();
  result := result || jsonb_build_object(
    'snapshots_created', snapshot_count,
    'snapshot_creation_ms', EXTRACT(MILLISECONDS FROM clock_timestamp() - snapshots_start)::integer
  );

  -- Add summary
  result := result || jsonb_build_object(
    'status', 'success',
    'run_date', CURRENT_DATE,
    'run_timestamp', NOW()
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CLEANUP: Remove old snapshots (keep last 90 days)
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_old_engagement_snapshots(days_to_keep integer DEFAULT 90)
RETURNS integer AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM trial_engagement_snapshots
  WHERE snapshot_date < CURRENT_DATE - days_to_keep;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RAISE NOTICE 'Deleted % old engagement snapshots (older than % days)', deleted_count, days_to_keep;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENT
-- ============================================================================

COMMENT ON FUNCTION run_daily_engagement_job() IS
  'Run daily to: 1) Aggregate metrics from trial_users, 2) Recalculate engagement tiers, 3) Create daily snapshots';

COMMENT ON FUNCTION cleanup_old_engagement_snapshots(integer) IS
  'Cleanup old snapshots, default keeps last 90 days';
