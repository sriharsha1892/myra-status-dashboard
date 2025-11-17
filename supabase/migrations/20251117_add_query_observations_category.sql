-- Migration: Add observations and query_category to platform_queries
-- Date: 2025-11-17
-- Description: Enhance platform_queries table with B2B AI market research specific fields

-- ============================================================================
-- Add observations field for B2B-specific dropdown selections
-- ============================================================================

ALTER TABLE platform_queries
ADD COLUMN IF NOT EXISTS observations TEXT;

COMMENT ON COLUMN platform_queries.observations IS
'B2B market research observations (e.g., "Good understanding of market", "Needs more context", "Excellent insight", etc.)';

-- ============================================================================
-- Add query_category field for market research taxonomy
-- ============================================================================

ALTER TABLE platform_queries
ADD COLUMN IF NOT EXISTS query_category TEXT;

COMMENT ON COLUMN platform_queries.query_category IS
'Market research category (e.g., "Market Size", "Competitive Analysis", "Trend Analysis", "Industry Overview", etc.)';

-- ============================================================================
-- Create index for query_category for filtering/grouping
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_platform_queries_category
ON platform_queries(query_category);

-- ============================================================================
-- Update timeline trigger to include new fields in metadata
-- ============================================================================

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
      'query_type', 'platform_query',
      'observations', NEW.observations,
      'query_category', NEW.query_category
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Migration completed successfully
-- ============================================================================
