-- Enhanced Error Reporting System
-- Creates tables for error tracking, analytics, and resolution management

-- 1. Error Reports Table
-- Stores all error reports with detailed context
CREATE TABLE IF NOT EXISTS error_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Error Details
  error_message TEXT NOT NULL,
  error_stack TEXT,
  error_type TEXT, -- network, auth, database, validation, etc.
  context TEXT NOT NULL, -- trial_org_create, user_update, etc.

  -- User Information
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,

  -- Environment Data
  page_url TEXT,
  user_agent TEXT,
  browser_info JSONB, -- Parsed browser/OS info

  -- Additional Context
  additional_info JSONB, -- Any extra context data
  form_data JSONB, -- Form data if available (sanitized)

  -- Timestamps
  reported_at TIMESTAMPTZ DEFAULT NOW(),
  occurred_at TIMESTAMPTZ, -- When error actually happened (from client)

  -- Resolution Tracking
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'ignored', 'duplicate')),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_notes TEXT,

  -- Related Entities
  ticket_id UUID, -- Link to support ticket if created
  duplicate_of UUID REFERENCES error_reports(id) ON DELETE SET NULL, -- If marked as duplicate

  -- Metadata
  occurrence_count INTEGER DEFAULT 1, -- How many times this exact error occurred
  last_occurrence_at TIMESTAMPTZ DEFAULT NOW(),
  priority_score INTEGER DEFAULT 50, -- 0-100, calculated based on frequency, impact

  -- Soft Delete
  deleted_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Error Report Comments Table
-- Allows team to discuss errors
CREATE TABLE IF NOT EXISTS error_report_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_report_id UUID NOT NULL REFERENCES error_reports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT TRUE, -- Internal team notes vs public resolution
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Error Patterns Table
-- Track recurring error patterns for proactive fixes
CREATE TABLE IF NOT EXISTS error_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_name TEXT NOT NULL,
  pattern_description TEXT,
  error_signature TEXT NOT NULL, -- Unique identifier for this pattern
  context_filter TEXT[], -- Which contexts this pattern appears in

  -- Pattern Metrics
  occurrence_count INTEGER DEFAULT 0,
  affected_users_count INTEGER DEFAULT 0,
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),

  -- Resolution
  status TEXT DEFAULT 'identified' CHECK (status IN ('identified', 'fixing', 'fixed', 'wontfix')),
  resolution_notes TEXT,
  fixed_in_version TEXT,
  fixed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Error Pattern Occurrences (Junction Table)
CREATE TABLE IF NOT EXISTS error_pattern_occurrences (
  error_report_id UUID NOT NULL REFERENCES error_reports(id) ON DELETE CASCADE,
  error_pattern_id UUID NOT NULL REFERENCES error_patterns(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (error_report_id, error_pattern_id)
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_error_reports_user_id ON error_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_error_reports_status ON error_reports(status);
CREATE INDEX IF NOT EXISTS idx_error_reports_context ON error_reports(context);
CREATE INDEX IF NOT EXISTS idx_error_reports_error_type ON error_reports(error_type);
CREATE INDEX IF NOT EXISTS idx_error_reports_reported_at ON error_reports(reported_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_reports_priority_score ON error_reports(priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_error_reports_ticket_id ON error_reports(ticket_id);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_error_reports_status_priority ON error_reports(status, priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_error_reports_context_reported ON error_reports(context, reported_at DESC);

CREATE INDEX IF NOT EXISTS idx_error_report_comments_error_id ON error_report_comments(error_report_id);
CREATE INDEX IF NOT EXISTS idx_error_patterns_status ON error_patterns(status);
CREATE INDEX IF NOT EXISTS idx_error_patterns_signature ON error_patterns(error_signature);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_error_reports_updated_at
  BEFORE UPDATE ON error_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_error_report_comments_updated_at
  BEFORE UPDATE ON error_report_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_error_patterns_updated_at
  BEFORE UPDATE ON error_patterns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS)
ALTER TABLE error_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_report_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_pattern_occurrences ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- error_reports policies
-- Admin/Super Admin can see all errors
CREATE POLICY "Admins can view all error reports"
  ON error_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (users.role = 'Admin' OR users.is_super_admin = true)
    )
  );

-- Users can see their own error reports
CREATE POLICY "Users can view their own error reports"
  ON error_reports FOR SELECT
  USING (user_id = auth.uid());

-- Service role can insert (for API)
CREATE POLICY "Service role can insert error reports"
  ON error_reports FOR INSERT
  WITH CHECK (true); -- Will be restricted by API layer

-- Admins can update error reports
CREATE POLICY "Admins can update error reports"
  ON error_reports FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (users.role = 'Admin' OR users.is_super_admin = true)
    )
  );

