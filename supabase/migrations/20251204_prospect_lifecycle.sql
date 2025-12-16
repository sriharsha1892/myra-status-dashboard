-- Migration: Prospect Lifecycle Support
-- Extends trial_organizations for full prospect-to-customer lifecycle
-- Creates prospects (contacts) and prospect_activities tables

-- ============================================================================
-- PART 1: Extend trial_organizations for prospect tracking
-- ============================================================================

-- Add columns for prospect stage tracking
ALTER TABLE trial_organizations ADD COLUMN IF NOT EXISTS
  is_prospect BOOLEAN DEFAULT false;

ALTER TABLE trial_organizations ADD COLUMN IF NOT EXISTS
  prospect_stage TEXT CHECK (prospect_stage IN (
    'cold_lead', 'contacted', 'responded', 'screening',
    'demo_scheduled', 'demo_done', 'disqualified'
  ));

ALTER TABLE trial_organizations ADD COLUMN IF NOT EXISTS
  prospect_source TEXT CHECK (prospect_source IN (
    'cold_outreach', 'inbound', 'referral', 'event', 'linkedin', 'other'
  ));

ALTER TABLE trial_organizations ADD COLUMN IF NOT EXISTS
  icp_fit_score INT CHECK (icp_fit_score >= 0 AND icp_fit_score <= 100);

-- Add columns for deal stage tracking (post-trial)
ALTER TABLE trial_organizations ADD COLUMN IF NOT EXISTS
  deal_stage TEXT CHECK (deal_stage IN (
    'evaluation', 'trial_expired', 'negotiation', 'closed'
  ));

ALTER TABLE trial_organizations ADD COLUMN IF NOT EXISTS
  deal_outcome TEXT CHECK (deal_outcome IN ('won', 'lost', 'deferred'));

ALTER TABLE trial_organizations ADD COLUMN IF NOT EXISTS
  deal_outcome_reason TEXT;

ALTER TABLE trial_organizations ADD COLUMN IF NOT EXISTS
  deal_deferred_until DATE;

-- Add index for filtering by prospect status
CREATE INDEX IF NOT EXISTS idx_trial_organizations_is_prospect
  ON trial_organizations(is_prospect);

CREATE INDEX IF NOT EXISTS idx_trial_organizations_prospect_stage
  ON trial_organizations(prospect_stage) WHERE is_prospect = true;

CREATE INDEX IF NOT EXISTS idx_trial_organizations_deal_stage
  ON trial_organizations(deal_stage);

CREATE INDEX IF NOT EXISTS idx_trial_organizations_deal_outcome
  ON trial_organizations(deal_outcome);

-- ============================================================================
-- PART 2: Create prospects table (people/contacts)
-- ============================================================================

CREATE TABLE IF NOT EXISTS prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES trial_organizations(org_id) ON DELETE CASCADE,

  -- Contact info
  name TEXT NOT NULL,
  email TEXT,
  title TEXT,
  phone TEXT,
  linkedin_url TEXT,

  -- Status tracking
  is_primary_contact BOOLEAN DEFAULT false,
  source TEXT CHECK (source IN ('cold_outreach', 'linkedin', 'referral', 'inbound', 'event', 'other')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'converted', 'unresponsive', 'opted_out')),

  -- Assignment
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Notes
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Link to trial_user when converted
  converted_user_id UUID REFERENCES trial_users(user_id) ON DELETE SET NULL
);

-- Indexes for prospects
CREATE INDEX IF NOT EXISTS idx_prospects_org_id ON prospects(org_id);
CREATE INDEX IF NOT EXISTS idx_prospects_status ON prospects(status);
CREATE INDEX IF NOT EXISTS idx_prospects_assigned_to ON prospects(assigned_to);
CREATE INDEX IF NOT EXISTS idx_prospects_email ON prospects(email);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_prospects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prospects_updated_at ON prospects;
CREATE TRIGGER prospects_updated_at
  BEFORE UPDATE ON prospects
  FOR EACH ROW
  EXECUTE FUNCTION update_prospects_updated_at();

-- ============================================================================
-- PART 3: Create prospect_activities table
-- ============================================================================

