-- Add assignment feature to error reports
-- Allows errors to be assigned to team members for resolution

-- Add assigned_to column to error_reports table
ALTER TABLE error_reports
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add assigned_at timestamp to track when assignment was made
ALTER TABLE error_reports
ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;

-- Create index for efficient queries by assignee
CREATE INDEX IF NOT EXISTS idx_error_reports_assigned_to ON error_reports(assigned_to) WHERE assigned_to IS NOT NULL;

-- Create index for unassigned errors
CREATE INDEX IF NOT EXISTS idx_error_reports_unassigned ON error_reports(assigned_to) WHERE assigned_to IS NULL AND status != 'resolved';

-- Update RLS policies to allow viewing assigned errors
-- Users can see errors assigned to them
DROP POLICY IF EXISTS "Users can view errors assigned to them" ON error_reports;
CREATE POLICY "Users can view errors assigned to them"
  ON error_reports FOR SELECT
  USING (assigned_to = auth.uid());

-- Create view for assignment statistics
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

-- Grant permissions
GRANT SELECT ON error_assignment_stats TO authenticated;

-- Comment on new columns
COMMENT ON COLUMN error_reports.assigned_to IS 'User ID of the team member assigned to resolve this error';
COMMENT ON COLUMN error_reports.assigned_at IS 'Timestamp when the error was assigned';
