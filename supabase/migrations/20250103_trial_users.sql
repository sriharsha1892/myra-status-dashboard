-- Migration: Trial Users and Activity Tracking System
-- Description: Track actual platform users at trial organizations with structured activity logging

-- ============================================================================
-- TRIAL USERS TABLE
-- ============================================================================
-- Stores actual platform users at trial organizations
CREATE TABLE IF NOT EXISTS trial_users (
  user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES trial_organizations(org_id) ON DELETE CASCADE,

  -- Basic User Information
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT, -- User's role at their company (Admin, Manager, User, Developer, etc.)
  phone TEXT,

  -- External IDs
  salesforce_id TEXT,

  -- Journey Tracking
  current_stage TEXT NOT NULL DEFAULT 'invited',

  -- Account Management
  account_manager TEXT NOT NULL, -- One of the 8 Account Managers
  sales_poc TEXT, -- Actual salesperson from 60-person team reporting to AMs

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  last_active_at TIMESTAMP,
  invited_at TIMESTAMP DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_user_email_per_org UNIQUE(email, org_id)
);

-- Index for performance
CREATE INDEX idx_trial_users_org_id ON trial_users(org_id);
CREATE INDEX idx_trial_users_stage ON trial_users(current_stage);
CREATE INDEX idx_trial_users_account_manager ON trial_users(account_manager);
CREATE INDEX idx_trial_users_email ON trial_users(email);

