#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkUnassignedManagers() {
  console.log('Checking for trial orgs without account managers...\n');

  const { data: allOrgs, error: allError } = await supabase
    .from('trial_organizations')
    .select('org_id, org_name, account_manager, sales_poc, trial_start_date, trial_end_date')
    .order('org_name');

  if (allError) {
    console.error('Error:', allError);
    return;
  }

  console.log(`Total trial orgs: ${allOrgs.length}\n`);

  // Get all unique account manager IDs
  const managerIds = [...new Set(allOrgs
    .filter(org => org.account_manager && org.account_manager.trim() !== '')
    .map(org => org.account_manager))];

  // Fetch account manager names
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, full_name, email')
    .in('id', managerIds);

  if (usersError) {
    console.error('Error fetching user names:', usersError);
    return;
  }

  // Create a map of manager ID to name
  const managerNameMap = {};
  users.forEach(user => {
    managerNameMap[user.id] = user.full_name || user.email || user.id;
  });

  const unassigned = allOrgs.filter(org =>
    !org.account_manager || org.account_manager.trim() === ''
  );

  if (unassigned.length === 0) {
    console.log('✅ All trial orgs have account managers assigned!\n');
  } else {
    console.log(`⚠️  Found ${unassigned.length} trial orgs WITHOUT account managers:\n`);
    console.log('═'.repeat(100));

    unassigned.forEach((org, index) => {
      console.log(`${index + 1}. ${org.org_name}`);
      console.log(`   Org ID: ${org.org_id}`);
      console.log(`   Account Manager: ${org.account_manager || '(NONE)'}`);
      console.log(`   Sales POC: ${org.sales_poc || '(none)'}`);
      console.log(`   Trial: ${org.trial_start_date || 'N/A'} to ${org.trial_end_date || 'N/A'}`);
      console.log('─'.repeat(100));
    });
  }

  const assigned = allOrgs.filter(org =>
    org.account_manager && org.account_manager.trim() !== ''
  );

  console.log(`\n✅ ${assigned.length} orgs WITH account managers:\n`);

  const managerCounts = {};
  assigned.forEach(org => {
    const managerId = org.account_manager;
    const managerName = managerNameMap[managerId] || managerId;
    managerCounts[managerName] = {
      count: (managerCounts[managerName]?.count || 0) + 1,
      id: managerId
    };
  });

  Object.entries(managerCounts)
    .sort((a, b) => b[1].count - a[1].count)
    .forEach(([managerName, data]) => {
      console.log(`   ${managerName}: ${data.count} orgs (ID: ${data.id})`);
    });

  // Show detailed breakdown
  console.log('\n📊 Detailed Breakdown:\n');
  console.log('═'.repeat(100));

  Object.entries(managerCounts)
    .sort((a, b) => b[1].count - a[1].count)
    .forEach(([managerName, data]) => {
      console.log(`\n${managerName} (${data.count} orgs):`);
      const managerOrgs = assigned.filter(org => org.account_manager === data.id);
      managerOrgs.forEach(org => {
        console.log(`   • ${org.org_name}`);
      });
    });
}

checkUnassignedManagers().catch(console.error);
