-- ============================================
-- TIMELINE SYSTEM - Complete Schema
-- Created: 2025-11-10
-- Purpose: Unified timeline for trial organizations with events, pain points, learnings
-- ============================================

-- ============================================
-- 1. UNIFIED TIMELINE EVENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS trial_timeline_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES trial_organizations(org_id) ON DELETE CASCADE,

  -- Event classification
  event_type TEXT NOT NULL,
  event_category TEXT NOT NULL,

  -- Core content
  title TEXT NOT NULL,
  description TEXT,

  -- Metadata
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  tags TEXT[] DEFAULT '{}',

  -- Entity extraction
  mentioned_people TEXT[] DEFAULT '{}',
  mentioned_features TEXT[] DEFAULT '{}',
  mentioned_users UUID[],

  -- Relationships
  parent_event_id UUID REFERENCES trial_timeline_events(id) ON DELETE SET NULL,
  related_event_ids UUID[] DEFAULT '{}',

  -- Follow-up tracking
  follow_up_required BOOLEAN DEFAULT false,
  follow_up_date DATE,
  follow_up_completed BOOLEAN DEFAULT false,

  -- Timestamps
  event_timestamp TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Audit
  logged_by UUID REFERENCES users(id),
  source TEXT CHECK (source IN ('bulk_import', 'manual_entry', 'system_generated', 'api')),
  parse_confidence DECIMAL(3,2),

  -- Flexible metadata storage
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_timeline_events_org_timestamp ON trial_timeline_events(org_id, event_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_timeline_events_category ON trial_timeline_events(event_category);
CREATE INDEX IF NOT EXISTS idx_timeline_events_type ON trial_timeline_events(event_type);
CREATE INDEX IF NOT EXISTS idx_timeline_events_sentiment ON trial_timeline_events(sentiment);
CREATE INDEX IF NOT EXISTS idx_timeline_events_severity ON trial_timeline_events(severity);
CREATE INDEX IF NOT EXISTS idx_timeline_events_follow_up ON trial_timeline_events(follow_up_required, follow_up_date) WHERE follow_up_required = true;
CREATE INDEX IF NOT EXISTS idx_timeline_events_tags ON trial_timeline_events USING GIN(tags);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_timeline_events_fulltext ON trial_timeline_events USING GIN(
  to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))
);

-- ============================================
-- 2. PAIN POINTS CATALOG
-- ============================================
CREATE TABLE IF NOT EXISTS pain_points (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Content
  title TEXT NOT NULL,
  description TEXT,

  -- Classification
  category TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),

  -- Frequency tracking
  reported_count INTEGER DEFAULT 1,
  affected_orgs UUID[] DEFAULT '{}',
  first_reported_at TIMESTAMP DEFAULT NOW(),
  last_reported_at TIMESTAMP DEFAULT NOW(),

  -- Resolution
  status TEXT CHECK (status IN ('open', 'acknowledged', 'planned', 'in_progress', 'resolved', 'wont_fix')) DEFAULT 'open',
  resolution_notes TEXT,
  resolved_at TIMESTAMP,

  -- Metadata
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pain_points_category ON pain_points(category);
CREATE INDEX IF NOT EXISTS idx_pain_points_severity ON pain_points(severity);
CREATE INDEX IF NOT EXISTS idx_pain_points_status ON pain_points(status);
CREATE INDEX IF NOT EXISTS idx_pain_points_tags ON pain_points USING GIN(tags);

