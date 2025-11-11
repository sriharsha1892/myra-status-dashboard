import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const acmeOrgId = 'b5e03bbf-7173-4c8e-872f-6d463a022184';

async function cleanup() {
  console.log('Cleaning up test data for Acme Corp...\n');

  // Delete labels
  const { error: labelsError } = await supabase
    .from('roadmap_labels')
    .delete()
    .eq('org_id', acmeOrgId)
    .in('name', ['Feature', 'Bug Fix', 'Enhancement']);

  if (!labelsError) console.log('✅ Test labels deleted');
  else console.log('⚠️  Labels:', labelsError.message);

  // Delete milestone
  const { error: milestoneError } = await supabase
    .from('roadmap_milestones')
    .delete()
    .eq('org_id', acmeOrgId)
    .eq('name', 'Q1 2025 Release');

  if (!milestoneError) console.log('✅ Test milestone deleted');
  else console.log('⚠️  Milestone:', milestoneError.message);

  console.log('\n✅ Cleanup complete!');
}

cleanup().catch(console.error);
