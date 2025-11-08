-- Trial Organization Automation System
-- Terminology mappings, import templates, and review queue

-- =====================================================
-- TERMINOLOGY MAPPINGS TABLE
-- Store internal jargon and custom phrase mappings
-- =====================================================
CREATE TABLE IF NOT EXISTS terminology_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phrase TEXT NOT NULL,
  phrase_normalized TEXT NOT NULL, -- lowercase, trimmed for matching
  mapping_type TEXT NOT NULL CHECK (mapping_type IN (
    'lifecycle_stage',
    'activity_type',
    'deal_status',
    'feature_usage',
    'model_usage',
    'custom'
  )),
  target_value TEXT NOT NULL, -- What this phrase maps to
  metadata JSONB DEFAULT '{}', -- Additional context (e.g., {evaluation_type: "technical"})
  confidence_boost INTEGER DEFAULT 0 CHECK (confidence_boost BETWEEN 0 AND 50), -- Boost confidence scoring
  is_core_term BOOLEAN DEFAULT false, -- Admin-defined core term vs learned variation
  learn_variations BOOLEAN DEFAULT true, -- Auto-learn variations of this term
  usage_count INTEGER DEFAULT 0, -- Track how often this mapping is used
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast phrase lookup
CREATE INDEX idx_terminology_phrase_normalized ON terminology_mappings(phrase_normalized);
CREATE INDEX idx_terminology_mapping_type ON terminology_mappings(mapping_type);
CREATE INDEX idx_terminology_core_terms ON terminology_mappings(is_core_term) WHERE is_core_term = true;

-- =====================================================
-- IMPORT TEMPLATES TABLE
-- Save column mapping configurations per user/AM
-- =====================================================
CREATE TABLE IF NOT EXISTS import_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name TEXT NOT NULL, -- e.g., "Satish's Format", "Maria's Weekly Report"
  created_by UUID REFERENCES users(id),
  is_shared BOOLEAN DEFAULT false, -- Can other users see/use this template

  -- Column mappings stored as JSON
  -- Format: {"source_column": "target_field", ...}
  -- Example: {"Company Name": "org_name", "Email": "email", "Contact": "full_name"}
  column_mappings JSONB NOT NULL DEFAULT '{}',

  -- Settings for this template
  settings JSONB DEFAULT '{}', -- e.g., {skip_duplicates: true, auto_create_users: true}

  -- Auto-detection rules
  auto_detect_patterns JSONB DEFAULT '[]', -- File name patterns that trigger this template
  -- Example: ["AM_Report_*.xlsx", "Satish_Weekly_*.csv"]

  usage_count INTEGER DEFAULT 0, -- Track how often this template is used
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for template lookup
CREATE INDEX idx_import_templates_created_by ON import_templates(created_by);
CREATE INDEX idx_import_templates_shared ON import_templates(is_shared) WHERE is_shared = true;

-- =====================================================
-- REVIEW QUEUE TABLE
-- Store items flagged for admin review (70-90% confidence)
-- =====================================================
CREATE TABLE IF NOT EXISTS review_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What type of item needs review
  review_type TEXT NOT NULL CHECK (review_type IN (
    'org_duplicate', -- Potential duplicate org detected
    'user_duplicate', -- Potential duplicate user detected
    'activity_classification', -- Uncertain activity type
    'terminology_learning', -- New phrase detected, suggest mapping
    'date_parsing', -- Ambiguous date format
    'data_validation' -- General validation issue
  )),

  -- Priority for review (determines immediate vs queued)
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('critical', 'high', 'normal', 'low')),

  -- The data that needs review
  source_data JSONB NOT NULL, -- Original data that triggered review
  suggestions JSONB DEFAULT '[]', -- Suggested resolutions with confidence scores
  -- Example: [
  --   {action: "merge", target_org_id: "...", confidence: 85, reason: "90% name match"},
  --   {action: "create_new", confidence: 15, reason: "Different domain"}
  -- ]

  -- Context about where this came from
  source_type TEXT, -- 'import', 'text_parser', 'quick_logger', 'batch_creator'
  source_id UUID, -- Reference to import batch, parsing session, etc.

  -- Review status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  resolution JSONB, -- What action was taken

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for review queue
CREATE INDEX idx_review_queue_status ON review_queue(status) WHERE status = 'pending';
CREATE INDEX idx_review_queue_priority ON review_queue(priority, created_at) WHERE status = 'pending';
CREATE INDEX idx_review_queue_type ON review_queue(review_type, status);

