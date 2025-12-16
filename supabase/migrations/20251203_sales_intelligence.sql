-- Migration: Sales Intelligence Schema
-- Enables multi-action extraction, follow-ups, stakeholder mapping,
-- competitive intel, and feature interest tracking
--
-- Tables: follow_ups, competitive_mentions, feature_interests
-- Extensions: trial_users (influence), trial_organizations (deal_momentum)

-- ============================================
-- 1. Follow-ups Table
-- Tracks temporal commitments from natural language
-- ============================================

CREATE TABLE IF NOT EXISTS follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES trial_organizations(org_id) ON DELETE CASCADE,
  user_id UUID REFERENCES trial_users(user_id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- What
  title TEXT NOT NULL,
  description TEXT,
  follow_up_type TEXT DEFAULT 'general' CHECK (
    follow_up_type IN ('call', 'email', 'meeting', 'proposal', 'demo', 'general')
  ),

  -- When
  due_date DATE NOT NULL,
  due_time TIME,
  reminder_at TIMESTAMPTZ,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (
    status IN ('pending', 'completed', 'snoozed', 'cancelled')
  ),
  completed_at TIMESTAMPTZ,
  snoozed_until DATE,

  -- Context
  source_command TEXT,
  source_activity_id UUID,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for follow-ups
CREATE INDEX IF NOT EXISTS idx_follow_ups_org ON follow_ups(org_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_created_by ON follow_ups(created_by);
CREATE INDEX IF NOT EXISTS idx_follow_ups_due_date ON follow_ups(due_date);
CREATE INDEX IF NOT EXISTS idx_follow_ups_status ON follow_ups(status) WHERE status = 'pending';

-- RLS for follow-ups
ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view follow-ups they created"
  ON follow_ups FOR SELECT
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Users can create follow-ups"
  ON follow_ups FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their follow-ups"
  ON follow_ups FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their follow-ups"
  ON follow_ups FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- ============================================
-- 2. Stakeholder Influence (extend trial_users)
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trial_users' AND column_name = 'influence'
  ) THEN
    ALTER TABLE trial_users ADD COLUMN influence TEXT CHECK (
      influence IN ('champion', 'blocker', 'decision_maker', 'evaluator', 'influencer', 'unknown')
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trial_users' AND column_name = 'influence_signal'
  ) THEN
    ALTER TABLE trial_users ADD COLUMN influence_signal TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trial_users' AND column_name = 'influence_updated_at'
  ) THEN
    ALTER TABLE trial_users ADD COLUMN influence_updated_at TIMESTAMPTZ;
  END IF;
END $$;

-- ============================================
-- 3. Competitive Mentions Table
-- Tracks competitor references in conversations
-- ============================================

CREATE TABLE IF NOT EXISTS competitive_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES trial_organizations(org_id) ON DELETE CASCADE,

  -- Competitor info
  competitor_name TEXT NOT NULL,
  comparison_context TEXT,  -- pricing, features, support, etc.
  our_position TEXT CHECK (
    our_position IN ('advantage', 'neutral', 'concern')
  ),

  -- Source tracking
  mentioned_at TIMESTAMPTZ DEFAULT NOW(),
  source_activity_id UUID,
  mentioned_by UUID REFERENCES auth.users(id),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for competitive mentions
CREATE INDEX IF NOT EXISTS idx_competitive_mentions_org ON competitive_mentions(org_id);
CREATE INDEX IF NOT EXISTS idx_competitive_mentions_competitor ON competitive_mentions(competitor_name);
CREATE INDEX IF NOT EXISTS idx_competitive_mentions_date ON competitive_mentions(mentioned_at DESC);

-- RLS for competitive mentions
ALTER TABLE competitive_mentions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view competitive mentions"
  ON competitive_mentions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create competitive mentions"
  ON competitive_mentions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = mentioned_by);

-- ============================================
-- 4. Feature Interests Table
-- Tracks feature requests/interests per org
-- ============================================

CREATE TABLE IF NOT EXISTS feature_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES trial_organizations(org_id) ON DELETE CASCADE,

  -- Feature info
  feature_name TEXT NOT NULL,
  context TEXT,  -- "asked about", "needs", "requires", "would be nice"
  priority TEXT DEFAULT 'medium' CHECK (
    priority IN ('low', 'medium', 'high', 'critical')
  ),

  -- Optional link to formal feature request
  feature_request_id UUID REFERENCES feature_requests(id) ON DELETE SET NULL,

  -- Source tracking
  mentioned_at TIMESTAMPTZ DEFAULT NOW(),
  mentioned_by UUID REFERENCES auth.users(id),
  source_command TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for feature interests
