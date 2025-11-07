-- ============================================================================
-- CRITICAL FIX: Create Missing Tables for Activity Log and Deals
-- Run this in Supabase SQL Editor immediately
-- ============================================================================

-- Create deal tracking table
CREATE TABLE IF NOT EXISTS org_deal_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL UNIQUE REFERENCES trial_organizations(org_id) ON DELETE CASCADE,
  deal_status TEXT NOT NULL DEFAULT 'prospect' CHECK (deal_status IN ('prospect', 'negotiating', 'won', 'lost', 'future_prospect')),
  deal_value DECIMAL(12, 2),
  deal_currency VARCHAR(10) DEFAULT 'USD',
  loss_reason TEXT,
  future_prospect_reason TEXT,
  notes TEXT,
  status_updated_by UUID,
  status_updated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create engagement log table
CREATE TABLE IF NOT EXISTS trial_engagement_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES trial_organizations(org_id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'trial_access_requested',
    'trial_access_provided',
    'user_logged_in',
    'usage_observed',
    'feedback_received',
    'learning_captured',
    'follow_up_note',
    'trial_extended'
  )),
  description TEXT NOT NULL,
  observations TEXT,
  logged_by TEXT NOT NULL,
  logged_by_role TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE org_deal_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE trial_engagement_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allow all for now)
DROP POLICY IF EXISTS "Allow all on org_deal_tracking" ON org_deal_tracking;
CREATE POLICY "Allow all on org_deal_tracking"
  ON org_deal_tracking
  FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on trial_engagement_log" ON trial_engagement_log;
CREATE POLICY "Allow all on trial_engagement_log"
  ON trial_engagement_log
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_org_deal_tracking_org_id ON org_deal_tracking(org_id);
CREATE INDEX IF NOT EXISTS idx_org_deal_tracking_deal_status ON org_deal_tracking(deal_status);
CREATE INDEX IF NOT EXISTS idx_engagement_log_org ON trial_engagement_log(org_id);
CREATE INDEX IF NOT EXISTS idx_engagement_log_created ON trial_engagement_log(created_at DESC);

-- Create deal tracking records for existing orgs
INSERT INTO org_deal_tracking (org_id, deal_status)
SELECT org_id, 'prospect'
FROM trial_organizations
WHERE org_id NOT IN (SELECT org_id FROM org_deal_tracking)
ON CONFLICT (org_id) DO NOTHING;

-- ============================================================================
-- FEEDBACK SUBMISSIONS TABLE (for feedback widget)
-- ============================================================================
CREATE TABLE IF NOT EXISTS feedback_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('feedback', 'support', 'bug', 'feature_request')),
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE feedback_submissions ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
DROP POLICY IF EXISTS "Allow all on feedback_submissions" ON feedback_submissions;
CREATE POLICY "Allow all on feedback_submissions"
  ON feedback_submissions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_feedback_submissions_user_id ON feedback_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_submissions_status ON feedback_submissions(status);
CREATE INDEX IF NOT EXISTS idx_feedback_submissions_created ON feedback_submissions(created_at DESC);
