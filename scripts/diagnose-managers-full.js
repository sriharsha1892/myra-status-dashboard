const { createClient } = require('@supabase/supabase-js');

async function diagnose() {
  // First, fetch from the API like the frontend does
  console.log('\n========== FETCHING FROM API ==========');
  const response = await fetch('http://localhost:3000/api/account-managers');
  const { managers } = await response.json();

  console.log(`\nManagers from API: ${managers.length}`);
  managers.forEach(m => {
    console.log(`  - ${m.full_name}`);
    console.log(`    user_id: ${m.user_id}`);
    console.log(`    email: ${m.email}`);
    console.log(`    role: ${m.role}`);
  });

  // Filter for account_manager role
  const accountManagers = managers.filter(m =>
    m.role === 'account_manager' || m.role === 'Account_Manager'
  );

  console.log(`\nFiltered Account Managers: ${accountManagers.length}`);
  accountManagers.forEach(m => {
    console.log(`  - ${m.full_name} (role: ${m.role})`);
  });

  // Now check the database
  console.log('\n\n========== DATABASE ORG DATA ==========');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const { data: orgs } = await supabase
    .from('trial_organizations')
    .select('org_name, account_manager, account_manager_id')
    .limit(30);

  console.log(`\nFirst 30 orgs:`);
  orgs.forEach(o => {
    console.log(`\n  ${o.org_name}:`);
    console.log(`    account_manager: "${o.account_manager || 'NULL'}"`);
    console.log(`    account_manager_id: "${o.account_manager_id || 'NULL'}"`);

    // Check if account_manager matches any account manager
    const matchByUuid = accountManagers.find(m => m.user_id === o.account_manager);
    const matchByEmail = accountManagers.find(m => m.email === o.account_manager);
    const matchByName = accountManagers.find(m => m.full_name === o.account_manager);

    if (matchByUuid) {
      console.log(`    ✓ MATCHES UUID: ${matchByUuid.full_name}`);
    } else if (matchByEmail) {
      console.log(`    ✓ MATCHES EMAIL: ${matchByEmail.full_name}`);
    } else if (matchByName) {
      console.log(`    ✓ MATCHES NAME: ${matchByName.full_name}`);
    } else if (o.account_manager && o.account_manager.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      console.log(`    ✗ UUID but NO MATCH → "Unknown Manager"`);
    } else if (o.account_manager) {
      console.log(`    ✗ NO MATCH (likely salesPOC) → "Unassigned"`);
    } else {
      console.log(`    ✗ NULL → "Unassigned"`);
    }
  });

  // Show what the map would look like
  console.log('\n\n========== ACCOUNT MANAGER MAP ==========');
  const map = new Map();
  accountManagers.forEach(m => {
    map.set(m.user_id, m.full_name);
    map.set(m.email, m.full_name);
  });

  console.log('Map entries:');
  Array.from(map.entries()).forEach(([key, value]) => {
    console.log(`  "${key}" → "${value}"`);
  });
}

diagnose().then(() => {
  console.log('\n\nDone!');
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
