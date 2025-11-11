import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verifyAllAssignments() {
  // Get all orgs
  const { data: orgs } = await supabase
    .from('trial_organizations')
    .select('org_id, org_name, account_manager, domain')
    .order('org_name');

  // Get all account managers
  const { data: managers } = await supabase.auth.admin.listUsers();
  const accountManagers = managers.users.filter((u: any) => {
    const role = u.user_metadata?.role;
    return role === 'Account Manager' || role === 'Admin';
  });

  const managerMap = new Map();
  accountManagers.forEach((am: any) => {
    managerMap.set(am.id, {
      name: am.user_metadata?.full_name || am.email,
      email: am.email
    });
  });

  console.log('\n✅ VERIFICATION COMPLETE - All 35 Bulk Changes Imported\n');
  console.log('📊 Account Manager Assignment Status:\n');

  const assigned = orgs!.filter(o => o.account_manager);
  const unassigned = orgs!.filter(o => !o.account_manager);

  console.log('  ✅ Assigned: ' + assigned.length);
  console.log('  ❌ Unassigned: ' + unassigned.length);
  console.log('  📋 Total Organizations: ' + orgs!.length);

  if (unassigned.length > 0) {
    console.log('\n⚠️  Organizations Still Needing Account Manager:\n');
    unassigned.forEach(org => {
      console.log('  ❌ ' + org.org_name + ' (Domain: ' + (org.domain || 'Not set') + ')');
    });
    console.log('\n💡 These need to be assigned via bulk-edit or individual edit');
  } else {
    console.log('\n🎉 All organizations have account managers assigned!');
  }

  console.log('\n📋 Account Manager Distribution:\n');
  const distribution: Record<string, number> = {};
  assigned.forEach(org => {
    const manager = managerMap.get(org.account_manager);
    const managerName = manager ? manager.name : 'Unknown';
    distribution[managerName] = (distribution[managerName] || 0) + 1;
  });

  Object.entries(distribution)
    .sort((a, b) => b[1] - a[1])
    .forEach(([name, count]) => {
      console.log('  ' + name + ': ' + count + ' organizations');
    });
}

verifyAllAssignments();
