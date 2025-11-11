const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'present' : 'missing');
  console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'present' : 'missing');
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'present' : 'missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugAccountManagers() {
  console.log('Fetching all users...');
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('user_id, email, username, full_name');

  if (usersError) {
    console.error('Error fetching users:', usersError);
    return;
  }

  console.log(`\nTotal users: ${users.length}`);
  console.log('\nUsers in database:');
  users.forEach(user => {
    console.log(`  UUID: ${user.user_id}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Username: ${user.username || 'null'}`);
    console.log(`  Full Name: ${user.full_name || 'null'}`);
    console.log('  ---');
  });

  console.log('\n\nFetching trial organizations...');
  const { data: orgs, error: orgsError } = await supabase
    .from('trial_organizations')
    .select('org_id, org_name, account_manager, account_manager_id')
    .limit(30);

  if (orgsError) {
    console.error('Error fetching orgs:', orgsError);
    return;
  }

  console.log(`\nTotal orgs (sample): ${orgs.length}`);

  // Create user lookup map
  const userMap = new Map();
  users.forEach(user => {
    userMap.set(user.user_id, user);
    userMap.set(user.email, user);
    if (user.username) {
      userMap.set(user.username, user);
    }
  });

  console.log('\n\nAccount Manager Analysis:');
  console.log('='.repeat(100));

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  orgs.forEach(org => {
    console.log(`\nOrg: ${org.org_name}`);
    console.log(`  account_manager (TEXT): ${org.account_manager || 'NULL'}`);
    console.log(`  account_manager_id (UUID): ${org.account_manager_id || 'NULL'}`);

    // Check account_manager_id
    if (org.account_manager_id) {
      const foundById = userMap.get(org.account_manager_id);
      console.log(`  account_manager_id found in users: ${foundById ? 'YES' : 'NO'}`);
      if (foundById) {
        console.log(`  → Resolves to: ${foundById.full_name || foundById.username || foundById.email}`);
      } else {
        console.log(`  → Would show: "Unknown Manager"`);
      }
    }

    // Check account_manager
    if (org.account_manager) {
      const foundByText = userMap.get(org.account_manager);
      const isUuid = uuidRegex.test(org.account_manager);
      console.log(`  account_manager is UUID: ${isUuid}`);
      console.log(`  account_manager found in users: ${foundByText ? 'YES' : 'NO'}`);
      if (foundByText) {
        console.log(`  → Resolves to: ${foundByText.full_name || foundByText.username || foundByText.email}`);
      } else if (isUuid) {
        console.log(`  → Would show: "Unknown Manager"`);
      } else {
        console.log(`  → Would show: "${org.account_manager}"`);
      }
    }

    // Final result with fallback logic
    const finalValue = org.account_manager_id || org.account_manager;
    if (!finalValue) {
      console.log(`  ✓ FINAL DISPLAY: "Unassigned"`);
    } else {
      const found = userMap.get(finalValue);
      if (found) {
        console.log(`  ✓ FINAL DISPLAY: "${found.full_name || found.username || found.email}"`);
      } else if (uuidRegex.test(finalValue)) {
        console.log(`  ✓ FINAL DISPLAY: "Unknown Manager"`);
      } else {
        console.log(`  ✓ FINAL DISPLAY: "${finalValue}"`);
      }
    }
  });
}

debugAccountManagers().then(() => {
  console.log('\n\nDone!');
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
