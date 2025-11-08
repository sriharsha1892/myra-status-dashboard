-- Trial Activity Logging System
-- Created: 2025-11-08
-- Purpose: Make it easy for admins to log trial org activities

-- Activity types table for predefined templates
CREATE TABLE IF NOT EXISTS trial_activity_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL, -- 'usage', 'engagement', 'support', 'admin'
  icon TEXT, -- lucide icon name
  color TEXT, -- tailwind color class
  default_description TEXT,
  requires_details BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activities table
CREATE TABLE IF NOT EXISTS trial_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trial_org_id UUID NOT NULL REFERENCES trial_organizations(org_id) ON DELETE CASCADE,
  activity_type_id UUID REFERENCES trial_activity_types(id),
  activity_type TEXT NOT NULL, -- fallback if no type_id
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}', -- flexible storage for activity-specific data
  created_by UUID REFERENCES users(user_id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default activity templates
INSERT INTO trial_activity_types (name, category, icon, color, default_description, requires_details) VALUES
-- Usage activities
('user_login', 'usage', 'LogIn', 'blue', 'User logged into the platform', false),
('questions_asked', 'usage', 'MessageSquare', 'purple', 'User asked questions', true),
('report_generated', 'usage', 'FileText', 'green', 'User generated a report', true),
('expert_review_requested', 'usage', 'Star', 'yellow', 'User requested expert review', true),

-- Engagement activities
('demo_completed', 'engagement', 'Video', 'indigo', 'Demo session completed', true),
('onboarding_started', 'engagement', 'Play', 'cyan', 'User started onboarding', false),
('onboarding_completed', 'engagement', 'CheckCircle', 'green', 'User completed onboarding', false),
('trial_extension_requested', 'engagement', 'Clock', 'orange', 'Trial extension requested', true),

-- Support activities
('ticket_created', 'support', 'AlertCircle', 'red', 'Support ticket created', true),
('ticket_resolved', 'support', 'CheckCircle2', 'green', 'Support ticket resolved', true),
('technical_issue', 'support', 'AlertTriangle', 'red', 'Technical issue encountered', true),
('feature_request', 'support', 'Lightbulb', 'purple', 'Feature request submitted', true),

-- Admin activities
('call_scheduled', 'admin', 'Phone', 'blue', 'Follow-up call scheduled', true),
('call_completed', 'admin', 'PhoneOff', 'green', 'Call/meeting completed', true),
('trial_extended', 'admin', 'Calendar', 'orange', 'Trial period extended', true),
('usage_warning', 'admin', 'AlertTriangle', 'yellow', 'Excessive usage detected', true),
('policy_violation', 'admin', 'ShieldAlert', 'red', 'Policy violation flagged', true),
('feedback_received', 'admin', 'MessageCircle', 'blue', 'Customer feedback received', true)

ON CONFLICT (name) DO NOTHING;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_trial_activities_org ON trial_activities(trial_org_id);
CREATE INDEX IF NOT EXISTS idx_trial_activities_created ON trial_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trial_activities_type ON trial_activities(activity_type);

-- RLS Policies
ALTER TABLE trial_activity_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE trial_activities ENABLE ROW LEVEL SECURITY;

-- Everyone can read activity types
CREATE POLICY "Activity types are viewable by everyone" ON trial_activity_types
  FOR SELECT USING (true);

-- Users can view activities for their accessible orgs
CREATE POLICY "Users can view trial activities" ON trial_activities
  FOR SELECT USING (true);

-- Authenticated users can insert activities
CREATE POLICY "Authenticated users can create activities" ON trial_activities
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update their own activities
CREATE POLICY "Users can update their own activities" ON trial_activities
  FOR UPDATE USING (created_by = auth.uid());

-- Users can delete their own activities
CREATE POLICY "Users can delete their own activities" ON trial_activities
  FOR DELETE USING (created_by = auth.uid());

-- Comments
COMMENT ON TABLE trial_activity_types IS 'Predefined activity templates for quick logging';
COMMENT ON TABLE trial_activities IS 'Activity log for trial organizations';
COMMENT ON COLUMN trial_activities.metadata IS 'Store additional data like report count, question topics, call notes, etc.';
