import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function runMigration() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log('Running migration: Remove DataViz and mark Synapse buyers\n');

  // 1. Delete DataViz Solutions
  console.log('1. Deleting DataViz Solutions...');
  const { error: deleteError, count: deleteCount } = await supabase
    .from('trial_organizations')
    .delete()
    .eq('org_name', 'DataViz Solutions');
  
  if (deleteError) {
    console.error('   Error:', deleteError.message);
  } else {
    console.log('   Done. Deleted records.');
  }

  // 2. Update Salic
  console.log('\n2. Marking Salic as Synapse buyer...');
  const { data: salicData, error: salicError } = await supabase
    .from('trial_organizations')
    .update({
      notes: '[SYNAPSE BUYER] This organization purchased Synapse, not myRA. No commercial gain for myRA pipeline.',
      org_lifecycle_stage: 'lost'
    })
    .eq('org_name', 'Salic')
    .select('org_name');
  
  if (salicError) {
    console.error('   Error:', salicError.message);
  } else if (salicData && salicData.length > 0) {
    console.log('   Done. Updated:', salicData.map(o => o.org_name).join(', '));
  } else {
    console.log('   No matching record found for "Salic"');
  }

  // 3. Update Hausmann Aromatic Group
  console.log('\n3. Marking Hausmann Aromatic Group as Synapse buyer...');
  const { data: hausmannData, error: hausmannError } = await supabase
    .from('trial_organizations')
    .update({
      notes: '[SYNAPSE BUYER] This organization purchased Synapse, not myRA. No commercial gain for myRA pipeline.',
      org_lifecycle_stage: 'lost'
    })
    .eq('org_name', 'Hausmann Aromatic Group')
    .select('org_name');
  
  if (hausmannError) {
    console.error('   Error:', hausmannError.message);
  } else if (hausmannData && hausmannData.length > 0) {
    console.log('   Done. Updated:', hausmannData.map(o => o.org_name).join(', '));
  } else {
    console.log('   No matching record found for "Hausmann Aromatic Group"');
  }

  console.log('\nMigration complete!');
}

runMigration().catch(console.error);
