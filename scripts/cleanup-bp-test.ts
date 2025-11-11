import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const testOrgId = 'ca82ddef-927a-4838-a863-339e6e8dbfe3'; // BP-Castrol

async function cleanup() {
  console.log('🧹 Cleaning up test data for BP-Castrol...\n');

  // Delete notes
  const { error: notesError } = await supabase
    .from('roadmap_notes')
    .delete()
    .eq('org_id', testOrgId);
  if (!notesError) console.log('✅ Notes deleted');
  else console.log('⚠️  Notes:', notesError.message);

  // Delete owner assignments
  const { error: ownersError } = await supabase
    .from('roadmap_owner_assignments')
    .delete()
    .eq('org_id', testOrgId);
  if (!ownersError) console.log('✅ Owner assignments deleted');
  else console.log('⚠️  Owners:', ownersError.message);

  // Delete roadmap items
  const { error: itemsError } = await supabase
    .from('org_product_roadmap')
    .delete()
    .eq('org_id', testOrgId);
  if (!itemsError) console.log('✅ Roadmap items deleted');
  else console.log('⚠️  Items:', itemsError.message);

  // Delete labels
  const { error: labelsError } = await supabase
    .from('roadmap_labels')
    .delete()
    .eq('org_id', testOrgId);
  if (!labelsError) console.log('✅ Labels deleted');
  else console.log('⚠️  Labels:', labelsError.message);

  console.log('\n✅ Cleanup complete!');
}

cleanup().catch(console.error);
