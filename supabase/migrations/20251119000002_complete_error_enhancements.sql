-- Complete Error Dashboard Enhancements Migration
-- This migration combines assignment features and trend views in the correct order

-- Step 1: Drop existing views that might conflict (if they exist)
DROP VIEW IF EXISTS error_trends_daily CASCADE;
DROP VIEW IF EXISTS error_summary_by_type CASCADE;
DROP VIEW IF EXISTS error_summary_by_context CASCADE;
DROP VIEW IF EXISTS error_assignment_stats CASCADE;

-- Step 2: Add assignment columns to error_reports table
ALTER TABLE error_reports
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE error_reports
ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;

-- Step 3: Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_error_reports_assigned_to
ON error_reports(assigned_to)
WHERE assigned_to IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_error_reports_unassigned
ON error_reports(assigned_to)
WHERE assigned_to IS NULL AND status != 'resolved';

-- Step 4: Create RLS policy for viewing assigned errors
DROP POLICY IF EXISTS "Users can view errors assigned to them" ON error_reports;
CREATE POLICY "Users can view errors assigned to them"
  ON error_reports FOR SELECT
  USING (assigned_to = auth.uid());

-- Step 5: Create error assignment statistics view
CREATE OR REPLACE VIEW error_assignment_stats AS
SELECT
  assigned_to,
  u.email as assignee_email,
  u.full_name as assignee_name,
  COUNT(*) as total_assigned,
  COUNT(*) FILTER (WHERE status = 'open') as open_count,
  COUNT(*) FILTER (WHERE status = 'investigating') as investigating_count,
  COUNT(*) FILTER (WHERE status = 'resolved') as resolved_count,
  MAX(assigned_at) as last_assigned_at
FROM error_reports er
LEFT JOIN users u ON er.assigned_to = u.id
WHERE deleted_at IS NULL AND assigned_to IS NOT NULL
GROUP BY assigned_to, u.email, u.full_name
ORDER BY total_assigned DESC;

-- Step 6: Create error trends views for charts
CREATE OR REPLACE VIEW error_trends_daily AS
SELECT
  DATE(created_at) as date,
  COUNT(*) as error_count
FROM error_reports
WHERE deleted_at IS NULL
  AND created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

CREATE OR REPLACE VIEW error_summary_by_type AS
SELECT
  error_type,
  COUNT(*) as count
FROM error_reports
WHERE deleted_at IS NULL
GROUP BY error_type
ORDER BY count DESC;

CREATE OR REPLACE VIEW error_summary_by_context AS
SELECT
  context,
  COUNT(*) as count
FROM error_reports
WHERE deleted_at IS NULL
  AND context IS NOT NULL
GROUP BY context
ORDER BY count DESC;

-- Step 7: Grant permissions
GRANT SELECT ON error_assignment_stats TO authenticated;
GRANT SELECT ON error_trends_daily TO authenticated;
GRANT SELECT ON error_summary_by_type TO authenticated;
GRANT SELECT ON error_summary_by_context TO authenticated;

-- Step 8: Add comments
COMMENT ON COLUMN error_reports.assigned_to IS 'User ID of the team member assigned to resolve this error';
COMMENT ON COLUMN error_reports.assigned_at IS 'Timestamp when the error was assigned';
COMMENT ON VIEW error_assignment_stats IS 'Statistics for error assignments by user';
COMMENT ON VIEW error_trends_daily IS 'Daily error count for the last 30 days';
COMMENT ON VIEW error_summary_by_type IS 'Error count grouped by error type';
COMMENT ON VIEW error_summary_by_context IS 'Error count grouped by context';
