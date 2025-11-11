import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function updateSalesPOCValues() {
  console.log('📝 Updating salesPOC information...\n');

  // Get Sudeshana for GCC Makers
  const { data: managers } = await supabase.auth.admin.listUsers();
  const sudeshana = managers.users.find((u: any) => u.email === 'sudeshana@mordorintelligence.com');

  if (!sudeshana) {
    console.log('❌ Could not find Sudeshana');
    return;
  }

  console.log('✅ Found Sudeshana: ' + sudeshana.id + '\n');

  // Update Unit Consulting with salesPOC (Prachi Sharma)
  const { error: unitError } = await supabase
    .from('trial_organizations')
    .update({
      salesPOC: 'Prachi Sharma',
      updated_at: new Date().toISOString()
    })
    .eq('org_name', 'Unit Consulting');

  if (unitError) {
    console.log('❌ Could not update Unit Consulting:', unitError.message);
  } else {
    console.log('✅ Unit Consulting → salesPOC: Prachi Sharma');
  }

  // Update GCC Makers with account manager and salesPOC (Radhika)
  const { error: gccError } = await supabase
    .from('trial_organizations')
    .update({
      account_manager: sudeshana.id,
      salesPOC: 'Radhika',
      updated_at: new Date().toISOString()
    })
    .eq('org_name', 'GCC Makers');

  if (gccError) {
    console.log('❌ Could not update GCC Makers:', gccError.message);
  } else {
    console.log('✅ GCC Makers → Account Manager: Sudeshana Jain, salesPOC: Radhika');
  }

  console.log('');
  console.log('🎉 All salesPOC assignments complete!');
  console.log('');

  // Verify final state
  const { data: orgs } = await supabase
    .from('trial_organizations')
    .select('org_name, account_manager, salesPOC')
    .in('org_name', ['Unit Consulting', 'GCC Makers']);

  console.log('📊 Verification:');
  orgs?.forEach(org => {
    console.log('  ' + org.org_name + ':');
    console.log('    Account Manager: ' + (org.account_manager ? '✅ Assigned' : '❌ Not assigned'));
    console.log('    Sales POC: ' + (org.salesPOC || 'Not set'));
  });
}

updateSalesPOCValues();
