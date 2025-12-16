-- Entity Aliases for Command Interface
-- Stores learned mappings from user input to resolved entities

-- Create entity_aliases table
CREATE TABLE IF NOT EXISTS entity_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('org', 'user')),
  alias TEXT NOT NULL,
  target_id UUID NOT NULL,
  target_name TEXT NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  usage_count INTEGER DEFAULT 1,
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint on entity_type + alias
  UNIQUE(entity_type, alias)
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_entity_aliases_lookup
  ON entity_aliases(entity_type, alias);

CREATE INDEX IF NOT EXISTS idx_entity_aliases_target
  ON entity_aliases(entity_type, target_id);

CREATE INDEX IF NOT EXISTS idx_entity_aliases_usage
  ON entity_aliases(usage_count DESC);

-- Function to increment usage count (used in entityResolver.ts)
CREATE OR REPLACE FUNCTION increment_alias_usage(p_entity_type TEXT, p_alias TEXT)
RETURNS INTEGER AS $$
DECLARE
  new_count INTEGER;
BEGIN
  UPDATE entity_aliases
  SET
    usage_count = usage_count + 1,
    last_used_at = NOW(),
    updated_at = NOW()
  WHERE entity_type = p_entity_type AND alias = p_alias
  RETURNING usage_count INTO new_count;

  RETURN COALESCE(new_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS
ALTER TABLE entity_aliases ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Anyone can read aliases (they're shared across users)
CREATE POLICY "Anyone can read entity aliases"
  ON entity_aliases FOR SELECT
  USING (true);

-- Authenticated users can create aliases
CREATE POLICY "Authenticated users can create aliases"
  ON entity_aliases FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Users can update their own aliases or aliases they use
CREATE POLICY "Users can update aliases"
  ON entity_aliases FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Only admins can delete aliases
CREATE POLICY "Admins can delete aliases"
  ON entity_aliases FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('super_admin', 'admin')
    )
  );

-- Add comment
COMMENT ON TABLE entity_aliases IS 'Stores learned entity mappings from command interface - maps user input aliases to resolved entity IDs';
COMMENT ON COLUMN entity_aliases.entity_type IS 'Type of entity: org or user';
COMMENT ON COLUMN entity_aliases.alias IS 'The normalized input text that maps to the entity';
COMMENT ON COLUMN entity_aliases.target_id IS 'The UUID of the resolved entity';
COMMENT ON COLUMN entity_aliases.target_name IS 'Display name of the entity for quick reference';
COMMENT ON COLUMN entity_aliases.usage_count IS 'Number of times this alias has been used - for prioritization';
