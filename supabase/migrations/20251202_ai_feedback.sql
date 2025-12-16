-- AI Feedback Table - Stores user feedback on AI extractions
-- Used for computing accuracy metrics and generating training examples

CREATE TABLE IF NOT EXISTS ai_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action_type TEXT NOT NULL,
  original_input TEXT,
  extracted_output JSONB,
  corrected_output JSONB,
  was_correct BOOLEAN,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  error_type TEXT,
  field_feedback JSONB DEFAULT '{}',
  feedback_text TEXT,
  confidence FLOAT,
  source_email_id UUID,
  source_trial_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_ai_feedback_action_type ON ai_feedback(action_type);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_created_at ON ai_feedback(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_was_correct ON ai_feedback(was_correct);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_user_id ON ai_feedback(user_id);

-- RLS policies
ALTER TABLE ai_feedback ENABLE ROW LEVEL SECURITY;

-- Users can view all feedback (for transparency)
CREATE POLICY "Users can view all feedback"
  ON ai_feedback FOR SELECT
  TO authenticated
  USING (true);

-- Users can create feedback
CREATE POLICY "Users can create feedback"
  ON ai_feedback FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own feedback
CREATE POLICY "Users can update own feedback"
  ON ai_feedback FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_ai_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_ai_feedback_updated_at ON ai_feedback;
CREATE TRIGGER trigger_ai_feedback_updated_at
  BEFORE UPDATE ON ai_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_feedback_updated_at();
