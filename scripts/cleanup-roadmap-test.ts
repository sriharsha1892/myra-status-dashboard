import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function cleanupSeedData() {
  console.log('🧹 Cleaning up roadmap test data...\n');

  // Find test data by looking for items with [TEST] marker in title
  console.log('Finding test roadmap items...');
  const { data: testItems } = await supabase
    .from('org_product_roadmap')
    .select('org_id')
    .or('title.ilike.%[TEST]%,title.ilike.%Test%,title.ilike.%Implement Advanced Search%')
    .limit(1)
    .single();

  if (!testItems) {
    console.log('⚠️  No test data found');
    return;
  }

  const testOrgId = testItems.org_id;
  console.log(`Found test data for org: ${testOrgId}\n`);

  // Delete in reverse order of dependencies

  // 1. Delete notes
  console.log('1. Deleting notes...');
  const { error: notesError } = await supabase
    .from('roadmap_notes')
    .delete()
    .eq('org_id', testOrgId);
  if (!notesError) console.log('✅ Notes deleted');
  else console.log('⚠️  Notes:', notesError.message);

  // 2. Delete owner assignments
  console.log('2. Deleting owner assignments...');
  const { error: ownersError } = await supabase
    .from('roadmap_owner_assignments')
    .delete()
    .eq('org_id', testOrgId);
  if (!ownersError) console.log('✅ Owner assignments deleted');
  else console.log('⚠️  Owners:', ownersError.message);

  // 3. Delete roadmap items
  console.log('3. Deleting roadmap items...');
  const { error: itemsError } = await supabase
    .from('org_product_roadmap')
    .delete()
    .eq('org_id', testOrgId);
  if (!itemsError) console.log('✅ Roadmap items deleted');
  else console.log('⚠️  Items:', itemsError.message);

  // 4. Delete milestones
  console.log('4. Deleting milestones...');
  const { error: milestonesError } = await supabase
    .from('roadmap_milestones')
    .delete()
    .eq('org_id', testOrgId);
  if (!milestonesError) console.log('✅ Milestones deleted');
  else console.log('⚠️  Milestones:', milestonesError.message);

  // 5. Delete labels
  console.log('5. Deleting labels...');
  const { error: labelsError } = await supabase
    .from('roadmap_labels')
    .delete()
    .eq('org_id', testOrgId);
  if (!labelsError) console.log('✅ Labels deleted');
  else console.log('⚠️  Labels:', labelsError.message);

  // Note: NOT deleting the organization since we used an existing one
  console.log('6. Organization kept (was using existing org)');

  console.log('\n✅ Cleanup complete!');
}

cleanupSeedData().catch(console.error);
