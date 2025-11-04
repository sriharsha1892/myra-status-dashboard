-- Trial Management Schema
-- Run this in your Supabase SQL Editor to add trial management tables

-- 1. Trial Organizations Table
CREATE TABLE IF NOT EXISTS trial_organizations (
  org_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_name TEXT NOT NULL,
  org_domain TEXT,
  account_manager TEXT,
  org_lifecycle_stage TEXT NOT NULL DEFAULT 'prospect' CHECK (org_lifecycle_stage IN ('prospect', 'demo_scheduled', 'trial_active', 'converted', 'churned')),
  trial_start_date DATE,
  trial_end_date DATE,
  engagement_score INTEGER DEFAULT 0 CHECK (engagement_score >= 0 AND engagement_score <= 100),
  last_activity_date TIMESTAMP WITH TIME ZONE,
  comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Trial Users Table
CREATE TABLE IF NOT EXISTS trial_users (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES trial_organizations(org_id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  title_role TEXT,
  is_primary_contact BOOLEAN DEFAULT false,
  user_status TEXT DEFAULT 'invited' CHECK (user_status IN ('invited', 'access_enabled', 'active', 'inactive')),
  first_login_date TIMESTAMP WITH TIME ZONE,
  last_login_date TIMESTAMP WITH TIME ZONE,
  login_count INTEGER DEFAULT 0,
  queries_executed INTEGER DEFAULT 0,
  is_champion BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. User Activity Log Table
CREATE TABLE IF NOT EXISTS user_activity_log (
  activity_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES trial_users(user_id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES trial_organizations(org_id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('login', 'query_executed', 'report_generated', 'feature_used')),
  activity_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  session_id TEXT,
  metadata JSONB
);

-- 4. Import Batches Table
CREATE TABLE IF NOT EXISTS import_batches (
  import_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  imported_by TEXT NOT NULL,
  import_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  file_name TEXT NOT NULL,
  total_rows INTEGER NOT NULL,
  successful_rows INTEGER DEFAULT 0,
  skipped_rows INTEGER DEFAULT 0,
  import_status TEXT DEFAULT 'pending' CHECK (import_status IN ('pending', 'processing', 'completed', 'failed')),
  error_details JSONB
);

-- 5. Add trial_org_id to existing tickets table
ALTER TABLE tickets
ADD COLUMN IF NOT EXISTS trial_org_id UUID REFERENCES trial_organizations(org_id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_trial_orgs_lifecycle ON trial_organizations(org_lifecycle_stage);
CREATE INDEX IF NOT EXISTS idx_trial_orgs_engagement ON trial_organizations(engagement_score);
CREATE INDEX IF NOT EXISTS idx_trial_users_org ON trial_users(org_id);
CREATE INDEX IF NOT EXISTS idx_trial_users_email ON trial_users(email);
CREATE INDEX IF NOT EXISTS idx_user_activity_org ON user_activity_log(org_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_timestamp ON user_activity_log(activity_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_trial_org ON tickets(trial_org_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_trial_orgs_updated_at
BEFORE UPDATE ON trial_organizations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trial_users_updated_at
BEFORE UPDATE ON trial_users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE trial_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE trial_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_batches ENABLE ROW LEVEL SECURITY;

-- Create policies (adjust based on your auth setup)
CREATE POLICY "Allow all authenticated users to read trial organizations"
ON trial_organizations FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow all authenticated users to insert trial organizations"
ON trial_organizations FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow all authenticated users to update trial organizations"
ON trial_organizations FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Allow all authenticated users to read trial users"
ON trial_users FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow all authenticated users to insert trial users"
ON trial_users FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow all authenticated users to update trial users"
ON trial_users FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Allow all authenticated users to read activity log"
ON user_activity_log FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow all authenticated users to insert activity log"
ON user_activity_log FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow all authenticated users to read import batches"
ON import_batches FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow all authenticated users to insert import batches"
ON import_batches FOR INSERT
TO authenticated
WITH CHECK (true);
