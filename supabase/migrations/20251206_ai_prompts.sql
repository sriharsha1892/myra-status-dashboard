-- ============================================
-- AI Prompt Templates Schema
-- Customizable AI prompts with org-specific overrides
-- ============================================

-- Prompt Templates Table (global defaults)
CREATE TABLE IF NOT EXISTS ai_prompt_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Template identification
  template_key TEXT UNIQUE NOT NULL, -- e.g., 'extraction.timeline_events', 'analysis.sentiment'
  template_name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN (
    'extraction',    -- Data extraction from text
    'analysis',      -- Analysis and classification
    'generation',    -- Content generation
    'summarization'  -- Summarization tasks
  )),

  -- Prompt content (sections that can be customized)
  system_prompt TEXT NOT NULL,
  user_prompt_template TEXT, -- Template with {{variables}}

  -- Configuration
  model TEXT DEFAULT 'llama-3.3-70b-versatile',
  temperature NUMERIC(3,2) DEFAULT 0.2,
  max_tokens INTEGER DEFAULT 4000,

  -- Variables that can be used in prompts
  available_variables JSONB DEFAULT '[]'::jsonb, -- e.g., ['org_name', 'text', 'context']

  -- Versioning
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,

  -- Audit
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organization-specific prompt overrides
CREATE TABLE IF NOT EXISTS ai_prompt_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys
  template_id UUID NOT NULL REFERENCES ai_prompt_templates(id) ON DELETE CASCADE,
  org_id TEXT NOT NULL, -- Organization this override applies to

  -- Override content (only overridden fields need to be set)
  system_prompt_override TEXT,
  user_prompt_template_override TEXT,

  -- Configuration overrides
  model_override TEXT,
  temperature_override NUMERIC(3,2),
  max_tokens_override INTEGER,

  -- Additional context/instructions specific to this org
  additional_instructions TEXT,
  custom_examples JSONB DEFAULT '[]'::jsonb,

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Audit
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint
  UNIQUE(template_id, org_id)
);

-- Prompt execution history (for analytics and tuning)
CREATE TABLE IF NOT EXISTS ai_prompt_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Reference
  template_id UUID REFERENCES ai_prompt_templates(id),
  override_id UUID REFERENCES ai_prompt_overrides(id),
  org_id TEXT,

  -- Execution details
  model_used TEXT NOT NULL,
  input_tokens INTEGER,
  output_tokens INTEGER,
  duration_ms INTEGER,

  -- Quality metrics
  success BOOLEAN NOT NULL,
  confidence_score NUMERIC(3,2),
  error_message TEXT,

  -- Feedback (for tuning)
  user_feedback TEXT CHECK (user_feedback IN ('positive', 'negative', 'neutral')),
  feedback_notes TEXT,

  -- Timestamps
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_prompt_templates_key ON ai_prompt_templates(template_key);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_category ON ai_prompt_templates(category);
CREATE INDEX IF NOT EXISTS idx_prompt_overrides_org ON ai_prompt_overrides(org_id);
CREATE INDEX IF NOT EXISTS idx_prompt_overrides_template ON ai_prompt_overrides(template_id);
CREATE INDEX IF NOT EXISTS idx_prompt_executions_template ON ai_prompt_executions(template_id);
CREATE INDEX IF NOT EXISTS idx_prompt_executions_org ON ai_prompt_executions(org_id);
CREATE INDEX IF NOT EXISTS idx_prompt_executions_date ON ai_prompt_executions(executed_at);

-- RLS Policies
ALTER TABLE ai_prompt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_prompt_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_prompt_executions ENABLE ROW LEVEL SECURITY;

-- Admins can manage templates
CREATE POLICY "Admins can manage prompt templates"
  ON ai_prompt_templates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (users.role = 'Admin' OR users.is_super_admin = true)
    )
  );

-- All authenticated users can view active templates
CREATE POLICY "Authenticated users can view active templates"
  ON ai_prompt_templates
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_active = true);

-- Admins can manage overrides
CREATE POLICY "Admins can manage prompt overrides"
  ON ai_prompt_overrides
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (users.role = 'Admin' OR users.is_super_admin = true)
    )
  );

-- Admins can view executions
CREATE POLICY "Admins can view prompt executions"
  ON ai_prompt_executions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (users.role = 'Admin' OR users.is_super_admin = true)
    )
  );

-- Service role can insert executions
CREATE POLICY "Service can insert executions"
  ON ai_prompt_executions
  FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Update trigger
CREATE TRIGGER update_ai_prompt_templates_updated_at
  BEFORE UPDATE ON ai_prompt_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_prompt_overrides_updated_at
  BEFORE UPDATE ON ai_prompt_overrides
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Seed default prompt templates
-- ============================================

