-- ============================================
-- Sales Intelligence Schema
-- Follow-ups, stakeholders, competitive intel
-- ============================================

-- Follow-ups table for tracking temporal commitments
CREATE TABLE IF NOT EXISTS follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Links
  org_id UUID REFERENCES trial_organizations(org_id),
  user_id UUID REFERENCES trial_users(user_id),  -- Optional contact
  created_by UUID REFERENCES users(id),

  -- What
  title TEXT NOT NULL,
  description TEXT,
  follow_up_type TEXT DEFAULT 'general' CHECK (follow_up_type IN (
    'call', 'email', 'meeting', 'proposal', 'demo', 'general', 'check_in', 'task'
  )),

  -- When
  due_date DATE NOT NULL,
  due_time TIME,  -- Optional specific time
  reminder_at TIMESTAMPTZ,  -- When to remind

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'in_progress', 'completed', 'snoozed', 'cancelled'
  )),
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES users(id),
  snoozed_until DATE,
  snooze_count INTEGER DEFAULT 0,

  -- Priority
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),

  -- Context (what triggered this)
  source_command TEXT,  -- Original natural language input
  source_activity_id UUID,  -- Link to activity that created it
  source_email_id UUID REFERENCES parsed_emails(id),

  -- Notes
  notes TEXT,
  outcome TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Competitive mentions tracking
CREATE TABLE IF NOT EXISTS competitive_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Links
  org_id UUID NOT NULL REFERENCES trial_organizations(org_id),
  mentioned_by UUID REFERENCES users(id),

  -- Competitor details
  competitor_name TEXT NOT NULL,
  comparison_context TEXT,  -- pricing, features, support, integration, etc.
  our_position TEXT CHECK (our_position IN ('advantage', 'neutral', 'concern')),

  -- How mentioned
  source_type TEXT CHECK (source_type IN ('command', 'email', 'note', 'manual')),
  source_id UUID,  -- Reference to activity, email, etc.
  source_text TEXT,  -- Original text snippet

  mentioned_at TIMESTAMPTZ DEFAULT NOW()
);

-- Feature interests tracking (links to feature requests)
CREATE TABLE IF NOT EXISTS feature_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Links
  org_id UUID NOT NULL REFERENCES trial_organizations(org_id),
  feature_request_id UUID,  -- Link to master_roadmap_items if exists

  -- Feature details
  feature_name TEXT NOT NULL,
  context TEXT,  -- "asked about", "needs", "requires", "interested in"
  priority_for_org TEXT CHECK (priority_for_org IN ('nice_to_have', 'important', 'critical', 'blocker')),

  -- Source
  source_type TEXT CHECK (source_type IN ('command', 'email', 'note', 'manual')),
  source_id UUID,
  source_text TEXT,

  mentioned_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add stakeholder influence to trial_users
ALTER TABLE trial_users
  ADD COLUMN IF NOT EXISTS influence TEXT CHECK (influence IN (
    'champion', 'blocker', 'decision_maker', 'evaluator', 'influencer', 'unknown'
  )),
  ADD COLUMN IF NOT EXISTS influence_notes TEXT,
  ADD COLUMN IF NOT EXISTS influence_updated_at TIMESTAMPTZ;

-- Add deal momentum to trial_organizations
ALTER TABLE trial_organizations
  ADD COLUMN IF NOT EXISTS deal_momentum TEXT CHECK (deal_momentum IN (
    'positive', 'neutral', 'stalled', 'at_risk'
  )),
  ADD COLUMN IF NOT EXISTS deal_momentum_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deal_signals JSONB DEFAULT '{}';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_follow_ups_org ON follow_ups(org_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_user ON follow_ups(user_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_created_by ON follow_ups(created_by);
CREATE INDEX IF NOT EXISTS idx_follow_ups_status ON follow_ups(status);
CREATE INDEX IF NOT EXISTS idx_follow_ups_due_date ON follow_ups(due_date);
CREATE INDEX IF NOT EXISTS idx_follow_ups_overdue ON follow_ups(due_date, status) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_competitive_mentions_org ON competitive_mentions(org_id);
CREATE INDEX IF NOT EXISTS idx_competitive_mentions_competitor ON competitive_mentions(competitor_name);

CREATE INDEX IF NOT EXISTS idx_feature_interests_org ON feature_interests(org_id);
CREATE INDEX IF NOT EXISTS idx_feature_interests_feature ON feature_interests(feature_name);

-- RLS Policies
ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitive_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_interests ENABLE ROW LEVEL SECURITY;

-- Follow-ups: Users can see their own + team's
CREATE POLICY "Users can view follow-ups"
  ON follow_ups
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create follow-ups"
  ON follow_ups
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own follow-ups"
  ON follow_ups
  FOR UPDATE
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (users.role = 'Admin' OR users.is_super_admin = true)
    )
  );

-- Competitive mentions: All authenticated users
CREATE POLICY "Users can view competitive mentions"
  ON competitive_mentions
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create competitive mentions"
  ON competitive_mentions
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Feature interests: All authenticated users
CREATE POLICY "Users can view feature interests"
  ON feature_interests
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create feature interests"
  ON feature_interests
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Service role full access
CREATE POLICY "Service role full access follow_ups"
  ON follow_ups
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access competitive_mentions"
  ON competitive_mentions
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access feature_interests"
  ON feature_interests
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Update trigger for follow_ups
CREATE TRIGGER update_follow_ups_updated_at
  BEFORE UPDATE ON follow_ups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- View for upcoming follow-ups with org details
CREATE OR REPLACE VIEW upcoming_follow_ups AS
SELECT
  f.*,
  o.org_name,
  tu.name as contact_name
FROM follow_ups f
LEFT JOIN trial_organizations o ON f.org_id = o.org_id
LEFT JOIN trial_users tu ON f.user_id = tu.user_id
WHERE f.status = 'pending'
ORDER BY f.due_date ASC;

-- Function to get overdue follow-ups
CREATE OR REPLACE FUNCTION get_overdue_follow_ups(user_uuid UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  org_id UUID,
  org_name TEXT,
  title TEXT,
  due_date DATE,
  days_overdue INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.id,
    f.org_id,
    o.org_name,
    f.title,
    f.due_date,
    (CURRENT_DATE - f.due_date)::INTEGER as days_overdue
  FROM follow_ups f
  LEFT JOIN trial_organizations o ON f.org_id = o.org_id
  WHERE f.status = 'pending'
    AND f.due_date < CURRENT_DATE
    AND (user_uuid IS NULL OR f.created_by = user_uuid)
  ORDER BY f.due_date ASC;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE follow_ups IS 'Track follow-up commitments from sales interactions';
COMMENT ON TABLE competitive_mentions IS 'Track competitor mentions in sales conversations';
COMMENT ON TABLE feature_interests IS 'Track feature interests expressed by prospects';
COMMENT ON VIEW upcoming_follow_ups IS 'View of pending follow-ups with org details';
