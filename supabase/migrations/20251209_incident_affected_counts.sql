-- Migration: Create incident_affected_counts table for "I'm Affected" feature
-- This tracks anonymous user confirmations of being affected by incidents

CREATE TABLE IF NOT EXISTS incident_affected_counts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  incident_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  affected_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique index on incident_id to prevent duplicate entries
CREATE UNIQUE INDEX IF NOT EXISTS idx_incident_affected_counts_incident_id
  ON incident_affected_counts(incident_id);

-- Create index for provider lookups
CREATE INDEX IF NOT EXISTS idx_incident_affected_counts_provider_id
  ON incident_affected_counts(provider_id);

-- Enable RLS
ALTER TABLE incident_affected_counts ENABLE ROW LEVEL SECURITY;

-- Allow public read access (anyone can see affected counts)
CREATE POLICY "Allow public read access to affected counts"
  ON incident_affected_counts
  FOR SELECT
  USING (true);

-- Allow service role to insert/update (API route uses service role)
CREATE POLICY "Allow service role to manage affected counts"
  ON incident_affected_counts
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add comment for documentation
COMMENT ON TABLE incident_affected_counts IS 'Tracks anonymous user confirmations of being affected by service incidents';
