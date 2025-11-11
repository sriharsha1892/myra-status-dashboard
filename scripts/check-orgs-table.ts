import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkOrgs() {
  console.log('Checking organizations table...\n');

  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .limit(5);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Found', data?.length || 0, 'organizations:');
  if (data && data.length > 0) {
    console.log('Columns:', Object.keys(data[0]));
    data?.forEach(org => {
      console.log(`  - ${org.name} [${org.id}] - Status: ${org.status}`);
    });
  }
}

checkOrgs().catch(console.error);
