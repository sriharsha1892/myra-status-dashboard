import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function addSalesPOCColumnViaSQL() {
  console.log('📋 Adding salesPOC column...\n');

  // Try using raw SQL through Postgres connection
  const { data, error } = await supabase.rpc('exec_sql' as any, {
    query: 'ALTER TABLE trial_organizations ADD COLUMN IF NOT EXISTS "salesPOC" TEXT;'
  });

  if (error) {
    console.log('❌ Error:', error.message);
    console.log('\n📝 Please run this SQL manually in Supabase SQL Editor:');
    console.log('   https://supabase.com/dashboard/project/mkkhwiyolmowomojvtel/sql/new\n');
    console.log('   ALTER TABLE trial_organizations ADD COLUMN IF NOT EXISTS "salesPOC" TEXT;\n');
    console.log('After running the SQL, run this script again to update the salesPOC values.\n');
    return false;
  }

  console.log('✅ Column added successfully\n');
  return true;
}

async function updateSalesPOC() {
  console.log('📝 Updating salesPOC information...\n');

  // Get Sudeshana for GCC Makers
  const { data: managers } = await supabase.auth.admin.listUsers();
  const sudeshana = managers.users.find((u: any) => u.email === 'sudeshana@mordorintelligence.com');

  if (!sudeshana) {
    console.log('❌ Could not find Sudeshana');
    return;
  }

  // Update Unit Consulting with salesPOC
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

  // Update GCC Makers with account manager and salesPOC
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
  console.log('🎉 All assignments complete!');
}

async function main() {
  const columnAdded = await addSalesPOCColumnViaSQL();

  if (columnAdded) {
    await updateSalesPOC();
  }
}

main();