-- ============================================
-- 3. LEARNINGS CATALOG
-- ============================================
CREATE TABLE IF NOT EXISTS learnings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Content
  title TEXT NOT NULL,
  description TEXT,

  -- Classification
  category TEXT NOT NULL,
  impact TEXT CHECK (impact IN ('low', 'medium', 'high')) DEFAULT 'medium',

  -- Action tracking
  actionable BOOLEAN DEFAULT true,
  action_items TEXT[],
  implemented BOOLEAN DEFAULT false,
  implementation_notes TEXT,
  implemented_at TIMESTAMP,

  -- Source tracking
  source_orgs UUID[] DEFAULT '{}',
  reported_count INTEGER DEFAULT 1,

  -- Metadata
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_learnings_category ON learnings(category);
CREATE INDEX IF NOT EXISTS idx_learnings_impact ON learnings(impact);
CREATE INDEX IF NOT EXISTS idx_learnings_implemented ON learnings(implemented);
CREATE INDEX IF NOT EXISTS idx_learnings_tags ON learnings USING GIN(tags);

-- ============================================
-- 4. EVENT-TO-ENTITY LINK TABLES
-- ============================================
CREATE TABLE IF NOT EXISTS event_pain_points (
  event_id UUID REFERENCES trial_timeline_events(id) ON DELETE CASCADE,
  pain_point_id UUID REFERENCES pain_points(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (event_id, pain_point_id)
);

CREATE TABLE IF NOT EXISTS event_learnings (
  event_id UUID REFERENCES trial_timeline_events(id) ON DELETE CASCADE,
  learning_id UUID REFERENCES learnings(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (event_id, learning_id)
);

-- ============================================
-- 5. CUSTOM VIEWS (Notion-style saved filters)
-- ============================================
CREATE TABLE IF NOT EXISTS timeline_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Ownership
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES trial_organizations(org_id) ON DELETE CASCADE,

  -- View configuration
  view_name TEXT NOT NULL,
  view_type TEXT CHECK (view_type IN ('list', 'grouped', 'calendar', 'board')) DEFAULT 'list',
  icon TEXT,

  -- Filters (stored as JSONB)
  filters JSONB DEFAULT '{}'::jsonb,

  -- Sorting and grouping
  sort_by TEXT DEFAULT 'event_timestamp',
  sort_order TEXT CHECK (sort_order IN ('asc', 'desc')) DEFAULT 'desc',
  group_by TEXT,

  -- View settings
  is_default BOOLEAN DEFAULT false,
  is_shared BOOLEAN DEFAULT false,
  color TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_timeline_views_user ON timeline_views(user_id);
CREATE INDEX IF NOT EXISTS idx_timeline_views_org ON timeline_views(org_id);

-- ============================================
-- 6. BULK IMPORT SESSIONS (Audit trail)
-- ============================================
CREATE TABLE IF NOT EXISTS import_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES trial_organizations(org_id),
  user_id UUID NOT NULL REFERENCES users(id),

  -- Import details
  source_type TEXT,
  raw_text TEXT,

  -- Results
  events_parsed INTEGER DEFAULT 0,
  events_imported INTEGER DEFAULT 0,
  pain_points_created INTEGER DEFAULT 0,
  learnings_created INTEGER DEFAULT 0,

  -- Metadata
  parse_stats JSONB,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_import_sessions_org ON import_sessions(org_id);
CREATE INDEX IF NOT EXISTS idx_import_sessions_user ON import_sessions(user_id);

-- ============================================
-- 7. EVENT TYPE TAXONOMY (Reference data)
-- ============================================
CREATE TABLE IF NOT EXISTS event_type_taxonomy (
  event_type TEXT PRIMARY KEY,
  event_category TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  icon_name TEXT,
  color TEXT,
  default_severity TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER
);

-- ============================================
-- SEED EVENT TYPE TAXONOMY
-- ============================================
INSERT INTO event_type_taxonomy (event_type, event_category, display_name, icon_name, color, sort_order) VALUES
-- Onboarding (7 types)
('trial_access_requested', 'onboarding', 'Trial Access Requested', 'mail', '#E5E7EB', 1),
('credentials_shared', 'onboarding', 'Credentials Shared', 'key', '#E5E7EB', 2),
('trial_access_provided', 'onboarding', 'Trial Access Provided', 'check-circle', '#E5E7EB', 3),
('delivery_issue', 'onboarding', 'Delivery Issue', 'alert-triangle', '#FEE2E2', 4),
('first_login', 'onboarding', 'First Login', 'log-in', '#DCFCE7', 5),
('allowlist_support', 'onboarding', 'Allowlist/IT Support', 'shield', '#E5E7EB', 6),
('onboarding_complete', 'onboarding', 'Onboarding Complete', 'check-circle-2', '#DCFCE7', 7),

-- Engagement (6 types)
('usage_observed', 'engagement', 'Usage Observed', 'activity', '#DBEAFE', 10),
('feature_tested', 'engagement', 'Feature Tested', 'beaker', '#DBEAFE', 11),
('use_case_tested', 'engagement', 'Use Case Tested', 'target', '#DBEAFE', 12),
('user_logged_in', 'engagement', 'User Logged In', 'user-check', '#DBEAFE', 13),
('low_engagement', 'engagement', 'Low Engagement Detected', 'trending-down', '#FEF3C7', 14),
('high_engagement', 'engagement', 'High Engagement Detected', 'trending-up', '#DCFCE7', 15),

-- Communication (6 types)
('call_scheduled', 'communication', 'Call Scheduled', 'calendar', '#EDE9FE', 20),
('call_completed', 'communication', 'Call Completed', 'phone', '#EDE9FE', 21),
('meeting_held', 'communication', 'Meeting Held', 'video', '#EDE9FE', 22),
('demo_conducted', 'communication', 'Demo Conducted', 'presentation', '#EDE9FE', 23),
('email_exchange', 'communication', 'Email Exchange', 'mail', '#EDE9FE', 24),
('follow_up_sent', 'communication', 'Follow-up Sent', 'send', '#EDE9FE', 25),

-- Feedback (7 types)
('feedback_received', 'feedback', 'Feedback Received', 'message-circle', '#FEF3C7', 30),
('positive_feedback', 'feedback', 'Positive Feedback', 'thumbs-up', '#DCFCE7', 31),
('negative_feedback', 'feedback', 'Negative Feedback', 'thumbs-down', '#FEE2E2', 32),
('feature_request', 'feedback', 'Feature Request', 'lightbulb', '#FEF3C7', 33),
('pain_point_identified', 'feedback', 'Pain Point Identified', 'alert-circle', '#FEE2E2', 34),
('testimonial_received', 'feedback', 'Testimonial Received', 'award', '#DCFCE7', 35),
('nps_survey_completed', 'feedback', 'NPS Survey Completed', 'clipboard-check', '#DBEAFE', 36),

-- Milestones (8 types)
('trial_extended', 'milestone', 'Trial Extended', 'clock', '#DBEAFE', 50),
('trial_converted', 'milestone', 'Trial Converted to Customer', 'trophy', '#DCFCE7', 51),
('contract_signed', 'milestone', 'Contract Signed', 'file-signature', '#DCFCE7', 52),
('deal_lost', 'milestone', 'Deal Lost', 'x-circle', '#FEE2E2', 53),
('deal_deferred', 'milestone', 'Deal Deferred', 'pause-circle', '#FEF3C7', 54),
('champion_identified', 'milestone', 'Champion Identified', 'star', '#DCFCE7', 55),
('budget_confirmed', 'milestone', 'Budget Confirmed', 'dollar-sign', '#DCFCE7', 56),
('decision_maker_engaged', 'milestone', 'Decision Maker Engaged', 'users', '#DBEAFE', 57),

-- Sales Notes (5 types)
('sales_note', 'sales', 'Sales Note', 'file-text', '#E0F2FE', 60),
('internal_note', 'sales', 'Internal Note', 'sticky-note', '#E0F2FE', 61),
('competitor_mentioned', 'sales', 'Competitor Mentioned', 'zap', '#FEF3C7', 62),
('pricing_discussion', 'sales', 'Pricing Discussion', 'tag', '#E0F2FE', 63),
('renewal_discussion', 'sales', 'Renewal Discussion', 'refresh-cw', '#E0F2FE', 64),

-- Learnings (2 types)
('learning_captured', 'learning', 'Learning Captured', 'book-open', '#DCFCE7', 70),
('follow_up_note', 'learning', 'Follow-up Note', 'bookmark', '#DBEAFE', 71)
ON CONFLICT (event_type) DO UPDATE SET
  event_category = EXCLUDED.event_category,
  display_name = EXCLUDED.display_name,
  icon_name = EXCLUDED.icon_name,
  color = EXCLUDED.color,
  sort_order = EXCLUDED.sort_order;

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_timeline_events_updated_at BEFORE UPDATE ON trial_timeline_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pain_points_updated_at BEFORE UPDATE ON pain_points
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_learnings_updated_at BEFORE UPDATE ON learnings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_timeline_views_updated_at BEFORE UPDATE ON timeline_views
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE trial_timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE pain_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE learnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_pain_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_learnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_sessions ENABLE ROW LEVEL SECURITY;

-- Timeline events: Users can see events for orgs they have access to
CREATE POLICY "Users can view timeline events for their orgs"
ON trial_timeline_events FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM trial_organizations
    WHERE trial_organizations.org_id = trial_timeline_events.org_id
  )
);

