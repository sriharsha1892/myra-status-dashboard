#!/usr/bin/env node
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkTrialOrgs() {
  console.log('\n🔍 Checking trial organizations...\n');

  try {
    const { data, error, count } = await supabase
      .from('trial_organizations')
      .select('org_id, org_name', { count: 'exact' })
      .limit(10);

    if (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }

    console.log(`📊 Total trial organizations: ${count || 0}\n`);

    if (data && data.length > 0) {
      console.log('Trial organizations:');
      data.forEach((org, index) => {
        console.log(`${index + 1}. ${org.org_name || 'Unnamed'} (${org.org_id})\n`);
      });
    } else {
      console.log('⚠️  No trial organizations found in the database.');
      console.log('\nYou need to create a trial organization first.');
      console.log('You can do this at: http://localhost:3000/support/trials');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkTrialOrgs();
