-- Migration: Command Interface Tables
-- Creates tables for the Intelligent Command Center feature
-- Tables: command_undo_log, entity_aliases

-- ============================================
-- 1. Command Undo Log Table
-- Stores executed commands and their changes for undo capability
-- ============================================

CREATE TABLE IF NOT EXISTS command_undo_log (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  command_text TEXT NOT NULL,
  changes JSONB NOT NULL DEFAULT '[]',
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '5 minutes'),
  undone BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_command_undo_expires
  ON command_undo_log(expires_at)
  WHERE undone = FALSE;

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_command_undo_user
  ON command_undo_log(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE command_undo_log ENABLE ROW LEVEL SECURITY;

-- Users can only see and manage their own undo entries
CREATE POLICY "Users can manage their own undo entries"
  ON command_undo_log
  FOR ALL
  USING (auth.uid() = user_id);

-- ============================================
-- 2. Entity Aliases Table
-- Stores learned aliases for organizations and users
-- When user types "BigCo" and selects "Big Company Ltd",
-- we remember this for future matching
-- ============================================

CREATE TABLE IF NOT EXISTS entity_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('org', 'user')),
  alias TEXT NOT NULL,
  target_id UUID NOT NULL,
  target_name TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  usage_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint on entity_type + alias
  UNIQUE(entity_type, alias)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_entity_aliases_lookup
  ON entity_aliases(entity_type, alias);

-- Index for usage tracking
CREATE INDEX IF NOT EXISTS idx_entity_aliases_usage
  ON entity_aliases(usage_count DESC);

-- Enable RLS
ALTER TABLE entity_aliases ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read aliases
CREATE POLICY "Authenticated users can read aliases"
  ON entity_aliases
  FOR SELECT
  TO authenticated
  USING (true);

-- Users can create aliases
CREATE POLICY "Authenticated users can create aliases"
  ON entity_aliases
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Users can update aliases (increment usage count)
CREATE POLICY "Authenticated users can update aliases"
  ON entity_aliases
  FOR UPDATE
  TO authenticated
  USING (true);

-- ============================================
-- 3. Helper function to increment usage count
-- NOTE: This older version (UUID param) is superseded by
-- the version in 20251129_entity_aliases.sql (entity_type, alias params)
-- ============================================

-- DEPRECATED: Old function with UUID parameter - not used
-- The correct version with (p_entity_type TEXT, p_alias TEXT) signature
-- is defined in 20251129_entity_aliases.sql
--
-- CREATE OR REPLACE FUNCTION increment_alias_usage(alias_id UUID)
-- RETURNS INTEGER AS $$
-- DECLARE
--   new_count INTEGER;
-- BEGIN
--   UPDATE entity_aliases
--   SET usage_count = usage_count + 1,
--       updated_at = NOW()
--   WHERE id = alias_id
--   RETURNING usage_count INTO new_count;
--
--   RETURN COALESCE(new_count, 0);
-- END;
-- $$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. Cleanup function for expired undo logs
-- Run periodically via cron or manually
-- ============================================

CREATE OR REPLACE FUNCTION cleanup_expired_command_undo_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM command_undo_log
  WHERE expires_at < NOW()
  RETURNING 1 INTO deleted_count;

  RETURN COALESCE(deleted_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. Updated_at trigger for entity_aliases
-- ============================================

CREATE OR REPLACE FUNCTION update_entity_alias_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_entity_alias_timestamp
  BEFORE UPDATE ON entity_aliases
  FOR EACH ROW
  EXECUTE FUNCTION update_entity_alias_timestamp();
