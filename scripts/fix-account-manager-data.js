const { createClient } = require('@supabase/supabase-js');

/**
 * This script fixes account manager data inconsistencies:
 * 1. Converts string "NULL" to actual SQL NULL
 * 2. Populates account_manager_id from account_manager where it's a UUID
 * 3. Populates account_manager (name) from account_manager_id where missing
 */

async function fixAccountManagerData() {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  console.log('🔍 Fetching all organizations...');
  const { data: orgs, error: orgsError } = await supabaseAdmin
    .from('trial_organizations')
    .select('org_id, org_name, account_manager, account_manager_id');

  if (orgsError) {
    console.error('Error fetching orgs:', orgsError);
    return;
  }

  console.log(`Found ${orgs.length} organizations\n`);

  // Fetch all account managers from users table
  console.log('🔍 Fetching account managers from users table...');
  const { data: usersData } = await supabaseAdmin
    .from('users')
    .select('id, email, full_name, username, role');

  const accountManagers = (usersData || [])
    .map(u => ({
      id: u.id,
      email: u.email,
      name: u.full_name || u.username || u.email?.split('@')[0],
      role: u.role,
    }));

  console.log(`Found ${accountManagers.length} users:`);
  accountManagers.forEach(am => console.log(`  - ${am.name} (${am.role}) [${am.id}]`));

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const updates = [];

  console.log('\n📝 Analyzing organizations...\n');

  for (const org of orgs) {
    let needsUpdate = false;
    let newAccountManager = org.account_manager;
    let newAccountManagerId = org.account_manager_id;

    // Fix 1: Convert string "NULL" to actual NULL
    if (org.account_manager === 'NULL' || org.account_manager === 'null') {
      newAccountManager = null;
      needsUpdate = true;
      console.log(`${org.org_name}: Converting account_manager "NULL" → null`);
    }

    if (org.account_manager_id === 'NULL' || org.account_manager_id === 'null') {
      newAccountManagerId = null;
      needsUpdate = true;
      console.log(`${org.org_name}: Converting account_manager_id "NULL" → null`);
    }

    // Fix 2: If account_manager is a UUID, move it to account_manager_id
    if (newAccountManager && uuidRegex.test(newAccountManager)) {
      const manager = accountManagers.find(am => am.id === newAccountManager);
      if (manager) {
        console.log(`${org.org_name}: Moving UUID to account_manager_id and setting name to "${manager.name}"`);
        newAccountManagerId = newAccountManager;
        newAccountManager = manager.name;
        needsUpdate = true;
      }
    }

    // Fix 3: If account_manager_id exists but account_manager doesn't, populate the name
    if (newAccountManagerId && !newAccountManager && uuidRegex.test(newAccountManagerId)) {
      const manager = accountManagers.find(am => am.id === newAccountManagerId);
      if (manager) {
        console.log(`${org.org_name}: Populating account_manager name from account_manager_id: "${manager.name}"`);
        newAccountManager = manager.name;
        needsUpdate = true;
      }
    }

    // Fix 4: If account_manager is a name, try to find and populate account_manager_id
    if (newAccountManager && !newAccountManagerId && !uuidRegex.test(newAccountManager)) {
      const manager = accountManagers.find(am =>
        am.name.toLowerCase() === newAccountManager.toLowerCase() ||
        am.email.toLowerCase().includes(newAccountManager.toLowerCase())
      );
      if (manager) {
        console.log(`${org.org_name}: Found account_manager_id for "${newAccountManager}": ${manager.id}`);
        newAccountManagerId = manager.id;
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      updates.push({
        org_id: org.org_id,
        org_name: org.org_name,
        account_manager: newAccountManager,
        account_manager_id: newAccountManagerId,
      });
    }
  }

  console.log(`\n\n📊 Summary: ${updates.length} organizations need updates\n`);

  if (updates.length === 0) {
    console.log('✅ No updates needed!');
    return;
  }

  console.log('🔄 Applying updates...\n');

  let successCount = 0;
  let errorCount = 0;

  for (const update of updates) {
    const { error } = await supabaseAdmin
      .from('trial_organizations')
      .update({
        account_manager: update.account_manager,
        account_manager_id: update.account_manager_id,
      })
      .eq('org_id', update.org_id);

    if (error) {
      console.error(`❌ ${update.org_name}: ${error.message}`);
      errorCount++;
    } else {
      console.log(`✅ ${update.org_name}: Updated`);
      successCount++;
    }
  }

  console.log(`\n\n📈 Results:`);
  console.log(`  ✅ Success: ${successCount}`);
  console.log(`  ❌ Errors: ${errorCount}`);
  console.log(`  📊 Total: ${updates.length}`);
}

fixAccountManagerData()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Fatal error:', err);
    process.exit(1);
  });
