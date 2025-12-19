/**
 * Script to alter the organizations table to match the new schema
 * Run with: NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/alter-organizations.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function alterTable() {
  console.log('Checking current schema...');

  // Clear existing test data
  const { error: deleteError } = await supabase
    .from('organizations')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

  if (deleteError) {
    console.log('Could not clear table:', deleteError.message);
  } else {
    console.log('Cleared existing test data');
  }

  // The table exists but with limited columns
  // We need to add new columns via Supabase SQL Editor
  // For now, let's work with what we have and add data

  console.log('\nTo add the full schema, run this SQL in Supabase SQL Editor:');
  console.log(`
-- Add new columns to organizations table
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES organizations(id);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS industry TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS region TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS trial_status TEXT DEFAULT 'not_requested';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS trial_given_date DATE;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS trial_usage_notes TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS login_status TEXT DEFAULT 'not_logged_in';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS deal_value DECIMAL(12,2);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS contract_period_months INTEGER;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS num_users INTEGER;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS arr DECIMAL(12,2);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS contract_start_date DATE;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS contract_end_date DATE;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS renewal_date DATE;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS employee_name TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS pain_points TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS current_tools TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add organization_id to sales_pipeline
ALTER TABLE sales_pipeline ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_organizations_parent ON organizations(parent_id);
CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(status);
CREATE INDEX IF NOT EXISTS idx_organizations_trial_status ON organizations(trial_status);
CREATE INDEX IF NOT EXISTS idx_sales_pipeline_org ON sales_pipeline(organization_id);
  `);

  console.log('\nAfter running the SQL, re-run: npx tsx scripts/migrate-to-orgs.ts');
}

alterTable();
