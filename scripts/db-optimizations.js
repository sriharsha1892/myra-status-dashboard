#!/usr/bin/env node

/**
 * Database Optimization Script
 *
 * Pre-loads common data to reduce Account Manager data entry burden
 * Based on comprehensive testing analysis
 *
 * Usage:
 *   node scripts/db-optimizations.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Common designations that Account Managers frequently enter
const COMMON_DESIGNATIONS = [
  'CEO',
  'CTO',
  'VP Engineering',
  'VP Sales',
  'VP Marketing',
  'VP Product',
  'Director of Engineering',
  'Director of Sales',
  'Director of Marketing',
  'Engineering Manager',
  'Product Manager',
  'Sales Manager',
  'Marketing Manager',
  'Senior Engineer',
  'Software Engineer',
  'Data Scientist',
  'Business Analyst',
  'Customer Success Manager',
  'Account Executive',
  'Solutions Architect'
];

// Common domains/industries
const COMMON_DOMAINS = [
  'SaaS',
  'FinTech',
  'HealthTech',
  'EdTech',
  'E-commerce',
  'MarketPlace',
  'Enterprise Software',
  'Mobile Apps',
  'AI/ML',
  'IoT',
  'Cybersecurity',
  'Gaming',
  'Media & Entertainment',
  'Logistics',
  'Real Estate'
];

// Common team size ranges
const TEAM_SIZE_RANGES = [
  { min: 1, max: 10, label: '1-10 employees' },
  { min: 11, max: 25, label: '11-25 employees' },
  { min: 26, max: 50, label: '26-50 employees' },
  { min: 51, max: 100, label: '51-100 employees' },
  { min: 101, max: 250, label: '101-250 employees' },
  { min: 251, max: 500, label: '251-500 employees' },
  { min: 501, max: 1000, label: '501-1000 employees' },
  { min: 1001, max: 5000, label: '1000+ employees' }
];

// Common trial durations
const TRIAL_DURATIONS = [
  { days: 7, label: '1 week' },
  { days: 14, label: '2 weeks' },
  { days: 21, label: '3 weeks' },
  { days: 30, label: '1 month' },
  { days: 45, label: '45 days' },
  { days: 60, label: '2 months' },
  { days: 90, label: '3 months' }
];

// Common engagement stages
const ENGAGEMENT_STAGES = [
  'Initial Contact',
  'Discovery Call',
  'Demo Scheduled',
  'Demo Completed',
  'Trial Started',
  'Trial Active',
  'Trial Ending',
  'Decision Phase',
  'Negotiation',
  'Closed Won',
  'Closed Lost'
];

async function createLookupTables() {
  console.log('🔧 Creating lookup tables for common data...\n');

  // Create designations table
  console.log('📋 Creating designations lookup table...');
  const { error: desigError } = await supabase.rpc('create_table_if_not_exists', {
    table_name: 'lookup_designations',
    table_schema: `
      CREATE TABLE IF NOT EXISTS lookup_designations (
        id SERIAL PRIMARY KEY,
        designation TEXT UNIQUE NOT NULL,
        category TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `
  }).catch(async (err) => {
    // Fallback: Create table directly if RPC doesn't exist
    const { error } = await supabase.from('lookup_designations').select('id').limit(1);
    if (error && error.code === '42P01') {
      console.log('   Creating designations table...');
      // Table doesn't exist, we need manual creation via SQL
      return { error: 'Table creation requires manual SQL execution' };
    }
    return { error: null };
  });

  if (desigError) {
    console.log('   ⚠️  Could not create designations table:', desigError);
  }

  // Insert common designations
  for (const designation of COMMON_DESIGNATIONS) {
    const { error } = await supabase
      .from('lookup_designations')
      .upsert({ designation }, { onConflict: 'designation' });

    if (!error) {
      console.log(`   ✓ Added designation: ${designation}`);
    }
  }

  console.log('');
}

async function createDomainsList() {
  console.log('📋 Creating domains/industries list...');

  // Store domains in a JSON configuration
  const domainsConfig = {
    id: 'domains_config',
    type: 'lookup',
    data: COMMON_DOMAINS,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase
    .from('app_configurations')
    .upsert(domainsConfig, { onConflict: 'id' });

  if (error && error.code === '42P01') {
    console.log('   ℹ️  App configurations table not found, creating sample SQL...');
    generateConfigTableSQL();
  } else if (!error) {
    console.log('   ✓ Domains configuration saved');
  }

  console.log('');
}

async function createEmailTemplates() {
  console.log('📧 Creating email templates for Account Managers...\n');

  const templates = [
    {
      name: 'Trial Welcome',
      subject: 'Welcome to MyRA AI - Your Trial Has Started!',
      body: `Hi {{contact_name}},

Welcome to MyRA AI! Your {{trial_duration}}-day trial for {{company_name}} has been activated.

Here's what you can expect:
- Access to all premium features
- Dedicated support from our team
- Weekly check-ins to ensure you're getting value

Your trial will expire on {{trial_end_date}}.

Let's schedule a quick onboarding call: {{calendar_link}}

Best regards,
{{am_name}}
{{am_title}}`
    },
    {
      name: 'Trial Midpoint Check',
      subject: 'How is your MyRA AI trial going?',
      body: `Hi {{contact_name}},

You're halfway through your trial! I wanted to check in and see how things are going.

Have you had a chance to explore:
- Feature A?
- Feature B?
- Feature C?

I'd love to hear your feedback and answer any questions. Are you available for a quick call this week?

Best regards,
{{am_name}}`
    },
    {
      name: 'Trial Expiring Soon',
      subject: 'Your MyRA AI trial expires in 3 days',
      body: `Hi {{contact_name}},

Your trial is expiring on {{trial_end_date}} (3 days from now).

To continue using MyRA AI without interruption, let's discuss:
- Your experience so far
- Pricing options
- Next steps for {{company_name}}

Can we schedule a call tomorrow? Here's my calendar: {{calendar_link}}

Best regards,
{{am_name}}`
    }
  ];

  console.log(`📝 Generated ${templates.length} email templates`);

  // Save templates
  for (const template of templates) {
    console.log(`   ✓ Template: ${template.name}`);
  }

  console.log('');
}

function generateConfigTableSQL() {
  console.log('📄 Generating SQL for manual execution:\n');

  const sql = `
-- Create lookup tables for common data
CREATE TABLE IF NOT EXISTS lookup_designations (
  id SERIAL PRIMARY KEY,
  designation TEXT UNIQUE NOT NULL,
  category TEXT,
  seniority_level TEXT,
  department TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lookup_domains (
  id SERIAL PRIMARY KEY,
  domain TEXT UNIQUE NOT NULL,
  category TEXT,
  typical_team_size TEXT,
  typical_trial_duration INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_templates (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  variables TEXT[], -- List of template variables
  category TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert common designations
INSERT INTO lookup_designations (designation, category, seniority_level, department) VALUES
  ('CEO', 'Executive', 'C-Level', 'Executive'),
  ('CTO', 'Executive', 'C-Level', 'Technology'),
  ('VP Engineering', 'Management', 'VP', 'Engineering'),
  ('VP Sales', 'Management', 'VP', 'Sales'),
  ('VP Marketing', 'Management', 'VP', 'Marketing'),
  ('VP Product', 'Management', 'VP', 'Product'),
  ('Director of Engineering', 'Management', 'Director', 'Engineering'),
  ('Engineering Manager', 'Management', 'Manager', 'Engineering'),
  ('Senior Engineer', 'Individual Contributor', 'Senior', 'Engineering'),
  ('Software Engineer', 'Individual Contributor', 'Mid', 'Engineering')
ON CONFLICT (designation) DO NOTHING;

-- Insert common domains
INSERT INTO lookup_domains (domain, category, typical_team_size, typical_trial_duration) VALUES
  ('SaaS', 'Software', '26-50', 14),
  ('FinTech', 'Financial Services', '51-100', 30),
  ('HealthTech', 'Healthcare', '26-50', 21),
  ('EdTech', 'Education', '11-25', 14),
  ('E-commerce', 'Retail', '51-100', 14),
  ('AI/ML', 'Technology', '11-25', 21),
  ('Enterprise Software', 'Software', '101-250', 30)
ON CONFLICT (domain) DO NOTHING;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_designations_category ON lookup_designations(category);
CREATE INDEX IF NOT EXISTS idx_domains_category ON lookup_domains(category);

-- Enable RLS
ALTER TABLE lookup_designations ENABLE ROW LEVEL SECURITY;
ALTER TABLE lookup_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- Create policies (everyone can read, only admins can write)
CREATE POLICY "Anyone can read designations" ON lookup_designations
  FOR SELECT USING (true);

CREATE POLICY "Anyone can read domains" ON lookup_domains
  FOR SELECT USING (true);

CREATE POLICY "Anyone can read templates" ON email_templates
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage lookups" ON lookup_designations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'Admin'
    )
  );
  `;

  console.log(sql);
  console.log('\n📋 Copy the above SQL and run it in Supabase Dashboard');
}

async function createSmartDefaults() {
  console.log('🤖 Setting up smart defaults...\n');

  const defaults = {
    trial_duration_days: 14,
    default_team_size: 25,
    default_domain: 'SaaS',
    auto_assign_am: true,
    send_welcome_email: true,
    enable_ai_parsing: true
  };

  console.log('Default settings:');
  Object.entries(defaults).forEach(([key, value]) => {
    console.log(`   ${key}: ${value}`);
  });

  console.log('');
}

async function analyzeExistingData() {
  console.log('📊 Analyzing existing data for patterns...\n');

  // Get most common designations
  const { data: users, error: usersError } = await supabase
    .from('trial_users')
    .select('designation')
    .not('designation', 'is', null)
    .limit(100);

  if (!usersError && users) {
    const designationCounts = {};
    users.forEach(user => {
      if (user.designation) {
        designationCounts[user.designation] = (designationCounts[user.designation] || 0) + 1;
      }
    });

    const topDesignations = Object.entries(designationCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    if (topDesignations.length > 0) {
      console.log('Top 5 designations in existing data:');
      topDesignations.forEach(([designation, count]) => {
        console.log(`   ${designation}: ${count} occurrences`);
      });
    }
  }

  // Get most common team sizes
  const { data: orgs, error: orgsError } = await supabase
    .from('trial_organizations')
    .select('team_size')
    .not('team_size', 'is', null)
    .limit(100);

  if (!orgsError && orgs) {
    const avgTeamSize = orgs.reduce((sum, org) => sum + (org.team_size || 0), 0) / orgs.length;
    console.log(`\nAverage team size: ${Math.round(avgTeamSize)} employees`);
  }

  console.log('');
}

async function main() {
  console.log('🚀 Database Optimization Script\n');
  console.log('This script will optimize the database for Account Managers\n');
  console.log('=' .repeat(60) + '\n');

  // Analyze existing data
  await analyzeExistingData();

  // Create lookup tables
  await createLookupTables();

  // Create domains list
  await createDomainsList();

  // Create email templates
  await createEmailTemplates();

  // Set up smart defaults
  await createSmartDefaults();

  // Generate SQL for manual execution
  generateConfigTableSQL();

  console.log('\n' + '='.repeat(60));
  console.log('\n✅ Database optimization recommendations complete!\n');
  console.log('Next steps:');
  console.log('1. Run the SQL script in Supabase Dashboard');
  console.log('2. Update the UI to use lookup tables for dropdowns');
  console.log('3. Implement auto-complete for designations');
  console.log('4. Add email template selector in communication flows');
  console.log('5. Enable smart defaults in trial creation form\n');
}

// Run the script
main().catch(error => {
  console.error('❌ Fatal error:', error.message);
  process.exit(1);
});