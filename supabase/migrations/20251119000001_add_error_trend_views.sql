-- Create database views for error trends and analytics
-- These views support the ErrorTrendsChart component

-- 1. Daily error trends (last 30 days)
CREATE OR REPLACE VIEW error_trends_daily AS
SELECT
  DATE(created_at) as date,
  COUNT(*) as error_count
FROM error_reports
WHERE deleted_at IS NULL
  AND created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- 2. Error summary by type
CREATE OR REPLACE VIEW error_summary_by_type AS
SELECT
  error_type,
  COUNT(*) as count
FROM error_reports
WHERE deleted_at IS NULL
GROUP BY error_type
ORDER BY count DESC;

-- 3. Error summary by context
CREATE OR REPLACE VIEW error_summary_by_context AS
SELECT
  context,
  COUNT(*) as count
FROM error_reports
WHERE deleted_at IS NULL
  AND context IS NOT NULL
GROUP BY context
ORDER BY count DESC;

-- Grant permissions to authenticated users
GRANT SELECT ON error_trends_daily TO authenticated;
GRANT SELECT ON error_summary_by_type TO authenticated;
GRANT SELECT ON error_summary_by_context TO authenticated;

-- Add comments
COMMENT ON VIEW error_trends_daily IS 'Daily error count for the last 30 days';
COMMENT ON VIEW error_summary_by_type IS 'Error count grouped by error type';
COMMENT ON VIEW error_summary_by_context IS 'Error count grouped by context';