-- ============================================================================
-- USER STAGE HISTORY TABLE
-- ============================================================================
-- Tracks stage progression over time
CREATE TABLE IF NOT EXISTS user_stage_history (
  history_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES trial_users(user_id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES trial_organizations(org_id) ON DELETE CASCADE,

  from_stage TEXT,
  to_stage TEXT NOT NULL,
  changed_by TEXT, -- Account Manager who made the change
  notes TEXT,

  changed_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_stage_history_user_id ON user_stage_history(user_id);
CREATE INDEX idx_stage_history_changed_at ON user_stage_history(changed_at DESC);

-- ============================================================================
-- USER ACTIVITIES TABLE
-- ============================================================================
-- Structured activity log for user interactions and observations
CREATE TABLE IF NOT EXISTS user_activities (
  activity_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES trial_users(user_id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES trial_organizations(org_id) ON DELETE CASCADE,

  -- Activity Classification
  activity_type TEXT NOT NULL, -- 'topic', 'issue', 'milestone', 'interaction', 'progress_update', 'feedback'
  category TEXT, -- 'technical', 'feature_request', 'bug', 'usage', 'training', 'integration', 'business'

  -- Content
  title TEXT NOT NULL,
  description TEXT,

  -- Metadata
  priority TEXT, -- 'critical', 'high', 'medium', 'low'
  status TEXT DEFAULT 'open', -- 'open', 'in_progress', 'resolved', 'closed'

  -- Linkage
  meeting_id UUID REFERENCES meeting_notes(meeting_id) ON DELETE SET NULL, -- Link to meeting where this was observed
  created_by TEXT, -- Account Manager who logged this

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);

CREATE INDEX idx_user_activities_user_id ON user_activities(user_id);
CREATE INDEX idx_user_activities_org_id ON user_activities(org_id);
CREATE INDEX idx_user_activities_type ON user_activities(activity_type);
CREATE INDEX idx_user_activities_status ON user_activities(status);
CREATE INDEX idx_user_activities_created_at ON user_activities(created_at DESC);

-- ============================================================================
-- USER TOPICS TABLE
-- ============================================================================
-- Topics/use cases being explored by users
CREATE TABLE IF NOT EXISTS user_topics (
  topic_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES trial_users(user_id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES trial_organizations(org_id) ON DELETE CASCADE,

  topic_name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'exploring', -- 'exploring', 'implementing', 'implemented', 'blocked', 'abandoned'
  priority TEXT, -- 'high', 'medium', 'low'

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_topics_user_id ON user_topics(user_id);
CREATE INDEX idx_user_topics_status ON user_topics(status);

-- ============================================================================
-- USER ISSUES TABLE
-- ============================================================================
-- Issues and blockers encountered by users
CREATE TABLE IF NOT EXISTS user_issues (
  issue_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES trial_users(user_id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES trial_organizations(org_id) ON DELETE CASCADE,

  issue_type TEXT NOT NULL, -- 'technical', 'product', 'documentation', 'performance', 'integration', 'training'
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT DEFAULT 'medium', -- 'critical', 'high', 'medium', 'low'
  status TEXT DEFAULT 'open', -- 'open', 'investigating', 'resolved', 'wont_fix', 'duplicate'

  -- Linkage
  meeting_id UUID REFERENCES meeting_notes(meeting_id) ON DELETE SET NULL,
  assigned_to TEXT, -- Who is responsible for resolving this

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);

CREATE INDEX idx_user_issues_user_id ON user_issues(user_id);
CREATE INDEX idx_user_issues_status ON user_issues(status);
CREATE INDEX idx_user_issues_severity ON user_issues(severity);

-- ============================================================================
-- USER PROGRESS METRICS TABLE
-- ============================================================================
-- Quantifiable progress metrics for user adoption
CREATE TABLE IF NOT EXISTS user_progress_metrics (
  metric_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES trial_users(user_id) ON DELETE CASCADE,

  metric_name TEXT NOT NULL, -- 'agents_created', 'workflows_built', 'api_calls_made', 'integrations_setup', etc.
  metric_value NUMERIC NOT NULL,
  metric_unit TEXT, -- 'count', 'hours', 'percentage', etc.

  recorded_at TIMESTAMP DEFAULT NOW(),
  recorded_by TEXT -- Who recorded this metric
);

CREATE INDEX idx_progress_metrics_user_id ON user_progress_metrics(user_id);
CREATE INDEX idx_progress_metrics_name ON user_progress_metrics(metric_name);
CREATE INDEX idx_progress_metrics_recorded_at ON user_progress_metrics(recorded_at DESC);

-- ============================================================================
-- USER INTERACTIONS TABLE
-- ============================================================================
-- Log of all interactions/touchpoints with users
CREATE TABLE IF NOT EXISTS user_interactions (
  interaction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES trial_users(user_id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES trial_organizations(org_id) ON DELETE CASCADE,

  interaction_type TEXT NOT NULL, -- 'call', 'email', 'meeting', 'chat', 'training', 'demo', 'support'
  title TEXT NOT NULL,
  notes TEXT,

  conducted_by TEXT, -- Account Manager or Sales POC who conducted the interaction
  meeting_id UUID REFERENCES meeting_notes(meeting_id) ON DELETE SET NULL, -- Link to meeting if applicable

  interaction_date TIMESTAMP DEFAULT NOW(),
  duration_minutes INTEGER,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_interactions_user_id ON user_interactions(user_id);
CREATE INDEX idx_user_interactions_type ON user_interactions(interaction_type);
CREATE INDEX idx_user_interactions_date ON user_interactions(interaction_date DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
-- Enable RLS on all tables
ALTER TABLE trial_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stage_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_interactions ENABLE ROW LEVEL SECURITY;

-- Create policies (allowing all operations for authenticated users for now)
CREATE POLICY "Allow all operations for authenticated users" ON trial_users
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all operations for authenticated users" ON user_stage_history
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all operations for authenticated users" ON user_activities
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all operations for authenticated users" ON user_topics
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all operations for authenticated users" ON user_issues
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all operations for authenticated users" ON user_progress_metrics
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all operations for authenticated users" ON user_interactions
  FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_user_activities_updated_at BEFORE UPDATE ON user_activities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_topics_updated_at BEFORE UPDATE ON user_topics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_issues_updated_at BEFORE UPDATE ON user_issues
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to log stage changes to history table
CREATE OR REPLACE FUNCTION log_stage_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'UPDATE' AND OLD.current_stage IS DISTINCT FROM NEW.current_stage) THEN
        INSERT INTO user_stage_history (user_id, org_id, from_stage, to_stage, changed_at)
        VALUES (NEW.user_id, NEW.org_id, OLD.current_stage, NEW.current_stage, NOW());
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically log stage changes
CREATE TRIGGER trigger_log_stage_change
    AFTER UPDATE ON trial_users
    FOR EACH ROW
    EXECUTE FUNCTION log_stage_change();

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE trial_users IS 'Actual platform users at trial organizations';
COMMENT ON TABLE user_stage_history IS 'Historical record of user journey stage progression';
COMMENT ON TABLE user_activities IS 'Structured activity log for user interactions and observations';
COMMENT ON TABLE user_topics IS 'Topics and use cases being explored by users';
COMMENT ON TABLE user_issues IS 'Issues and blockers encountered by users';
COMMENT ON TABLE user_progress_metrics IS 'Quantifiable progress metrics for user adoption';
COMMENT ON TABLE user_interactions IS 'Log of all touchpoints with users (calls, emails, meetings, etc.)';
