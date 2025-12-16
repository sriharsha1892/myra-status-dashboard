-- Progressive Data Enrichment System
-- Tracks enrichment sessions and answers for data completeness

-- ============================================
-- ENRICHMENT SESSIONS TABLE
-- Tracks user enrichment activity per import
-- ============================================
CREATE TABLE IF NOT EXISTS enrichment_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_email TEXT NOT NULL,
  user_role TEXT NOT NULL,
  trigger TEXT NOT NULL CHECK (trigger IN ('post_import', 'manual', 'nudge')),

  entity_ids UUID[] NOT NULL DEFAULT '{}',
  questions_presented TEXT[] DEFAULT '{}',
  answers_given INTEGER DEFAULT 0,
  answers_skipped INTEGER DEFAULT 0,

  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  completeness_before DECIMAL(5,2),
  completeness_after DECIMAL(5,2),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ENRICHMENT ANSWERS TABLE
-- Audit trail of all enrichment answers
-- ============================================
CREATE TABLE IF NOT EXISTS enrichment_answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES enrichment_sessions(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('organization', 'user')),
  entity_id UUID NOT NULL,

  status TEXT NOT NULL CHECK (status IN ('answered', 'skipped', 'deferred')),
  value JSONB,
  previous_value JSONB,

  source TEXT CHECK (source IN ('manual', 'ai_suggested', 'bulk_apply')),
  ai_confidence DECIMAL(3,2),

  answered_by TEXT,
  answered_at TIMESTAMPTZ DEFAULT NOW(),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_enrichment_sessions_user_email ON enrichment_sessions(user_email);
CREATE INDEX IF NOT EXISTS idx_enrichment_sessions_trigger ON enrichment_sessions(trigger);
CREATE INDEX IF NOT EXISTS idx_enrichment_sessions_started_at ON enrichment_sessions(started_at DESC);

CREATE INDEX IF NOT EXISTS idx_enrichment_answers_session_id ON enrichment_answers(session_id);
CREATE INDEX IF NOT EXISTS idx_enrichment_answers_entity ON enrichment_answers(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_enrichment_answers_question_id ON enrichment_answers(question_id);

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE enrichment_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrichment_answers ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to manage their own sessions
CREATE POLICY "Users can view own sessions"
  ON enrichment_sessions FOR SELECT
  USING (auth.jwt() ->> 'email' = user_email);

CREATE POLICY "Users can insert own sessions"
  ON enrichment_sessions FOR INSERT
  WITH CHECK (auth.jwt() ->> 'email' = user_email);

CREATE POLICY "Users can update own sessions"
  ON enrichment_sessions FOR UPDATE
  USING (auth.jwt() ->> 'email' = user_email);

-- Allow authenticated users to manage answers in their sessions
CREATE POLICY "Users can view own answers"
  ON enrichment_answers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM enrichment_sessions s
      WHERE s.id = enrichment_answers.session_id
      AND s.user_email = auth.jwt() ->> 'email'
    )
  );

CREATE POLICY "Users can insert answers in own sessions"
  ON enrichment_answers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM enrichment_sessions s
      WHERE s.id = enrichment_answers.session_id
      AND s.user_email = auth.jwt() ->> 'email'
    )
  );

-- ============================================
-- TRIGGERS
-- ============================================
CREATE OR REPLACE FUNCTION update_enrichment_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enrichment_sessions_updated_at
  BEFORE UPDATE ON enrichment_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_enrichment_session_timestamp();
