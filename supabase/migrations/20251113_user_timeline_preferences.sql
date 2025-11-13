-- User Timeline Preferences Table
-- Stores user-specific timeline preferences, custom templates, and correction history

CREATE TABLE IF NOT EXISTS user_timeline_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Custom templates for quick entry
  -- Structure: [{ name: string, event_type: string, event_category: string, title: string, description?: string, sentiment?: string, tags?: string[] }]
  custom_templates JSONB DEFAULT '[]'::jsonb,

  -- Correction history for fuzzy matching
  -- Structure: { "user_input": "corrected_event_type" }
  -- Example: { "call": "call_completed", "email": "email_exchange" }
  correction_history JSONB DEFAULT '{}'::jsonb,

  -- User preferences for import behavior
  auto_select_high_confidence BOOLEAN DEFAULT true,
  default_sentiment TEXT DEFAULT 'neutral',
  default_severity TEXT DEFAULT 'medium',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one preferences record per user
  UNIQUE(user_id)
);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_user_timeline_preferences_user_id
  ON user_timeline_preferences(user_id);

-- RLS Policies
ALTER TABLE user_timeline_preferences ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own preferences
CREATE POLICY "Users can view own timeline preferences"
  ON user_timeline_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own preferences
CREATE POLICY "Users can insert own timeline preferences"
  ON user_timeline_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own preferences
CREATE POLICY "Users can update own timeline preferences"
  ON user_timeline_preferences
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own preferences
CREATE POLICY "Users can delete own timeline preferences"
  ON user_timeline_preferences
  FOR DELETE
  USING (auth.uid() = user_id);

-- Updated at trigger function (if not already exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_user_timeline_preferences_updated_at
  BEFORE UPDATE ON user_timeline_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE user_timeline_preferences IS 'Stores user-specific timeline preferences, custom templates for quick entry, and correction history for fuzzy matching';
COMMENT ON COLUMN user_timeline_preferences.custom_templates IS 'Array of user-defined quick entry templates with pre-filled fields';
COMMENT ON COLUMN user_timeline_preferences.correction_history IS 'Object mapping user input to corrected event types for fuzzy matching learning';
COMMENT ON COLUMN user_timeline_preferences.auto_select_high_confidence IS 'Automatically select high confidence events (>=80%) in bulk import review';
COMMENT ON COLUMN user_timeline_preferences.default_sentiment IS 'Default sentiment for new timeline entries (positive/neutral/negative)';
COMMENT ON COLUMN user_timeline_preferences.default_severity IS 'Default severity for new timeline entries (low/medium/high/critical)';