-- error_report_comments policies
CREATE POLICY "Admins can manage comments"
  ON error_report_comments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (users.role = 'Admin' OR users.is_super_admin = true)
    )
  );

-- error_patterns policies
CREATE POLICY "Admins can manage error patterns"
  ON error_patterns FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (users.role = 'Admin' OR users.is_super_admin = true)
    )
  );

CREATE POLICY "Admins can manage pattern occurrences"
  ON error_pattern_occurrences FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (users.role = 'Admin' OR users.is_super_admin = true)
    )
  );

-- Views for Analytics

-- Error summary by context
CREATE OR REPLACE VIEW error_summary_by_context AS
SELECT
  context,
  COUNT(*) as total_errors,
  COUNT(DISTINCT user_id) as affected_users,
  COUNT(DISTINCT DATE(reported_at)) as days_with_errors,
  MAX(reported_at) as last_error_at,
  AVG(priority_score) as avg_priority,
  COUNT(*) FILTER (WHERE status = 'open') as open_count,
  COUNT(*) FILTER (WHERE status = 'resolved') as resolved_count
FROM error_reports
WHERE deleted_at IS NULL
GROUP BY context
ORDER BY total_errors DESC;

-- Error summary by type
CREATE OR REPLACE VIEW error_summary_by_type AS
SELECT
  error_type,
  COUNT(*) as total_errors,
  COUNT(DISTINCT user_id) as affected_users,
  MAX(reported_at) as last_error_at,
  AVG(priority_score) as avg_priority
FROM error_reports
WHERE deleted_at IS NULL AND error_type IS NOT NULL
GROUP BY error_type
ORDER BY total_errors DESC;

-- Daily error trends (last 30 days)
CREATE OR REPLACE VIEW error_trends_daily AS
SELECT
  DATE(reported_at) as error_date,
  COUNT(*) as total_errors,
  COUNT(DISTINCT user_id) as affected_users,
  COUNT(DISTINCT context) as contexts_affected,
  AVG(priority_score) as avg_priority
FROM error_reports
WHERE
  deleted_at IS NULL
  AND reported_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(reported_at)
ORDER BY error_date DESC;

-- Top error messages (most frequent)
CREATE OR REPLACE VIEW top_error_messages AS
SELECT
  error_message,
  context,
  error_type,
  COUNT(*) as occurrence_count,
  COUNT(DISTINCT user_id) as affected_users,
  MAX(reported_at) as last_occurred_at,
  MIN(reported_at) as first_occurred_at,
  AVG(priority_score) as avg_priority,
  array_agg(DISTINCT status) as statuses
FROM error_reports
WHERE deleted_at IS NULL
GROUP BY error_message, context, error_type
HAVING COUNT(*) > 1 -- Only show recurring errors
ORDER BY occurrence_count DESC
LIMIT 50;

-- Comment on tables
COMMENT ON TABLE error_reports IS 'Stores all error reports with detailed context for analytics and resolution tracking';
COMMENT ON TABLE error_report_comments IS 'Team comments and notes on error reports';
COMMENT ON TABLE error_patterns IS 'Identified recurring error patterns for proactive fixes';
COMMENT ON TABLE error_pattern_occurrences IS 'Links error reports to identified patterns';

-- Grant permissions to authenticated users (read-only for views)
GRANT SELECT ON error_summary_by_context TO authenticated;
GRANT SELECT ON error_summary_by_type TO authenticated;
GRANT SELECT ON error_trends_daily TO authenticated;
GRANT SELECT ON top_error_messages TO authenticated;
