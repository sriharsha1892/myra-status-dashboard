import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verifyAllAccountManagers() {
  console.log('🔍 Comprehensive Account Manager Verification\n');
  console.log('='.repeat(80) + '\n');

  // Get all account managers
  const { data: managers } = await supabase.auth.admin.listUsers();
  const accountManagers = managers.users.filter((u: any) => {
    const role = u.user_metadata?.role;
    return role === 'Account Manager' || role === 'Admin';
  });

  // Create manager map
  const managerMap = new Map();
  accountManagers.forEach((am: any) => {
    managerMap.set(am.id, {
      name: am.user_metadata?.full_name || am.user_metadata?.name || am.email?.split('@')[0] || 'Unknown',
      email: am.email
    });
  });

  // Get all trial organizations
  const { data: orgs } = await supabase
    .from('trial_organizations')
    .select('org_name, account_manager, salesPOC, domain')
    .order('org_name');

  console.log('📋 All Trial Organizations (' + orgs!.length + ' total):\n');

  let assigned = 0;
  let unassigned = 0;

  orgs!.forEach((org, index) => {
    const num = (index + 1).toString().padStart(2, '0');

    if (org.account_manager) {
      assigned++;
      const manager = managerMap.get(org.account_manager);
      const managerName = manager ? manager.name : '❌ Unknown UUID';
      const status = manager ? '✅' : '❌';

      console.log(`${num}. ${status} ${org.org_name}`);
      console.log(`    Account Manager: ${managerName}`);
      if (org.salesPOC) {
        console.log(`    Sales POC: ${org.salesPOC}`);
      }
      if (org.domain) {
        console.log(`    Domain: ${org.domain}`);
      }
      console.log('');
    } else {
      unassigned++;
      console.log(`${num}. ❌ ${org.org_name}`);
      console.log(`    Account Manager: NOT ASSIGNED`);
      if (org.domain) {
        console.log(`    Domain: ${org.domain}`);
      }
      console.log('');
    }
  });

  console.log('='.repeat(80) + '\n');
  console.log('📊 Summary:\n');
  console.log('  ✅ Assigned: ' + assigned);
  console.log('  ❌ Unassigned: ' + unassigned);
  console.log('  📋 Total: ' + orgs!.length);
  console.log('');

  if (unassigned === 0) {
    console.log('🎉 SUCCESS! All trial organizations have account managers assigned!\n');
  } else {
    console.log('⚠️  WARNING: ' + unassigned + ' organizations still need account managers!\n');
  }

  // Show account manager distribution
  console.log('📊 Account Manager Distribution:\n');
  const distribution: Record<string, { count: number; orgs: string[] }> = {};

  orgs!.forEach(org => {
    if (org.account_manager) {
      const manager = managerMap.get(org.account_manager);
      const managerName = manager ? manager.name : 'Unknown';

      if (!distribution[managerName]) {
        distribution[managerName] = { count: 0, orgs: [] };
      }
      distribution[managerName].count++;
      distribution[managerName].orgs.push(org.org_name);
    }
  });

  Object.entries(distribution)
    .sort((a, b) => b[1].count - a[1].count)
    .forEach(([name, data]) => {
      console.log(`  ${name}: ${data.count} organizations`);
      data.orgs.forEach(orgName => {
        console.log(`    - ${orgName}`);
      });
      console.log('');
    });
}

verifyAllAccountManagers();
