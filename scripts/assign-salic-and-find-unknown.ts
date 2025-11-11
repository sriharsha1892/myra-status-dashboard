import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function assignSALICAndFindUnknown() {
  // Get Satish Boini's UUID
  const { data: managers } = await supabase.auth.admin.listUsers();
  const satish = managers.users.find((u: any) => u.email === 'satish.boini@mordorintelligence.com');

  if (!satish) {
    console.log('❌ Could not find Satish Boini');
    return;
  }

  console.log('✅ Found Satish Boini: ' + satish.id);

  // Assign SALIC to Satish
  const { error } = await supabase
    .from('trial_organizations')
    .update({ account_manager: satish.id, updated_at: new Date().toISOString() })
    .eq('org_name', 'SALIC');

  if (error) {
    console.log('❌ Error assigning SALIC:', error.message);
  } else {
    console.log('✅ SALIC assigned to Satish Boini\n');
  }

  // Find the Unknown organizations
  const { data: orgs } = await supabase
    .from('trial_organizations')
    .select('org_name, account_manager')
    .not('account_manager', 'is', null);

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

  const validUUIDs = new Set(accountManagers.map((am: any) => am.id));

  console.log('🔍 Investigating "Unknown" Organizations:\n');
  const unknownOrgs = orgs!.filter(org => !validUUIDs.has(org.account_manager));

  if (unknownOrgs.length > 0) {
    unknownOrgs.forEach(org => {
      console.log('  ❓ ' + org.org_name);
      console.log('     UUID: ' + org.account_manager);
      console.log('     Status: This UUID does not match any current Account Manager or Admin');
      console.log('');
    });
    console.log('💡 These organizations have invalid/old account manager UUIDs.');
    console.log('   They need to be reassigned via bulk-edit.\n');
  } else {
    console.log('  ✅ No unknown organizations found!\n');
  }
}

assignSALICAndFindUnknown();