INSERT INTO ai_prompt_templates (template_key, template_name, description, category, system_prompt, user_prompt_template, available_variables)
VALUES
  -- Timeline Events Extraction
  (
    'extraction.timeline_events',
    'Timeline Events Extraction',
    'Extracts timeline events from meeting notes, emails, and other text',
    'extraction',
    E'You are an expert at extracting timeline events from unstructured text.\n\nYour task is to identify and extract meaningful events that occurred during a customer interaction.\n\nFor each event, identify:\n- event_type: The type of event (meeting, call, email, demo, support_request, feature_request, escalation, renewal_discussion, other)\n- description: A clear, concise description of what happened\n- participants: People involved (if mentioned)\n- outcome: The result or next steps (if any)\n- sentiment: Overall sentiment (positive, neutral, negative)\n- confidence: Your confidence in this extraction (0-1)\n\nImportant rules:\n1. Only extract actual events that happened, not hypothetical ones\n2. If dates are mentioned, include them in the description\n3. If no valid events are found, return an empty array\n4. Always provide a confidence score',
    E'Extract timeline events from the following text:\n\n{{text}}\n\nOrganization: {{org_name}}\n\nReturn as JSON: { "events": [...], "metadata": { "count": number, "overall_confidence": number } }',
    '["text", "org_name", "context"]'
  ),

  -- User Extraction
  (
    'extraction.users',
    'User Contact Extraction',
    'Extracts user/contact information from text',
    'extraction',
    E'You are an expert at extracting contact information from unstructured text.\n\nYour task is to identify and extract user/contact details.\n\nFor each user, extract:\n- name: Full name\n- email: Email address (if present)\n- job_title: Job title or role\n- phone: Phone number (if present)\n- role: Their role in the organization (Champion, Evaluator, Decision Maker, End User)\n- notes: Any relevant notes about this person\n- confidence: Your confidence in this extraction (0-1)\n\nImportant rules:\n1. Only extract real people, not generic roles\n2. If email domain differs from org domain, flag it\n3. Infer role from context if not explicitly stated\n4. Return empty array if no valid users found',
    E'Extract user contacts from the following text:\n\n{{text}}\n\nOrganization: {{org_name}}\nDomain: {{org_domain}}\n\nReturn as JSON: { "users": [...], "metadata": { "count": number, "confidence": number } }',
    '["text", "org_name", "org_domain", "context"]'
  ),

  -- Sentiment Analysis
  (
    'analysis.sentiment',
    'Customer Sentiment Analysis',
    'Analyzes customer sentiment from interactions',
    'analysis',
    E'You are an expert at analyzing customer sentiment from business communications.\n\nAnalyze the provided text and determine:\n- overall_sentiment: positive, neutral, or negative\n- sentiment_score: -1 to 1 (negative to positive)\n- key_indicators: What phrases/elements indicate this sentiment\n- concerns: Any concerns or issues mentioned\n- positives: Any positive feedback or praise\n- urgency: low, medium, high\n- recommended_action: What should the account manager do next\n\nBe objective and base your analysis on explicit statements, not assumptions.',
    E'Analyze the sentiment of this customer interaction:\n\n{{text}}\n\nOrganization: {{org_name}}\nAccount Manager: {{account_manager}}\n\nReturn as JSON with the analysis fields.',
    '["text", "org_name", "account_manager", "context"]'
  ),

  -- Meeting Summary
  (
    'summarization.meeting',
    'Meeting Summary',
    'Summarizes meeting notes into key points',
    'summarization',
    E'You are an expert at summarizing business meetings.\n\nCreate a concise summary that includes:\n- title: A brief title for this meeting\n- attendees: Who was present\n- key_discussion_points: Main topics discussed (bullet points)\n- decisions_made: Any decisions that were made\n- action_items: Tasks assigned with owners if mentioned\n- next_steps: Agreed upon next steps\n- open_questions: Unresolved questions or concerns\n\nKeep the summary professional and focused on actionable information.',
    E'Summarize this meeting:\n\n{{text}}\n\nOrganization: {{org_name}}\n\nReturn as JSON with the summary fields.',
    '["text", "org_name", "meeting_date", "context"]'
  ),

  -- Email Classification
  (
    'analysis.email_classification',
    'Email Classification',
    'Classifies incoming emails by type and priority',
    'analysis',
    E'You are an expert at classifying customer emails.\n\nClassify the email into:\n- category: support_request, feature_request, bug_report, billing, general_inquiry, feedback, escalation, renewal, other\n- priority: low, medium, high, urgent\n- sentiment: positive, neutral, negative\n- requires_response: boolean\n- suggested_assignee: support, sales, account_manager, engineering\n- key_topics: Array of main topics\n- summary: One-line summary\n\nBe accurate and consider the urgency based on language used.',
    E'Classify this email:\n\nFrom: {{sender}}\nSubject: {{subject}}\nBody:\n{{text}}\n\nOrganization: {{org_name}}\n\nReturn as JSON with classification fields.',
    '["text", "sender", "subject", "org_name", "context"]'
  )
ON CONFLICT (template_key) DO NOTHING;

COMMENT ON TABLE ai_prompt_templates IS 'Global AI prompt templates that can be customized';
COMMENT ON TABLE ai_prompt_overrides IS 'Organization-specific overrides for AI prompts';
COMMENT ON TABLE ai_prompt_executions IS 'Execution history for AI prompts (for analytics)';
