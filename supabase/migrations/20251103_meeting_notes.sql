-- Create meeting_notes table
CREATE TABLE IF NOT EXISTS meeting_notes (
  meeting_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES trial_organizations(org_id) ON DELETE CASCADE,
  meeting_type TEXT NOT NULL,
  meeting_date TIMESTAMP NOT NULL,
  duration_minutes INTEGER,
  conducted_by TEXT NOT NULL,
  attendees TEXT[],
  meeting_summary TEXT,
  pain_points_discussed TEXT,
  objections_raised TEXT,
  positive_signals TEXT,
  action_items JSONB DEFAULT '[]'::jsonb,
  next_meeting_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_meeting_org ON meeting_notes(org_id);
CREATE INDEX IF NOT EXISTS idx_meeting_date ON meeting_notes(meeting_date);

-- Enable RLS
ALTER TABLE meeting_notes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Enable all operations for authenticated users" ON meeting_notes
  FOR ALL
  USING (true)
  WITH CHECK (true);
