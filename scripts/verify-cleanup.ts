import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyCleanup() {
  console.log('🔍 Verifying database state after cleanup...\n');

  // Count roadmap items
  const { count: itemsCount, error: itemsError } = await supabase
    .from('org_product_roadmap')
    .select('*', { count: 'exact', head: true });

  // Count labels
  const { count: labelsCount, error: labelsError } = await supabase
    .from('roadmap_labels')
    .select('*', { count: 'exact', head: true });

  // Count milestones
  const { count: milestonesCount, error: milestonesError } = await supabase
    .from('roadmap_milestones')
    .select('*', { count: 'exact', head: true });

  // Count notes
  const { count: notesCount, error: notesError } = await supabase
    .from('roadmap_notes')
    .select('*', { count: 'exact', head: true });

  // Count owner assignments
  const { count: ownersCount, error: ownersError } = await supabase
    .from('roadmap_owner_assignments')
    .select('*', { count: 'exact', head: true });

  console.log('📊 Database State:');
  console.log(`   Roadmap Items: ${itemsCount ?? 0}`);
  console.log(`   Labels: ${labelsCount ?? 0}`);
  console.log(`   Milestones: ${milestonesCount ?? 0}`);
  console.log(`   Notes: ${notesCount ?? 0}`);
  console.log(`   Owner Assignments: ${ownersCount ?? 0}`);

  if (itemsError) console.log(`\n⚠️  Items Error: ${itemsError.message}`);
  if (labelsError) console.log(`\n⚠️  Labels Error: ${labelsError.message}`);
  if (milestonesError) console.log(`\n⚠️  Milestones Error: ${milestonesError.message}`);
  if (notesError) console.log(`\n⚠️  Notes Error: ${notesError.message}`);
  if (ownersError) console.log(`\n⚠️  Owners Error: ${ownersError.message}`);

  console.log('\n✅ Verification complete!');
}

verifyCleanup().catch(console.error);
