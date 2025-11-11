const { createClient } = require('@supabase/supabase-js');

async function checkManagers() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  console.log('\n========== CHECKING USERS TABLE ==========');

  // Fetch all users
  const { data: allUsers, error: allError } = await supabase
    .from('users')
    .select('id, email, full_name, role');

  console.log(`\nTotal users: ${allUsers?.length || 0}`);
  if (allError) {
    console.log('Error fetching all users:', allError);
  }

  if (allUsers) {
    console.log('\nAll users:');
    allUsers.forEach(u => {
      console.log(`  - ${u.full_name || u.email}: role="${u.role}" id=${u.id}`);
    });
  }

  // Try to fetch with account_manager role
  const { data: ams, error: amError } = await supabase
    .from('users')
    .select('id, email, full_name, role')
    .eq('role', 'account_manager');

  console.log(`\n\nUsers with role='account_manager': ${ams?.length || 0}`);
  if (amError) {
    console.log('Error:', amError);
  }
  if (ams) {
    ams.forEach(u => console.log(`  - ${u.full_name || u.email}`));
  }

  console.log('\n\n========== CHECKING TRIAL_ORGANIZATIONS ==========');

  // Check first 10 orgs
  const { data: orgs, error: orgError } = await supabase
    .from('trial_organizations')
    .select('org_name, account_manager_id, account_manager')
    .limit(10);

  console.log(`\nFirst 10 orgs:`);
  if (orgError) {
    console.log('Error:', orgError);
  }
  if (orgs) {
    orgs.forEach(o => {
      console.log(`\n  ${o.org_name}:`);
      console.log(`    account_manager_id: ${o.account_manager_id || 'NULL'}`);
      console.log(`    account_manager: ${o.account_manager || 'NULL'}`);
    });
  }
}

checkManagers().then(() => {
  console.log('\n\nDone!');
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
