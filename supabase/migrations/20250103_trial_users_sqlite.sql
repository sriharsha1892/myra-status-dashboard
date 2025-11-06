-- SQLite Migration: Trial Users and Activity Tracking System
-- Description: Track actual platform users at trial organizations with structured activity logging

-- ============================================================================
-- TRIAL USERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS trial_users (
  user_id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  org_id TEXT NOT NULL REFERENCES trial_organizations(org_id) ON DELETE CASCADE,

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
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_active_at DATETIME,
  invited_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  UNIQUE(email, org_id)
);

CREATE INDEX IF NOT EXISTS idx_trial_users_org_id ON trial_users(org_id);
CREATE INDEX IF NOT EXISTS idx_trial_users_stage ON trial_users(current_stage);
CREATE INDEX IF NOT EXISTS idx_trial_users_account_manager ON trial_users(account_manager);
CREATE INDEX IF NOT EXISTS idx_trial_users_email ON trial_users(email);

-- ============================================================================
-- USER STAGE HISTORY TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_stage_history (
  history_id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES trial_users(user_id) ON DELETE CASCADE,
  org_id TEXT NOT NULL REFERENCES trial_organizations(org_id) ON DELETE CASCADE,

  from_stage TEXT,
  to_stage TEXT NOT NULL,
  changed_by TEXT, -- Account Manager who made the change
  notes TEXT,

  changed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_stage_history_user_id ON user_stage_history(user_id);
CREATE INDEX IF NOT EXISTS idx_stage_history_changed_at ON user_stage_history(changed_at);

-- ============================================================================
-- USER ACTIVITIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_activities (
  activity_id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES trial_users(user_id) ON DELETE CASCADE,
  org_id TEXT NOT NULL REFERENCES trial_organizations(org_id) ON DELETE CASCADE,

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
  meeting_id TEXT REFERENCES meeting_notes(meeting_id) ON DELETE SET NULL, -- Link to meeting where this was observed
  created_by TEXT, -- Account Manager who logged this

  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_org_id ON user_activities(org_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_type ON user_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activities_status ON user_activities(status);
CREATE INDEX IF NOT EXISTS idx_user_activities_created_at ON user_activities(created_at);

-- ============================================================================
-- USER TOPICS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_topics (
  topic_id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES trial_users(user_id) ON DELETE CASCADE,
  org_id TEXT NOT NULL REFERENCES trial_organizations(org_id) ON DELETE CASCADE,

  topic_name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'exploring', -- 'exploring', 'implementing', 'implemented', 'blocked', 'abandoned'
  priority TEXT, -- 'high', 'medium', 'low'

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_topics_user_id ON user_topics(user_id);
CREATE INDEX IF NOT EXISTS idx_user_topics_status ON user_topics(status);

-- ============================================================================
-- USER ISSUES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_issues (
  issue_id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES trial_users(user_id) ON DELETE CASCADE,
  org_id TEXT NOT NULL REFERENCES trial_organizations(org_id) ON DELETE CASCADE,

  issue_type TEXT NOT NULL, -- 'technical', 'product', 'documentation', 'performance', 'integration', 'training'
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT DEFAULT 'medium', -- 'critical', 'high', 'medium', 'low'
  status TEXT DEFAULT 'open', -- 'open', 'investigating', 'resolved', 'wont_fix', 'duplicate'

  -- Linkage
  meeting_id TEXT REFERENCES meeting_notes(meeting_id) ON DELETE SET NULL,
  assigned_to TEXT, -- Who is responsible for resolving this

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_user_issues_user_id ON user_issues(user_id);
CREATE INDEX IF NOT EXISTS idx_user_issues_status ON user_issues(status);
CREATE INDEX IF NOT EXISTS idx_user_issues_severity ON user_issues(severity);

-- ============================================================================
-- USER PROGRESS METRICS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_progress_metrics (
  metric_id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES trial_users(user_id) ON DELETE CASCADE,

  metric_name TEXT NOT NULL, -- 'agents_created', 'workflows_built', 'api_calls_made', 'integrations_setup', etc.
  metric_value REAL NOT NULL,
  metric_unit TEXT, -- 'count', 'hours', 'percentage', etc.

  recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  recorded_by TEXT -- Who recorded this metric
);

CREATE INDEX IF NOT EXISTS idx_progress_metrics_user_id ON user_progress_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_metrics_name ON user_progress_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_progress_metrics_recorded_at ON user_progress_metrics(recorded_at);

-- ============================================================================
-- USER INTERACTIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_interactions (
  interaction_id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES trial_users(user_id) ON DELETE CASCADE,
  org_id TEXT NOT NULL REFERENCES trial_organizations(org_id) ON DELETE CASCADE,

  interaction_type TEXT NOT NULL, -- 'call', 'email', 'meeting', 'chat', 'training', 'demo', 'support'
  title TEXT NOT NULL,
  notes TEXT,

  conducted_by TEXT, -- Account Manager or Sales POC who conducted the interaction
  meeting_id TEXT REFERENCES meeting_notes(meeting_id) ON DELETE SET NULL, -- Link to meeting if applicable

  interaction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  duration_minutes INTEGER,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_interactions_user_id ON user_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_type ON user_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_user_interactions_date ON user_interactions(interaction_date);

-- ============================================================================
-- TRIGGERS FOR AUTO-UPDATES
-- ============================================================================

-- Trigger to update updated_at on user_activities
CREATE TRIGGER IF NOT EXISTS update_user_activities_updated_at
    AFTER UPDATE ON user_activities
    FOR EACH ROW
BEGIN
    UPDATE user_activities SET updated_at = CURRENT_TIMESTAMP WHERE activity_id = NEW.activity_id;
END;

-- Trigger to update updated_at on user_topics
CREATE TRIGGER IF NOT EXISTS update_user_topics_updated_at
    AFTER UPDATE ON user_topics
    FOR EACH ROW
BEGIN
    UPDATE user_topics SET updated_at = CURRENT_TIMESTAMP WHERE topic_id = NEW.topic_id;
END;

-- Trigger to update updated_at on user_issues
CREATE TRIGGER IF NOT EXISTS update_user_issues_updated_at
    AFTER UPDATE ON user_issues
    FOR EACH ROW
BEGIN
    UPDATE user_issues SET updated_at = CURRENT_TIMESTAMP WHERE issue_id = NEW.issue_id;
END;

-- Trigger to automatically log stage changes
CREATE TRIGGER IF NOT EXISTS trigger_log_stage_change
    AFTER UPDATE OF current_stage ON trial_users
    FOR EACH ROW
    WHEN OLD.current_stage != NEW.current_stage
BEGIN
    INSERT INTO user_stage_history (user_id, org_id, from_stage, to_stage, changed_at)
    VALUES (NEW.user_id, NEW.org_id, OLD.current_stage, NEW.current_stage, CURRENT_TIMESTAMP);
END;
