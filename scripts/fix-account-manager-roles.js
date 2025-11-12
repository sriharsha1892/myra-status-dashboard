#!/usr/bin/env node

/**
 * Fix Account Manager Roles
 * Updates all users who are assigned as account managers to have role="account_manager"
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function fixAccountManagerRoles() {
  console.log('\n╔═══════════════════════════════════════════════════════════════════╗');
  console.log('║         FIX ACCOUNT MANAGER ROLES                                 ║');
  console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

  // Get all unique account manager IDs from trial_organizations
  const { data: orgs, error: orgsError } = await supabase
    .from('trial_organizations')
    .select('account_manager')
    .not('account_manager', 'is', null);

  if (orgsError) {
    console.error('❌ Error fetching organizations:', orgsError);
    return;
  }

  const accountManagerIds = [...new Set(orgs.map(org => org.account_manager))];
  console.log(`Found ${accountManagerIds.length} unique account managers\n`);

  // Get current role for these users
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, full_name, email, role')
    .in('id', accountManagerIds);

  if (usersError) {
    console.error('❌ Error fetching users:', usersError);
    return;
  }

  console.log('Current roles:\n');
  console.log('─'.repeat(70));
  users.forEach(user => {
    const orgsCount = orgs.filter(o => o.account_manager === user.id).length;
    console.log(`${user.full_name || user.email}: role="${user.role}" (managing ${orgsCount} orgs)`);
  });

  const usersToUpdate = users.filter(u => u.role !== 'account_manager');

  if (usersToUpdate.length === 0) {
    console.log('\n✅ All account managers already have correct role!\n');
    return;
  }

  console.log(`\n⚠️  Found ${usersToUpdate.length} users to update:\n`);
  usersToUpdate.forEach(user => {
    console.log(`   • ${user.full_name || user.email}: "${user.role}" → "account_manager"`);
  });

  // Ask for confirmation
  console.log('\n' + '═'.repeat(70));
  console.log('⚠️  WARNING: This will update the role for the users listed above.');
  console.log('═'.repeat(70));
  console.log('\nTo proceed, set CONFIRM=true environment variable and run again:');
  console.log('   CONFIRM=true node scripts/fix-account-manager-roles.js\n');

  if (process.env.CONFIRM !== 'true') {
    console.log('❌ Not confirmed. Exiting without making changes.\n');
    return;
  }

  console.log('✅ Confirmed. Updating roles...\n');

  // Update each user
  let successCount = 0;
  let failCount = 0;

  for (const user of usersToUpdate) {
    const { error } = await supabase
      .from('users')
      .update({ role: 'account_manager' })
      .eq('id', user.id);

    if (error) {
      console.log(`❌ Failed to update ${user.full_name || user.email}: ${error.message}`);
      failCount++;
    } else {
      console.log(`✅ Updated ${user.full_name || user.email}: viewer → account_manager`);
      successCount++;
    }
  }

  console.log('\n' + '═'.repeat(70));
  console.log('SUMMARY:');
  console.log('═'.repeat(70));
  console.log(`✅ Successfully updated: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`📊 Total: ${usersToUpdate.length}\n`);

  if (successCount > 0) {
    console.log('✅ Role updates complete!');
    console.log('\n📋 Next steps:');
    console.log('   1. Test login as an account manager');
    console.log('   2. Verify they see only their assigned trial orgs');
    console.log('   3. Verify they cannot see other AMs\' orgs');
    console.log('   4. Update ACCESS_CONTROL_ISSUES.md with results\n');
  }
}

fixAccountManagerRoles().catch(console.error);