CREATE TABLE IF NOT EXISTS prospect_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID REFERENCES prospects(id) ON DELETE CASCADE,
  org_id UUID REFERENCES trial_organizations(org_id) ON DELETE CASCADE,

  -- Activity details
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'email_sent', 'email_received', 'call', 'linkedin',
    'meeting', 'note', 'screening', 'demo'
  )),
  direction TEXT CHECK (direction IN ('outbound', 'inbound')),

  -- Content
  subject TEXT,
  content TEXT,

  -- Response tracking
  response_status TEXT CHECK (response_status IN (
    'no_response', 'positive', 'negative', 'neutral', 'pending'
  )),

  -- Metadata
  logged_by UUID REFERENCES users(id) ON DELETE SET NULL,
  activity_date TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),

  -- At least one of prospect_id or org_id must be set
  CONSTRAINT prospect_or_org_required CHECK (
    prospect_id IS NOT NULL OR org_id IS NOT NULL
  )
);

-- Indexes for prospect_activities
CREATE INDEX IF NOT EXISTS idx_prospect_activities_prospect_id ON prospect_activities(prospect_id);
CREATE INDEX IF NOT EXISTS idx_prospect_activities_org_id ON prospect_activities(org_id);
CREATE INDEX IF NOT EXISTS idx_prospect_activities_activity_type ON prospect_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_prospect_activities_activity_date ON prospect_activities(activity_date DESC);
CREATE INDEX IF NOT EXISTS idx_prospect_activities_logged_by ON prospect_activities(logged_by);

-- ============================================================================
-- PART 4: Row Level Security
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospect_activities ENABLE ROW LEVEL SECURITY;

-- Prospects: All authenticated users can read, only assigned users or admins can modify
CREATE POLICY "prospects_select_all" ON prospects
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "prospects_insert_authenticated" ON prospects
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "prospects_update_authenticated" ON prospects
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "prospects_delete_authenticated" ON prospects
  FOR DELETE TO authenticated USING (true);

-- Prospect activities: All authenticated users can read and write
CREATE POLICY "prospect_activities_select_all" ON prospect_activities
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "prospect_activities_insert_authenticated" ON prospect_activities
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "prospect_activities_update_authenticated" ON prospect_activities
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "prospect_activities_delete_authenticated" ON prospect_activities
  FOR DELETE TO authenticated USING (true);

-- ============================================================================
-- PART 5: Helpful views
-- ============================================================================

-- View for prospect organizations with their primary contact
CREATE OR REPLACE VIEW prospect_organizations_with_contact AS
SELECT
  t.*,
  p.id as primary_contact_id,
  p.name as primary_contact_name,
  p.email as primary_contact_email,
  p.title as primary_contact_title
FROM trial_organizations t
LEFT JOIN prospects p ON p.org_id = t.org_id AND p.is_primary_contact = true
WHERE t.is_prospect = true;

-- View for all organizations in deal pipeline (post-trial)
CREATE OR REPLACE VIEW deal_pipeline AS
SELECT
  t.*,
  COALESCE(t.deal_stage, 'evaluation') as current_deal_stage
FROM trial_organizations t
WHERE t.is_prospect = false
  AND t.trial_status IS NOT NULL
  AND t.deal_outcome IS NULL;

-- ============================================================================
-- PART 6: Comments for documentation
-- ============================================================================

COMMENT ON COLUMN trial_organizations.is_prospect IS 'True for pre-trial prospects from cold outreach, false for active/past trials';
COMMENT ON COLUMN trial_organizations.prospect_stage IS 'Pipeline stage for prospects: cold_lead → contacted → responded → screening → demo_scheduled → demo_done';
COMMENT ON COLUMN trial_organizations.prospect_source IS 'How the prospect was sourced: cold_outreach, inbound, referral, event, linkedin';
COMMENT ON COLUMN trial_organizations.icp_fit_score IS 'Ideal Customer Profile fit score 0-100';
COMMENT ON COLUMN trial_organizations.deal_stage IS 'Post-trial deal stage: evaluation → trial_expired → negotiation → closed';
COMMENT ON COLUMN trial_organizations.deal_outcome IS 'Final deal outcome: won, lost, or deferred';
COMMENT ON COLUMN trial_organizations.deal_outcome_reason IS 'Reason for the deal outcome';
COMMENT ON COLUMN trial_organizations.deal_deferred_until IS 'If deferred, when to follow up';

COMMENT ON TABLE prospects IS 'People/contacts at prospect organizations';
COMMENT ON TABLE prospect_activities IS 'Outreach activities and responses for prospects';
