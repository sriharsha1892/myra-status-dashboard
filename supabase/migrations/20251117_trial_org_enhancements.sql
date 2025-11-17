-- Migration: Trial Organization Enhancements
-- Date: 2025-11-17
-- Description: Add platform_queries table, parent_organization field, remove team_size, and timeline integration

-- ============================================================================
-- STEP 1: Archive team_size and drop column from trial_organizations
-- ============================================================================

-- Archive existing team_size values to custom_fields JSONB before dropping (if column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trial_organizations'
    AND column_name = 'team_size'
  ) THEN
    UPDATE trial_organizations
    SET custom_fields = jsonb_set(
      COALESCE(custom_fields, '{}'::jsonb),
      '{archived_team_size}',
      to_jsonb(team_size)
    )
    WHERE team_size IS NOT NULL AND team_size > 0;

    -- Drop the team_size column
    ALTER TABLE trial_organizations DROP COLUMN team_size;
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Add parent_organization column to trial_organizations
-- ============================================================================

ALTER TABLE trial_organizations
ADD COLUMN IF NOT EXISTS parent_organization TEXT
CHECK (parent_organization IN ('Mordor Intelligence', 'GMI'))
DEFAULT 'Mordor Intelligence';

-- Set default for existing rows
UPDATE trial_organizations
SET parent_organization = 'Mordor Intelligence'
WHERE parent_organization IS NULL;

-- ============================================================================
-- STEP 3: Create platform_queries table
-- ============================================================================

CREATE TABLE IF NOT EXISTS platform_queries (
  query_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES trial_users(user_id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES trial_organizations(org_id) ON DELETE CASCADE,

  -- Query details
  query_topic TEXT NOT NULL,
  query_text TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'partial', 'failed', 'timeout')),
  confidence_score DECIMAL(5,2) CHECK (confidence_score >= 0 AND confidence_score <= 100),

  -- Performance metrics
  response_time_ms INTEGER,

  -- Session tracking
  session_id TEXT,

  -- Flexible metadata storage
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  executed_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_platform_queries_org ON platform_queries(org_id);
CREATE INDEX IF NOT EXISTS idx_platform_queries_user ON platform_queries(user_id);
CREATE INDEX IF NOT EXISTS idx_platform_queries_executed ON platform_queries(executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_queries_status ON platform_queries(status);

-- Enable Row Level Security
ALTER TABLE platform_queries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for platform_queries
CREATE POLICY "Users can view platform queries for their assigned orgs"
  ON platform_queries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trial_organizations org
      INNER JOIN users u ON u.id = org.account_manager_id
      WHERE org.org_id = platform_queries.org_id
        AND u.id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.role IN ('Admin', 'Support')
    )
  );

CREATE POLICY "Users can insert platform queries for their assigned orgs"
  ON platform_queries FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trial_organizations org
      INNER JOIN users u ON u.id = org.account_manager_id
      WHERE org.org_id = platform_queries.org_id
        AND u.id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.role IN ('Admin', 'Support')
    )
  );

-- ============================================================================
-- STEP 4: Add query event types to timeline taxonomy
-- ============================================================================

-- Check if event_type_taxonomy table exists and has the expected structure
DO $$
BEGIN
  -- Only insert if table exists and has category column
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'event_type_taxonomy'
    AND column_name = 'category'
  ) THEN
    -- Insert query_executed event type
    INSERT INTO event_type_taxonomy (event_type, category, display_name, icon, color_class)
    VALUES ('query_executed', 'engagement', 'Platform Query Executed', 'search', '#DBEAFE')
    ON CONFLICT (event_type) DO NOTHING;

    -- Insert query_failed event type
    INSERT INTO event_type_taxonomy (event_type, category, display_name, icon, color_class)
    VALUES ('query_failed', 'support', 'Query Failed', 'alert-circle', '#FEE2E2')
    ON CONFLICT (event_type) DO NOTHING;
  END IF;
END $$;

-- ============================================================================
-- STEP 5: Create timeline trigger for platform queries
-- ============================================================================

-- Function to create timeline event when query is logged
CREATE OR REPLACE FUNCTION create_timeline_event_for_query()
RETURNS TRIGGER AS $$
DECLARE
  user_name TEXT;
BEGIN
  -- Get user name for better timeline display
  SELECT name INTO user_name
  FROM trial_users
  WHERE user_id = NEW.user_id;

  -- Insert timeline event
  INSERT INTO trial_timeline_events (
    org_id,
    event_type,
    event_category,
    title,
    description,
    sentiment,
    severity,
    event_timestamp,
    source,
    metadata
  ) VALUES (
    NEW.org_id,
    CASE
      WHEN NEW.status = 'success' THEN 'query_executed'
      ELSE 'query_failed'
    END,
    CASE
      WHEN NEW.status = 'success' THEN 'engagement'
      ELSE 'support'
    END,
    CASE
      WHEN NEW.status = 'success' THEN 'Query: ' || NEW.query_topic
      ELSE 'Failed Query: ' || NEW.query_topic
    END,
    'User ' || COALESCE(user_name, 'Unknown') || ' executed query: ' || NEW.query_text,
    CASE
      WHEN NEW.status = 'success' THEN 'positive'
      WHEN NEW.status = 'failed' THEN 'negative'
      ELSE 'neutral'
    END,
    CASE
      WHEN NEW.status = 'failed' THEN 'medium'
      ELSE 'low'
    END,
    NEW.executed_at,
    'system_generated',
    jsonb_build_object(
      'query_id', NEW.query_id,
      'user_id', NEW.user_id,
      'user_name', COALESCE(user_name, 'Unknown'),
      'confidence_score', NEW.confidence_score,
      'response_time_ms', NEW.response_time_ms,
      'status', NEW.status,
      'query_type', 'platform_query'
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS query_timeline_trigger ON platform_queries;
CREATE TRIGGER query_timeline_trigger
  AFTER INSERT ON platform_queries
  FOR EACH ROW
  EXECUTE FUNCTION create_timeline_event_for_query();

-- ============================================================================
-- STEP 6: Update trial_users.queries_executed counter when query is logged
-- ============================================================================

CREATE OR REPLACE FUNCTION increment_user_query_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Increment queries_executed counter for the user
  UPDATE trial_users
  SET queries_executed = COALESCE(queries_executed, 0) + 1
  WHERE user_id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS update_query_count_trigger ON platform_queries;
CREATE TRIGGER update_query_count_trigger
  AFTER INSERT ON platform_queries
  FOR EACH ROW
  EXECUTE FUNCTION increment_user_query_count();

-- ============================================================================
-- Migration completed successfully
-- ============================================================================