CREATE INDEX IF NOT EXISTS idx_feature_interests_org ON feature_interests(org_id);
CREATE INDEX IF NOT EXISTS idx_feature_interests_feature ON feature_interests(feature_name);
CREATE INDEX IF NOT EXISTS idx_feature_interests_date ON feature_interests(mentioned_at DESC);

-- RLS for feature interests
ALTER TABLE feature_interests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view feature interests"
  ON feature_interests FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create feature interests"
  ON feature_interests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = mentioned_by);

-- ============================================
-- 5. Deal Signals (extend trial_organizations)
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trial_organizations' AND column_name = 'deal_momentum'
  ) THEN
    ALTER TABLE trial_organizations ADD COLUMN deal_momentum TEXT CHECK (
      deal_momentum IN ('positive', 'neutral', 'stalled', 'at_risk')
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trial_organizations' AND column_name = 'last_momentum_signal'
  ) THEN
    ALTER TABLE trial_organizations ADD COLUMN last_momentum_signal TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trial_organizations' AND column_name = 'momentum_updated_at'
  ) THEN
    ALTER TABLE trial_organizations ADD COLUMN momentum_updated_at TIMESTAMPTZ;
  END IF;
END $$;

-- ============================================
-- 6. Helper Functions
-- ============================================

-- Function to get upcoming follow-ups for a user
CREATE OR REPLACE FUNCTION get_upcoming_follow_ups(
  p_user_id UUID,
  p_days INTEGER DEFAULT 7
)
RETURNS TABLE (
  id UUID,
  org_id UUID,
  org_name TEXT,
  title TEXT,
  follow_up_type TEXT,
  due_date DATE,
  status TEXT,
  days_until INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.id,
    f.org_id,
    o.org_name,
    f.title,
    f.follow_up_type,
    f.due_date,
    f.status,
    (f.due_date - CURRENT_DATE)::INTEGER as days_until
  FROM follow_ups f
  JOIN trial_organizations o ON f.org_id = o.org_id
  WHERE f.created_by = p_user_id
    AND f.status = 'pending'
    AND f.due_date <= CURRENT_DATE + p_days
  ORDER BY f.due_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get overdue follow-ups
CREATE OR REPLACE FUNCTION get_overdue_follow_ups(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  org_id UUID,
  org_name TEXT,
  title TEXT,
  follow_up_type TEXT,
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
    f.follow_up_type,
    f.due_date,
    (CURRENT_DATE - f.due_date)::INTEGER as days_overdue
  FROM follow_ups f
  JOIN trial_organizations o ON f.org_id = o.org_id
  WHERE f.created_by = p_user_id
    AND f.status = 'pending'
    AND f.due_date < CURRENT_DATE
  ORDER BY f.due_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get competitor frequency
CREATE OR REPLACE FUNCTION get_competitor_frequency(p_days INTEGER DEFAULT 30)
RETURNS TABLE (
  competitor_name TEXT,
  mention_count BIGINT,
  orgs_mentioned BIGINT,
  common_context TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cm.competitor_name,
    COUNT(*) as mention_count,
    COUNT(DISTINCT cm.org_id) as orgs_mentioned,
    MODE() WITHIN GROUP (ORDER BY cm.comparison_context) as common_context
  FROM competitive_mentions cm
  WHERE cm.mentioned_at > NOW() - (p_days || ' days')::INTERVAL
  GROUP BY cm.competitor_name
  ORDER BY mention_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get feature interest frequency
CREATE OR REPLACE FUNCTION get_feature_interest_frequency(p_days INTEGER DEFAULT 30)
RETURNS TABLE (
  feature_name TEXT,
  mention_count BIGINT,
  orgs_interested BIGINT,
  avg_priority TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    fi.feature_name,
    COUNT(*) as mention_count,
    COUNT(DISTINCT fi.org_id) as orgs_interested,
    MODE() WITHIN GROUP (ORDER BY fi.priority) as avg_priority
  FROM feature_interests fi
  WHERE fi.mentioned_at > NOW() - (p_days || ' days')::INTERVAL
  GROUP BY fi.feature_name
  ORDER BY mention_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. Updated_at Triggers
-- ============================================

CREATE OR REPLACE FUNCTION update_follow_ups_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_follow_ups_timestamp ON follow_ups;
CREATE TRIGGER trigger_update_follow_ups_timestamp
  BEFORE UPDATE ON follow_ups
  FOR EACH ROW
  EXECUTE FUNCTION update_follow_ups_timestamp();
