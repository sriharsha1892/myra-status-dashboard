-- Fix error_summary_by_context view to include all required fields
-- The current view only has context and count, but the UI needs more fields

DROP VIEW IF EXISTS error_summary_by_context CASCADE;

CREATE OR REPLACE VIEW error_summary_by_context AS
SELECT
  context,
  COUNT(*) as total_errors,
  COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) as affected_users,
  MAX(last_occurrence_at) as last_error_at,
  ROUND(AVG(priority_score), 2) as avg_priority,
  COUNT(*) FILTER (WHERE status = 'open') as open_count,
  COUNT(*) FILTER (WHERE status = 'resolved') as resolved_count
FROM error_reports
WHERE deleted_at IS NULL
  AND context IS NOT NULL
GROUP BY context
ORDER BY total_errors DESC;

-- Grant permissions
GRANT SELECT ON error_summary_by_context TO authenticated;

-- Add comment
COMMENT ON VIEW error_summary_by_context IS 'Error summary grouped by context with stats for affected users, priorities, and status counts';
