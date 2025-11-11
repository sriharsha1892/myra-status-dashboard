import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function addSalesPOCColumn() {
  console.log('📋 Adding salesPOC column to trial_organizations table...\n');

  // Add salesPOC column (TEXT, nullable)
  const { error: columnError } = await supabase.rpc('exec_sql', {
    sql: `
      ALTER TABLE trial_organizations
      ADD COLUMN IF NOT EXISTS "salesPOC" TEXT;
    `
  });

  if (columnError) {
    console.log('⚠️  Could not use RPC, trying direct SQL...');
    console.log('   Please run this SQL manually in Supabase SQL Editor:\n');
    console.log('   ALTER TABLE trial_organizations ADD COLUMN IF NOT EXISTS "salesPOC" TEXT;\n');

    // Even if column doesn't exist via RPC, let's try updating anyway
  } else {
    console.log('✅ salesPOC column added successfully\n');
  }

  // Get account managers
  const { data: managers } = await supabase.auth.admin.listUsers();
  const sudeshana = managers.users.find((u: any) => u.email === 'sudeshana@mordorintelligence.com');

  if (!sudeshana) {
    console.log('❌ Could not find Sudeshana');
    return;
  }

  // Update Unit Consulting with salesPOC
  console.log('📝 Updating salesPOC information...\n');

  const { error: unitError } = await supabase
    .from('trial_organizations')
    .update({
      salesPOC: 'Prachi Sharma',
      updated_at: new Date().toISOString()
    })
    .eq('org_name', 'Unit Consulting');

  if (unitError) {
    console.log('⚠️  Could not update Unit Consulting salesPOC:', unitError.message);
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
    console.log('⚠️  Could not update GCC Makers:', gccError.message);
  } else {
    console.log('✅ GCC Makers → Account Manager: Sudeshana Jain, salesPOC: Radhika');
  }

  console.log('');
  console.log('🎉 All assignments complete!');
}

addSalesPOCColumn();