-- =====================================================
-- PARSING SESSIONS TABLE
-- Track text parsing operations for audit trail
-- =====================================================
CREATE TABLE IF NOT EXISTS parsing_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parsed_by UUID REFERENCES users(id),

  -- Input data
  source_text TEXT, -- Original text that was parsed
  source_type TEXT, -- 'email', 'meeting_notes', 'call_summary', 'manual_entry'

  -- Parsing results
  extracted_data JSONB NOT NULL DEFAULT '{}',
  -- Example: {
  --   orgs: [{name: "Acme Corp", confidence: 95}],
  --   users: [{email: "john@acme.com", name: "John Doe", confidence: 90}],
  --   activities: [{type: "demo_completed", confidence: 85}]
  -- }

  confidence_scores JSONB DEFAULT '{}', -- Overall confidence per entity type

  -- What was actually saved
  created_org_ids UUID[],
  created_user_ids UUID[],
  created_activity_ids UUID[],

  -- Review flags
  flagged_for_review BOOLEAN DEFAULT false,
  review_queue_ids UUID[], -- References to review_queue entries created

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for parsing sessions
CREATE INDEX idx_parsing_sessions_parsed_by ON parsing_sessions(parsed_by);
CREATE INDEX idx_parsing_sessions_flagged ON parsing_sessions(flagged_for_review) WHERE flagged_for_review = true;

-- =====================================================
-- LEARNING DECISIONS TABLE
-- Track admin decisions to improve future parsing
-- =====================================================
CREATE TABLE IF NOT EXISTS learning_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_type TEXT NOT NULL CHECK (decision_type IN (
    'merge_orgs', -- Admin confirmed two orgs are same
    'separate_orgs', -- Admin confirmed two orgs are different
    'terminology_mapping', -- Admin confirmed phrase mapping
    'column_mapping', -- Admin confirmed CSV column mapping
    'activity_classification' -- Admin confirmed activity type
  )),

  -- What was the choice
  choice_data JSONB NOT NULL,
  -- Example for merge_orgs: {org1_name: "Acme Corp", org2_name: "Acme Corporation", decision: "same"}
  -- Example for terminology: {phrase: "POC kicked off", mapping: "trial_started", approved: true}

  -- Context
  review_queue_id UUID REFERENCES review_queue(id),
  parsing_session_id UUID REFERENCES parsing_sessions(id),

  decided_by UUID REFERENCES users(id),
  decided_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for learning
CREATE INDEX idx_learning_decisions_type ON learning_decisions(decision_type);
CREATE INDEX idx_learning_decisions_decided_by ON learning_decisions(decided_by);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE terminology_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE parsing_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_decisions ENABLE ROW LEVEL SECURITY;

-- Terminology mappings: All authenticated users can read, admins can write
CREATE POLICY "All users can view terminology mappings"
  ON terminology_mappings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage terminology mappings"
  ON terminology_mappings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'Admin'
    )
  );

-- Import templates: Users can manage their own, view shared ones
CREATE POLICY "Users can view their own and shared templates"
  ON import_templates FOR SELECT
  TO authenticated
  USING (created_by = auth.uid() OR is_shared = true);

CREATE POLICY "Users can manage their own templates"
  ON import_templates FOR ALL
  TO authenticated
  USING (created_by = auth.uid());

-- Review queue: Admins and creators can view/manage
CREATE POLICY "Users can view review queue items"
  ON review_queue FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage review queue"
  ON review_queue FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'Admin'
    )
  );

-- Parsing sessions: Users can view their own
CREATE POLICY "Users can view their own parsing sessions"
  ON parsing_sessions FOR SELECT
  TO authenticated
  USING (parsed_by = auth.uid());

CREATE POLICY "Users can create parsing sessions"
  ON parsing_sessions FOR INSERT
  TO authenticated
  WITH CHECK (parsed_by = auth.uid());

-- Learning decisions: All can view, admins can manage
CREATE POLICY "All users can view learning decisions"
  ON learning_decisions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can create learning decisions"
  ON learning_decisions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'Admin'
    )
  );

-- =====================================================
-- SEED DATA: Pre-configured Terminology Mappings
-- =====================================================

-- Get admin user ID for created_by (using a subquery that will work in migration)
-- We'll use NULL for now and update via API when first admin logs in

-- Trial Lifecycle Terms
INSERT INTO terminology_mappings (phrase, phrase_normalized, mapping_type, target_value, metadata, is_core_term, confidence_boost) VALUES
  ('POC kicked off', 'poc kicked off', 'activity_type', 'trial_started', '{}', true, 30),
  ('POC', 'poc', 'activity_type', 'trial_started', '{}', true, 25),
  ('extended runway', 'extended runway', 'activity_type', 'trial_extended', '{}', true, 30),
  ('extended trial', 'extended trial', 'activity_type', 'trial_extended', '{}', true, 30),
  ('rolled out creds', 'rolled out creds', 'activity_type', 'trial_access_provided', '{}', true, 30),
  ('rolled out credentials', 'rolled out credentials', 'activity_type', 'trial_access_provided', '{}', true, 30),
  ('trial access', 'trial access', 'activity_type', 'trial_access_provided', '{}', true, 20);

-- Deal Status Terms
INSERT INTO terminology_mappings (phrase, phrase_normalized, mapping_type, target_value, metadata, is_core_term, confidence_boost) VALUES
  ('pushed to Q2', 'pushed to q2', 'deal_status', 'future_prospect', '{"reason": "Pushed to Q2"}', true, 30),
  ('pushed to Q3', 'pushed to q3', 'deal_status', 'future_prospect', '{"reason": "Pushed to Q3"}', true, 30),
  ('pushed to Q4', 'pushed to q4', 'deal_status', 'future_prospect', '{"reason": "Pushed to Q4"}', true, 30),
  ('parking lot', 'parking lot', 'deal_status', 'on_hold', '{"reason": "Parking lot"}', true, 30),
  ('fast-track', 'fast-track', 'deal_status', 'high_priority', '{"priority": "high"}', true, 30),
  ('fast track', 'fast track', 'deal_status', 'high_priority', '{"priority": "high"}', true, 30);

