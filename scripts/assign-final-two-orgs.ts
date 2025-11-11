import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function assignFinalTwo() {
  // Get account managers
  const { data: managers } = await supabase.auth.admin.listUsers();

  const satish = managers.users.find((u: any) => u.email === 'satish.boini@mordorintelligence.com');
  const sudeshana = managers.users.find((u: any) => u.email === 'sudeshana@mordorintelligence.com');

  if (!satish || !sudeshana) {
    console.log('❌ Could not find required account managers');
    return;
  }

  console.log('✅ Found Satish Boini: ' + satish.id);
  console.log('✅ Found Sudeshana Jain: ' + sudeshana.id);
  console.log('');

  // Assign Unit Consulting to Satish Boini
  const { error: unitError } = await supabase
    .from('trial_organizations')
    .update({
      account_manager: satish.id,
      updated_at: new Date().toISOString()
    })
    .eq('org_name', 'Unit Consulting');

  if (unitError) {
    console.log('❌ Error assigning Unit Consulting:', unitError.message);
  } else {
    console.log('✅ Unit Consulting assigned to Satish Boini');
  }

  // Assign GCC Makers to Sudeshana Jain with Radhika as salesPOC
  const { error: gccError } = await supabase
    .from('trial_organizations')
    .update({
      account_manager: sudeshana.id,
      salesPOC: 'Radhika',
      updated_at: new Date().toISOString()
    })
    .eq('org_name', 'GCC Makers');

  if (gccError) {
    console.log('❌ Error assigning GCC Makers:', gccError.message);
  } else {
    console.log('✅ GCC Makers assigned to Sudeshana Jain (salesPOC: Radhika)');
  }

  console.log('');
  console.log('🎉 All organizations now have account managers assigned!');
  console.log('');

  // Verify final count
  const { data: orgs } = await supabase
    .from('trial_organizations')
    .select('org_id, account_manager');

  const assigned = orgs!.filter(o => o.account_manager);
  const unassigned = orgs!.filter(o => !o.account_manager);

  console.log('📊 Final Status:');
  console.log('  ✅ Assigned: ' + assigned.length);
  console.log('  ❌ Unassigned: ' + unassigned.length);
  console.log('  📋 Total: ' + orgs!.length);
}

assignFinalTwo();
