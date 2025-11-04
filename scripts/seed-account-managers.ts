import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const accountManagers = [
  { full_name: 'Sarah Johnson', email: 'sarah.johnson@myra.ai' },
  { full_name: 'Michael Chen', email: 'michael.chen@myra.ai' },
  { full_name: 'Emily Davis', email: 'emily.davis@myra.ai' },
  { full_name: 'David Wilson', email: 'david.wilson@myra.ai' },
  { full_name: 'Jessica Martinez', email: 'jessica.martinez@myra.ai' },
  { full_name: 'Robert Taylor', email: 'robert.taylor@myra.ai' },
  { full_name: 'Amanda Lee', email: 'amanda.lee@myra.ai' },
];

async function seedAccountManagers() {
  try {
    console.log('\n📝 Seeding Account Managers...\n');

    // Check if managers already exist
    const { data: existing } = await supabase
      .from('org_users')
      .select('id');

    if (existing && existing.length > 0) {
      console.log('⚠️  Account managers already exist in database');
      console.log(`Found ${existing.length} existing manager(s)\n`);
      process.exit(0);
    }

    // Insert account managers
    const { data, error } = await supabase
      .from('org_users')
      .insert(accountManagers);

    if (error) throw error;

    console.log(`✅ Successfully created ${accountManagers.length} account manager(s):`);
    accountManagers.forEach(manager => {
      console.log(`  • ${manager.full_name} (${manager.email})`);
    });

    console.log('\n✅ Account managers are now available for assignment to trial organizations!\n');
    console.log('How to use:');
    console.log('1. Go to any trial organization: /trials/[org-id]');
    console.log('2. Click the "Overview" tab');
    console.log('3. Select an account manager from the dropdown\n');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

seedAccountManagers();