-- Activity Shortcuts
INSERT INTO terminology_mappings (phrase, phrase_normalized, mapping_type, target_value, metadata, is_core_term, confidence_boost) VALUES
  ('demo done', 'demo done', 'activity_type', 'demo_completed', '{}', true, 30),
  ('demo completed', 'demo completed', 'activity_type', 'demo_completed', '{}', true, 30),
  ('tech eval', 'tech eval', 'activity_type', 'demo_completed', '{"evaluation_type": "technical"}', true, 30),
  ('technical evaluation', 'technical evaluation', 'activity_type', 'demo_completed', '{"evaluation_type": "technical"}', true, 30);

-- Ask-myra.ai Product Features
INSERT INTO terminology_mappings (phrase, phrase_normalized, mapping_type, target_value, metadata, is_core_term, confidence_boost) VALUES
  ('presentation builder', 'presentation builder', 'feature_usage', 'presentation_builder', '{"feature": "presentation_builder"}', true, 35),
  ('PPT output', 'ppt output', 'feature_usage', 'presentation_builder', '{"feature": "presentation_builder"}', true, 30),
  ('web scout', 'web scout', 'feature_usage', 'web_scout', '{"feature": "web_scout"}', true, 35),
  ('internet search', 'internet search', 'feature_usage', 'web_scout', '{"feature": "web_scout"}', true, 25),
  ('research architect', 'research architect', 'feature_usage', 'research_architect', '{"feature": "research_architect"}', true, 35),
  ('methodology', 'methodology', 'feature_usage', 'research_architect', '{"feature": "research_architect"}', true, 20);

-- AI Model References
INSERT INTO terminology_mappings (phrase, phrase_normalized, mapping_type, target_value, metadata, is_core_term, confidence_boost) VALUES
  ('Sonnet 4.5', 'sonnet 4.5', 'model_usage', 'claude_sonnet_4_5', '{"model": "claude-sonnet-4.5"}', true, 35),
  ('GPT 5', 'gpt 5', 'model_usage', 'gpt_5', '{"model": "gpt-5"}', true, 35),
  ('GPT 5 mini', 'gpt 5 mini', 'model_usage', 'gpt_5_mini', '{"model": "gpt-5-mini"}', true, 35),
  ('GPT-5', 'gpt-5', 'model_usage', 'gpt_5', '{"model": "gpt-5"}', true, 35);

-- Additional Common Terms
INSERT INTO terminology_mappings (phrase, phrase_normalized, mapping_type, target_value, metadata, is_core_term, confidence_boost) VALUES
  ('went dark', 'went dark', 'activity_type', 'no_response', '{"engagement": "low"}', true, 30),
  ('hot lead', 'hot lead', 'lifecycle_stage', 'trial_pending', '{"priority": "high"}', true, 30),
  ('champion identified', 'champion identified', 'custom', 'set_champion', '{"is_champion": true}', true, 30),
  ('circling back', 'circling back', 'activity_type', 'follow_up_scheduled', '{}', true, 25);

-- =====================================================
-- FUNCTIONS FOR AUTOMATION
-- =====================================================

-- Function to auto-update terminology usage count
CREATE OR REPLACE FUNCTION increment_terminology_usage(term_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE terminology_mappings
  SET usage_count = usage_count + 1,
      updated_at = NOW()
  WHERE id = term_id;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-update import template last used
CREATE OR REPLACE FUNCTION update_template_last_used(template_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE import_templates
  SET usage_count = usage_count + 1,
      last_used_at = NOW(),
      updated_at = NOW()
  WHERE id = template_id;
END;
$$ LANGUAGE plpgsql;

-- Function to find terminology mapping by phrase
CREATE OR REPLACE FUNCTION find_terminology_mapping(search_phrase TEXT)
RETURNS TABLE (
  id UUID,
  phrase TEXT,
  mapping_type TEXT,
  target_value TEXT,
  metadata JSONB,
  confidence_boost INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    tm.id,
    tm.phrase,
    tm.mapping_type,
    tm.target_value,
    tm.metadata,
    tm.confidence_boost
  FROM terminology_mappings tm
  WHERE tm.phrase_normalized = LOWER(TRIM(search_phrase))
  ORDER BY tm.is_core_term DESC, tm.usage_count DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE terminology_mappings IS 'Maps internal jargon and custom phrases to standardized values';
COMMENT ON TABLE import_templates IS 'Saved column mapping templates for CSV/Excel imports';
COMMENT ON TABLE review_queue IS 'Items flagged for admin review with confidence 70-90%';
COMMENT ON TABLE parsing_sessions IS 'Audit trail for text parsing operations';
COMMENT ON TABLE learning_decisions IS 'Admin decisions to improve future parsing accuracy';
