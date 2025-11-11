import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const testOrgId = 'ca82ddef-927a-4838-a863-339e6e8dbfe3'; // BP-Castrol

async function cleanup() {
  console.log('🧹 Cleaning up test milestones...\n');

  // Delete test milestones
  const { error: milestonesError } = await supabase
    .from('roadmap_milestones')
    .delete()
    .eq('org_id', testOrgId)
    .eq('name', 'Q1 2025 Release');

  if (!milestonesError) console.log('✅ Test milestones deleted');
  else console.log('⚠️  Milestones:', milestonesError.message);

  console.log('\n✅ Cleanup complete!');
}

cleanup().catch(console.error);