CREATE POLICY "Users can insert timeline events"
ON trial_timeline_events FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM trial_organizations
    WHERE trial_organizations.org_id = trial_timeline_events.org_id
  )
);

CREATE POLICY "Users can update timeline events"
ON trial_timeline_events FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM trial_organizations
    WHERE trial_organizations.org_id = trial_timeline_events.org_id
  )
);

CREATE POLICY "Users can delete timeline events"
ON trial_timeline_events FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM trial_organizations
    WHERE trial_organizations.org_id = trial_timeline_events.org_id
  )
);

-- Pain points: All authenticated users can view
CREATE POLICY "Authenticated users can view pain points"
ON pain_points FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert pain points"
ON pain_points FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update pain points"
ON pain_points FOR UPDATE
USING (auth.role() = 'authenticated');

-- Similar policies for learnings
CREATE POLICY "Authenticated users can view learnings"
ON learnings FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert learnings"
ON learnings FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update learnings"
ON learnings FOR UPDATE
USING (auth.role() = 'authenticated');

-- Link tables
CREATE POLICY "Authenticated users can view event_pain_points"
ON event_pain_points FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert event_pain_points"
ON event_pain_points FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view event_learnings"
ON event_learnings FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert event_learnings"
ON event_learnings FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Timeline views: Users can only see their own views or shared views
CREATE POLICY "Users can view their own timeline views"
ON timeline_views FOR SELECT
USING (user_id = auth.uid() OR is_shared = true);

CREATE POLICY "Users can insert their own timeline views"
ON timeline_views FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own timeline views"
ON timeline_views FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own timeline views"
ON timeline_views FOR DELETE
USING (user_id = auth.uid());

-- Import sessions: Users can view their own imports
CREATE POLICY "Users can view their own import sessions"
ON import_sessions FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert import sessions"
ON import_sessions FOR INSERT
WITH CHECK (user_id = auth.uid());

-- ============================================
-- COMMENTS (Documentation)
-- ============================================
COMMENT ON TABLE trial_timeline_events IS 'Unified timeline of all events for trial organizations';
COMMENT ON TABLE pain_points IS 'Catalog of pain points identified across all trial organizations';
COMMENT ON TABLE learnings IS 'Repository of learnings and insights from trial engagements';
COMMENT ON TABLE event_pain_points IS 'Links timeline events to associated pain points';
COMMENT ON TABLE event_learnings IS 'Links timeline events to associated learnings';
COMMENT ON TABLE timeline_views IS 'User-created custom views with saved filters (Notion-style)';
COMMENT ON TABLE import_sessions IS 'Audit trail of bulk import operations';
COMMENT ON TABLE event_type_taxonomy IS 'Reference data for event types and their properties';
