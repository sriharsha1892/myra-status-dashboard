// Populate users table with all auth users
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function populateUsersTable() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  console.log('🚀 Starting to populate users table...\n');

  // Get all users from auth
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

  if (authError) {
    console.error('❌ Error fetching auth users:', authError);
    process.exit(1);
  }

  console.log(`Found ${authUsers.users.length} auth users\n`);

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const user of authUsers.users) {
    console.log(`Processing: ${user.email}`);

    // Check if user already exists in users table
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (existing) {
      console.log('  ⏭️  Already exists, skipping\n');
      skipped++;
      continue;
    }

    // Determine role and permissions based on email
    // Note: Only 'admin' and 'viewer' are allowed role values
    let role = 'viewer';
    let is_super_admin = false;
    let parent_company = 'Mordor Intelligence';

    if (user.email === 'admin@myra.ai') {
      role = 'admin';
      is_super_admin = true;
      parent_company = 'Mordor Intelligence';
    } else if (user.email === 'sriharsha@mordorintelligence.com') {
      role = 'admin';
      is_super_admin = true;
      parent_company = 'Mordor Intelligence';
    } else if (user.email.includes('@mordorintelligence.com')) {
      role = 'viewer';
      is_super_admin = false;
      parent_company = 'Mordor Intelligence';
    }

    // Extract name from email
    const emailName = user.email.split('@')[0];
    const full_name = emailName
      .split('.')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');

    // Insert into users table
    // Note: password_hash is required but not used for auth users (they authenticate via Supabase Auth)
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        id: user.id,
        email: user.email,
        password_hash: 'AUTH_USER', // Dummy hash - these users authenticate via Supabase Auth
        full_name: full_name,
        role: role,
        parent_company: parent_company,
        is_super_admin: is_super_admin,
        is_active: true,
        managed_org_ids: [],
        created_at: user.created_at,
      })
      .select()
      .single();

    if (insertError) {
      console.error('  ❌ Error creating user:', insertError);
      failed++;
    } else {
      console.log(`  ✅ Created: ${role} - ${full_name}`);
      created++;
    }
    console.log('');
  }

  console.log('\n📊 Summary:');
  console.log(`  ✅ Created: ${created}`);
  console.log(`  ⏭️  Skipped: ${skipped}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  📈 Total: ${authUsers.users.length}`);

  if (created > 0) {
    console.log('\n🎉 Users table populated successfully!');
    console.log('\n👉 Try accessing the customer support page now.');
  }
}

populateUsersTable();
