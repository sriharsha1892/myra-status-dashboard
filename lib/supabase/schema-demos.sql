-- Demo Management Schema
-- This schema adds demo event tracking for trial organizations

-- Create sequence for demo IDs
CREATE SEQUENCE IF NOT EXISTS demo_seq START 1;

-- Create demo_events table
CREATE TABLE IF NOT EXISTS demo_events (
  demo_id TEXT PRIMARY KEY DEFAULT ('DEMO-' || EXTRACT(YEAR FROM NOW()) || '-' || LPAD(NEXTVAL('demo_seq')::TEXT, 3, '0')),
  org_id UUID NOT NULL REFERENCES trial_organizations(org_id) ON DELETE CASCADE,
  demo_date DATE NOT NULL,
  demo_time TIME,
  sales_poc TEXT NOT NULL,
  demo_status TEXT DEFAULT 'scheduled' CHECK (demo_status IN ('scheduled', 'completed', 'cancelled')),
  attendee_names TEXT[],
  demo_observations TEXT,
  pain_points TEXT,
  next_steps TEXT,
  demo_rating INTEGER CHECK (demo_rating BETWEEN 1 AND 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_demo_org ON demo_events(org_id);
CREATE INDEX IF NOT EXISTS idx_demo_status ON demo_events(demo_status);
CREATE INDEX IF NOT EXISTS idx_demo_date ON demo_events(demo_date);

-- Enable Row Level Security
ALTER TABLE demo_events ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
CREATE POLICY "Enable read access for all authenticated users" ON demo_events
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for authenticated users" ON demo_events
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON demo_events
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Enable delete for authenticated users" ON demo_events
  FOR DELETE
  TO authenticated
  USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_demo_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_demo_events_updated_at
  BEFORE UPDATE ON demo_events
  FOR EACH ROW
  EXECUTE FUNCTION update_demo_updated_at();
