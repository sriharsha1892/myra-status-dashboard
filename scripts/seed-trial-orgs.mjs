import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local
dotenv.config({ path: join(__dirname, '..', '.env.local') });

// Use service role key to bypass RLS policies
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🌱 Seeding trial organizations and users...\n');

// Sample organizations
const organizations = [
  {
    org_name: 'Acme Corp',
    org_domain: 'acme.com',
    account_manager: 'Sarah Chen',
    org_lifecycle_stage: 'trial_active',
    trial_start_date: '2025-10-20',
    trial_end_date: '2025-11-03',
    engagement_score: 85,
    last_activity_date: '2025-11-02',
    comments: 'Very engaged, high potential for conversion'
  },
  {
    org_name: 'TechStart Inc',
    org_domain: 'techstart.io',
    account_manager: 'Mike Johnson',
    org_lifecycle_stage: 'demo_scheduled',
    trial_start_date: null,
    trial_end_date: null,
    engagement_score: 45,
    last_activity_date: '2025-10-28',
    comments: 'Demo scheduled for next week'
  },
  {
    org_name: 'Global Solutions',
    org_domain: 'globalsolutions.com',
    account_manager: 'Sarah Chen',
    org_lifecycle_stage: 'trial_active',
    trial_start_date: '2025-10-15',
    trial_end_date: '2025-10-29',
    engagement_score: 92,
    last_activity_date: '2025-11-01',
    comments: 'Ready for conversion discussion'
  },
  {
    org_name: 'DataFlow Systems',
    org_domain: 'dataflow.tech',
    account_manager: 'Alex Rodriguez',
    org_lifecycle_stage: 'prospect',
    trial_start_date: null,
    trial_end_date: null,
    engagement_score: 25,
    last_activity_date: '2025-10-15',
    comments: 'Initial outreach completed'
  },
  {
    org_name: 'CloudNine Enterprises',
    org_domain: 'cloudnine.co',
    account_manager: 'Mike Johnson',
    org_lifecycle_stage: 'trial_active',
    trial_start_date: '2025-10-25',
    trial_end_date: '2025-11-08',
    engagement_score: 67,
    last_activity_date: '2025-10-31',
    comments: 'Some challenges with onboarding'
  },
  {
    org_name: 'InnovateLabs',
    org_domain: 'innovatelabs.ai',
    account_manager: 'Sarah Chen',
    org_lifecycle_stage: 'converted',
    trial_start_date: '2025-09-15',
    trial_end_date: '2025-09-29',
    engagement_score: 95,
    last_activity_date: '2025-11-02',
    comments: 'Successfully converted to paid plan'
  },
  {
    org_name: 'FinTech Solutions',
    org_domain: 'fintech-sol.com',
    account_manager: 'Alex Rodriguez',
    org_lifecycle_stage: 'churned',
    trial_start_date: '2025-09-01',
    trial_end_date: '2025-09-15',
    engagement_score: 15,
    last_activity_date: '2025-09-10',
    comments: 'Did not engage during trial'
  },
  {
    org_name: 'MediaMax Partners',
    org_domain: 'mediamax.net',
    account_manager: null,
    org_lifecycle_stage: 'demo_scheduled',
    trial_start_date: null,
    trial_end_date: null,
    engagement_score: 50,
    last_activity_date: '2025-10-30',
    comments: null
  }
];

// Insert organizations
try {
  // First, delete any existing test data to avoid duplicates
  await supabase
    .from('trial_organizations')
    .delete()
    .in('org_name', organizations.map(o => o.org_name));

  const { data: insertedOrgs, error: orgError } = await supabase
    .from('trial_organizations')
    .insert(organizations)
    .select('org_id, org_name');

  if (orgError) {
    console.error('Error inserting organizations:', orgError);
    process.exit(1);
  }

  console.log(`✅ Inserted ${insertedOrgs.length} organizations`);

  // Create users for some organizations
  const users = [];
  for (const org of insertedOrgs.slice(0, 5)) { // Add users to first 5 orgs
    const orgUsers = [
      {
        org_id: org.org_id,
        full_name: `John Doe (${org.org_name})`,
        email: `john.doe@${org.org_name.toLowerCase().replace(/\s+/g, '')}.com`,
        title_role: 'Product Manager',
        is_primary_contact: true,
        user_status: 'active',
        first_login_date: '2025-10-15',
        last_login_date: '2025-11-01',
        login_count: 15,
        queries_executed: 47,
        is_champion: true
      },
      {
        org_id: org.org_id,
        full_name: `Jane Smith (${org.org_name})`,
        email: `jane.smith@${org.org_name.toLowerCase().replace(/\s+/g, '')}.com`,
        title_role: 'Data Analyst',
        is_primary_contact: false,
        user_status: 'active',
        first_login_date: '2025-10-16',
        last_login_date: '2025-10-30',
        login_count: 8,
        queries_executed: 23,
        is_champion: false
      },
      {
        org_id: org.org_id,
        full_name: `Bob Wilson (${org.org_name})`,
        email: `bob.wilson@${org.org_name.toLowerCase().replace(/\s+/g, '')}.com`,
        title_role: 'Engineer',
        is_primary_contact: false,
        user_status: 'invited',
        first_login_date: null,
        last_login_date: null,
        login_count: 0,
        queries_executed: 0,
        is_champion: false
      }
    ];
    users.push(...orgUsers);
  }

  const { data: insertedUsers, error: userError } = await supabase
    .from('trial_users')
    .insert(users)
    .select('user_id');

  if (userError) {
    console.error('Error inserting users:', userError);
  } else {
    console.log(`✅ Inserted ${insertedUsers.length} users`);
  }

  console.log('\n✨ Seed data created successfully!');
  console.log('\n📊 Summary:');
  console.log(`   • ${insertedOrgs.length} organizations`);
  console.log(`   • ${insertedUsers?.length || 0} users`);
  console.log('\n🔗 Open http://localhost:3000/trials to test bulk operations\n');

} catch (error) {
  console.error('Unexpected error:', error);
  process.exit(1);
}
