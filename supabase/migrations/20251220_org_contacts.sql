-- Migration: Organization Contacts System
-- Links contacts to organizations with role-based + lifecycle tracking
-- Includes activity logging for CRM functionality

-- ============ ENUMS ============

-- Contact's role in the deal (what they do)
CREATE TYPE contact_role AS ENUM (
  'champion',           -- Internal advocate pushing for the deal
  'decision_maker',     -- Has budget authority
  'blocker',            -- Opposing or blocking the deal
  'evaluator',          -- Technical evaluator
  'influencer',         -- Influences decision without authority
  'user',               -- End user of the product
  'billing',            -- Procurement/billing contact
  'executive_sponsor'   -- C-level sponsor
);

-- Contact's lifecycle stage (where they are in the journey)
CREATE TYPE contact_lifecycle AS ENUM (
  'prospect',           -- Pre-engagement
  'demo_scheduled',     -- Demo meeting booked
  'demo_attended',      -- Attended demo
  'trial_invited',      -- Invited to trial
  'trial_active',       -- Actively using trial
  'trial_ended',        -- Trial period ended
  'customer',           -- Paying customer
  'churned',            -- Former customer
  'inactive'            -- No longer engaged
);

-- ============ ORG_CONTACTS TABLE ============

CREATE TABLE IF NOT EXISTS org_contacts (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ============ RELATIONSHIPS ============
  org_id UUID NOT NULL REFERENCES organizations_unified(id) ON DELETE CASCADE,
  platform_user_id UUID,  -- Links to trial_users.user_id when they have product access

  -- ============ IDENTITY ============
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  title TEXT,                         -- Job title
  department TEXT,
  linkedin_url TEXT,
  avatar_url TEXT,

  -- ============ ROLE & LIFECYCLE ============
  role contact_role NOT NULL DEFAULT 'user',
  lifecycle_stage contact_lifecycle NOT NULL DEFAULT 'prospect',

  -- ============ FLAGS ============
  is_primary BOOLEAN DEFAULT FALSE,              -- Primary contact for org
  is_billing BOOLEAN DEFAULT FALSE,              -- Billing/procurement contact
  is_advocate BOOLEAN DEFAULT FALSE,             -- Internal champion/advocate
  is_decision_influencer BOOLEAN DEFAULT FALSE,  -- Influences decisions

  -- ============ ENGAGEMENT TRACKING ============
  engagement_level TEXT CHECK (engagement_level IS NULL OR engagement_level IN (
    'high', 'medium', 'low', 'none', 'unknown'
  )) DEFAULT 'unknown',
  last_contacted_at TIMESTAMPTZ,
  last_responded_at TIMESTAMPTZ,
  preferred_contact_method TEXT CHECK (preferred_contact_method IS NULL OR preferred_contact_method IN (
    'email', 'phone', 'linkedin', 'slack', 'whatsapp'
  )),

  -- ============ NOTES ============
  notes TEXT,

  -- ============ METADATA ============
  source TEXT,                        -- Where this contact came from
  external_id TEXT,                   -- ID from external system (Freshsales, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,

  -- ============ CONSTRAINTS ============
  CONSTRAINT unique_email_per_org UNIQUE (org_id, email)
);

-- ============ INDEXES ============
CREATE INDEX IF NOT EXISTS idx_org_contacts_org ON org_contacts(org_id);
CREATE INDEX IF NOT EXISTS idx_org_contacts_platform_user ON org_contacts(platform_user_id);
CREATE INDEX IF NOT EXISTS idx_org_contacts_role ON org_contacts(role);
CREATE INDEX IF NOT EXISTS idx_org_contacts_lifecycle ON org_contacts(lifecycle_stage);
CREATE INDEX IF NOT EXISTS idx_org_contacts_email ON org_contacts(email);
CREATE INDEX IF NOT EXISTS idx_org_contacts_primary ON org_contacts(org_id) WHERE is_primary = TRUE;
CREATE INDEX IF NOT EXISTS idx_org_contacts_advocates ON org_contacts(org_id) WHERE is_advocate = TRUE;

-- ============ UPDATED_AT TRIGGER ============
CREATE OR REPLACE FUNCTION update_org_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS org_contacts_updated_at ON org_contacts;
CREATE TRIGGER org_contacts_updated_at
  BEFORE UPDATE ON org_contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_org_contacts_updated_at();


-- ============ CONTACT_ACTIVITIES TABLE ============

CREATE TABLE IF NOT EXISTS contact_activities (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ============ RELATIONSHIPS ============
  contact_id UUID REFERENCES org_contacts(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations_unified(id) ON DELETE CASCADE,

  -- ============ ACTIVITY DETAILS ============
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'email_sent',
    'email_received',
    'call_made',
    'call_received',
    'meeting_scheduled',
    'meeting_held',
    'meeting_cancelled',
    'demo_scheduled',
    'demo_held',
    'note_added',
    'linkedin_message',
    'whatsapp_message',
    'trial_invited',
    'trial_started',
    'contract_sent',
    'contract_signed',
    'stage_changed',
    'task_completed',
    'follow_up_set'
  )),

  subject TEXT,
  content TEXT,

  -- ============ RESPONSE TRACKING ============
  response_status TEXT CHECK (response_status IS NULL OR response_status IN (
    'pending', 'positive', 'negative', 'neutral', 'no_response'
  )),

  -- ============ SCHEDULING ============
  scheduled_at TIMESTAMPTZ,           -- For meetings/follow-ups
  completed_at TIMESTAMPTZ,

  -- ============ METADATA ============
  logged_by UUID,                     -- User who logged this activity
  activity_date TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB,                     -- Additional structured data
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ INDEXES ============
CREATE INDEX IF NOT EXISTS idx_contact_activities_contact ON contact_activities(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_activities_org ON contact_activities(org_id);
CREATE INDEX IF NOT EXISTS idx_contact_activities_type ON contact_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_contact_activities_date ON contact_activities(activity_date DESC);
CREATE INDEX IF NOT EXISTS idx_contact_activities_scheduled ON contact_activities(scheduled_at)
  WHERE scheduled_at IS NOT NULL AND completed_at IS NULL;


-- ============ RLS POLICIES ============

ALTER TABLE org_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_activities ENABLE ROW LEVEL SECURITY;

-- org_contacts policies
CREATE POLICY "org_contacts_select_authenticated" ON org_contacts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "org_contacts_insert_authenticated" ON org_contacts
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "org_contacts_update_authenticated" ON org_contacts
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "org_contacts_delete_authenticated" ON org_contacts
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "org_contacts_service_role" ON org_contacts
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- contact_activities policies
CREATE POLICY "contact_activities_select_authenticated" ON contact_activities
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "contact_activities_insert_authenticated" ON contact_activities
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "contact_activities_update_authenticated" ON contact_activities
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "contact_activities_delete_authenticated" ON contact_activities
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "contact_activities_service_role" ON contact_activities
  FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ============ HELPER VIEWS ============

-- View for org summary with contact counts and primary contact
CREATE OR REPLACE VIEW org_contact_summary AS
SELECT
  o.id AS org_id,
  o.name AS org_name,
  o.lifecycle_stage AS org_lifecycle,
  COUNT(c.id) AS total_contacts,
  COUNT(c.id) FILTER (WHERE c.is_primary) AS primary_count,
  COUNT(c.id) FILTER (WHERE c.is_advocate) AS advocate_count,
  COUNT(c.id) FILTER (WHERE c.role = 'champion') AS champion_count,
  COUNT(c.id) FILTER (WHERE c.role = 'decision_maker') AS decision_maker_count,
  COUNT(c.id) FILTER (WHERE c.role = 'blocker') AS blocker_count,
  (
    SELECT json_build_object(
      'id', pc.id,
      'name', pc.name,
      'email', pc.email,
      'role', pc.role,
      'title', pc.title
    )
    FROM org_contacts pc
    WHERE pc.org_id = o.id AND pc.is_primary = TRUE
    LIMIT 1
  ) AS primary_contact,
  MAX(ca.activity_date) AS last_activity_at
FROM organizations_unified o
LEFT JOIN org_contacts c ON c.org_id = o.id
LEFT JOIN contact_activities ca ON ca.org_id = o.id
GROUP BY o.id, o.name, o.lifecycle_stage;

