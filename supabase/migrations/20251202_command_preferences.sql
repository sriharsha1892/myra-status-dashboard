-- Migration: Command Preferences Tables
-- Creates tables for user preference learning and adaptive thresholds
-- Tables: command_user_preferences, command_execution_history

-- ============================================
-- 1. Command Execution History Table
-- Tracks all command executions for learning
-- ============================================

CREATE TABLE IF NOT EXISTS command_execution_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES trial_organizations(org_id),
  org_name TEXT,
  action TEXT NOT NULL,
  command_text TEXT NOT NULL,
  confidence NUMERIC(4,3) NOT NULL, -- e.g., 0.925
  confidence_tier TEXT NOT NULL CHECK (confidence_tier IN ('high', 'medium', 'low')),
  auto_executed BOOLEAN DEFAULT FALSE,
  success BOOLEAN DEFAULT TRUE,
  execution_time_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for user analytics
CREATE INDEX IF NOT EXISTS idx_cmd_exec_user_created
  ON command_execution_history(user_id, created_at DESC);

-- Index for org frequency analysis
CREATE INDEX IF NOT EXISTS idx_cmd_exec_user_org
  ON command_execution_history(user_id, org_id, created_at DESC);

-- Index for success rate calculations
CREATE INDEX IF NOT EXISTS idx_cmd_exec_user_success
  ON command_execution_history(user_id, success, created_at DESC);

-- Enable RLS
ALTER TABLE command_execution_history ENABLE ROW LEVEL SECURITY;

-- Users can only see their own execution history
CREATE POLICY "Users can view own execution history"
  ON command_execution_history
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own execution history"
  ON command_execution_history
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 2. Command User Preferences Table
-- Stores calculated preferences per user
-- Updated periodically from execution history
-- ============================================

CREATE TABLE IF NOT EXISTS command_user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  -- Execution stats
  total_commands INTEGER DEFAULT 0,
  successful_commands INTEGER DEFAULT 0,
  success_rate NUMERIC(4,3), -- e.g., 0.950
  -- Adaptive threshold
  auto_execute_threshold NUMERIC(4,3) DEFAULT 0.90, -- Default HIGH threshold
  threshold_adjusted_at TIMESTAMPTZ,
  threshold_reason TEXT,
  -- Frequent orgs (JSONB array of {org_id, org_name, count, last_used})
  frequent_orgs JSONB DEFAULT '[]',
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for user lookup
CREATE INDEX IF NOT EXISTS idx_cmd_prefs_user
  ON command_user_preferences(user_id);

-- Enable RLS
ALTER TABLE command_user_preferences ENABLE ROW LEVEL SECURITY;

-- Users can only see and manage their own preferences
CREATE POLICY "Users can manage own preferences"
  ON command_user_preferences
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================
-- 3. Function to record command execution
-- ============================================

CREATE OR REPLACE FUNCTION record_command_execution(
  p_user_id UUID,
  p_org_id UUID,
  p_org_name TEXT,
  p_action TEXT,
  p_command_text TEXT,
  p_confidence NUMERIC,
  p_confidence_tier TEXT,
  p_auto_executed BOOLEAN,
  p_success BOOLEAN,
  p_execution_time_ms INTEGER DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_exec_id UUID;
BEGIN
  -- Insert execution record
  INSERT INTO command_execution_history (
    user_id, org_id, org_name, action, command_text,
    confidence, confidence_tier, auto_executed, success,
    execution_time_ms, error_message
  ) VALUES (
    p_user_id, p_org_id, p_org_name, p_action, p_command_text,
    p_confidence, p_confidence_tier, p_auto_executed, p_success,
    p_execution_time_ms, p_error_message
  )
  RETURNING id INTO v_exec_id;

  -- Update or create user preferences
  INSERT INTO command_user_preferences (user_id, total_commands, successful_commands)
  VALUES (p_user_id, 1, CASE WHEN p_success THEN 1 ELSE 0 END)
  ON CONFLICT (user_id) DO UPDATE SET
    total_commands = command_user_preferences.total_commands + 1,
    successful_commands = command_user_preferences.successful_commands +
      CASE WHEN p_success THEN 1 ELSE 0 END,
    success_rate = (command_user_preferences.successful_commands +
      CASE WHEN p_success THEN 1 ELSE 0 END)::NUMERIC /
      (command_user_preferences.total_commands + 1),
    updated_at = NOW();

  RETURN v_exec_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. Function to update frequent orgs
-- Call periodically to recalculate
-- ============================================

CREATE OR REPLACE FUNCTION update_user_frequent_orgs(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_frequent_orgs JSONB;
BEGIN
  -- Get top 10 most used orgs in last 30 days
  SELECT COALESCE(jsonb_agg(org_data ORDER BY count DESC), '[]')
  INTO v_frequent_orgs
  FROM (
    SELECT
      org_id,
      org_name,
      COUNT(*) as count,
      MAX(created_at) as last_used
    FROM command_execution_history
    WHERE user_id = p_user_id
      AND org_id IS NOT NULL
      AND created_at > NOW() - INTERVAL '30 days'
    GROUP BY org_id, org_name
    ORDER BY count DESC
    LIMIT 10
  ) AS org_data;

  UPDATE command_user_preferences
  SET frequent_orgs = v_frequent_orgs,
      updated_at = NOW()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. Function to check and adjust threshold
-- Call after each command to potentially lower threshold
-- ============================================

CREATE OR REPLACE FUNCTION maybe_adjust_threshold(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_prefs command_user_preferences%ROWTYPE;
  v_new_threshold NUMERIC(4,3);
BEGIN
  SELECT * INTO v_prefs
  FROM command_user_preferences
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Only adjust if:
  -- 1. User has at least 20 commands
  -- 2. Success rate is >= 95%
  -- 3. Current threshold is still at default (0.90)
  IF v_prefs.total_commands >= 20
     AND v_prefs.success_rate >= 0.95
     AND v_prefs.auto_execute_threshold >= 0.90
  THEN
    v_new_threshold := 0.85; -- Lower threshold for power users

    UPDATE command_user_preferences
    SET auto_execute_threshold = v_new_threshold,
        threshold_adjusted_at = NOW(),
        threshold_reason = 'Auto-adjusted: >20 commands with >95% success rate',
        updated_at = NOW()
    WHERE user_id = p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. Function to get user's adaptive threshold
-- ============================================

CREATE OR REPLACE FUNCTION get_user_auto_execute_threshold(p_user_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_threshold NUMERIC(4,3);
BEGIN
  SELECT auto_execute_threshold INTO v_threshold
  FROM command_user_preferences
  WHERE user_id = p_user_id;

  -- Default to 0.90 if no preferences exist
  RETURN COALESCE(v_threshold, 0.90);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. Updated_at trigger
-- ============================================

CREATE OR REPLACE FUNCTION update_command_prefs_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_command_prefs_timestamp
  BEFORE UPDATE ON command_user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_command_prefs_timestamp();

-- ============================================
-- 8. Cleanup old execution history (keep 90 days)
-- ============================================

CREATE OR REPLACE FUNCTION cleanup_old_execution_history()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM command_execution_history
  WHERE created_at < NOW() - INTERVAL '90 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
