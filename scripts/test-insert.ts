import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function test() {
  // Check existing orgs that have null account_manager_id
  const { data: existing } = await supabase
    .from('trial_organizations')
    .select('org_id, org_name, account_manager_id')
    .is('account_manager_id', null)
    .limit(5);

  console.log('Existing orgs with null account_manager_id:', existing?.length || 0);

  // Test insert without account_manager_id field at all
  const { data, error } = await supabase.from('trial_organizations').insert({
    org_name: 'TEST_DELETE_ME_123'
  }).select();

  console.log('Insert result:', error?.message || 'SUCCESS', data);

  // Clean up
  if (!error) {
    await supabase.from('trial_organizations').delete().eq('org_name', 'TEST_DELETE_ME_123');
    console.log('Cleaned up test record');
  }
}

test();
