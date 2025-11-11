import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTrialOrgs() {
  console.log('Checking trial_organizations table...\n');

  const { data, error } = await supabase
    .from('trial_organizations')
    .select('org_id, org_name, org_domain')
    .limit(5);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Found', data?.length || 0, 'trial organizations:');
  data?.forEach(org => {
    console.log(`  - ${org.org_name} (${org.org_domain}) [${org.org_id}]`);
  });
}

checkTrialOrgs().catch(console.error);
