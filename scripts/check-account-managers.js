const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAccountManagers() {
  console.log('Fetching all users...');
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('user_id, email, username, full_name, role');

  if (usersError) {
    console.error('Error fetching users:', usersError);
    return;
  }

  console.log(`\nTotal users in database: ${users.length}`);
  console.log('\nUsers list:');
  users.forEach(user => {
    console.log(`  - ${user.user_id}: ${user.full_name || user.username || user.email} (${user.email})`);
  });

  console.log('\n\nFetching trial organizations...');
  const { data: orgs, error: orgsError } = await supabase
    .from('trial_organizations')
    .select('org_id, org_name, account_manager')
    .not('account_manager', 'is', null);

  if (orgsError) {
    console.error('Error fetching orgs:', orgsError);
    return;
  }

  console.log(`\nTotal orgs with account_manager: ${orgs.length}`);

  // Create lookup map
  const userMap = new Map();
  users.forEach(user => {
    userMap.set(user.user_id, user);
    userMap.set(user.email, user);
    if (user.username) {
      userMap.set(user.username, user);
    }
  });

  console.log('\n\nAccount Manager Analysis:');
  console.log('='.repeat(80));

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  orgs.forEach(org => {
    const am = org.account_manager;
    const found = userMap.get(am);
    const isUuid = uuidRegex.test(am);

    console.log(`\nOrg: ${org.org_name}`);
    console.log(`  account_manager value: ${am}`);
    console.log(`  Is UUID: ${isUuid}`);
    console.log(`  Found in users table: ${found ? 'YES' : 'NO'}`);
    if (found) {
      console.log(`  Resolves to: ${found.full_name || found.username || found.email}`);
    } else if (isUuid) {
      console.log(`  ⚠️  UUID NOT FOUND - will show "Unknown Manager"`);
    } else {
      console.log(`  Will display as: ${am}`);
    }
  });
}

checkAccountManagers().then(() => {
  console.log('\nDone!');
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
