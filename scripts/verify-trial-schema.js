/**
 * Verify Trial Organization Schema
 * Queries Supabase to determine actual production schema
 * This will inform whether we need to fix schema or fix code
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifySchema() {
  console.log('\n🔍 Verifying Trial Organizations Schema\n');
  console.log('='.repeat(70));

  try {
    // Query for trial_organizations schema
    const { data: orgColumns, error: orgError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_name', 'trial_organizations')
      .order('ordinal_position');

    if (orgError) {
      // Try alternate query method
      const { data: sampleOrg } = await supabase
        .from('trial_organizations')
        .select('*')
        .limit(1)
        .single();

      if (sampleOrg) {
        console.log('\n📋 trial_organizations columns (from sample data):');
        console.log(Object.keys(sampleOrg).sort().join(', '));
      }
    } else if (orgColumns) {
      console.log('\n📋 trial_organizations columns:');
      orgColumns.forEach(col => {
        console.log(`  - ${col.column_name.padEnd(30)} ${col.data_type.padEnd(25)} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
      });
    }

    // Query for trial_users schema
    const { data: userColumns, error: userError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_name', 'trial_users')
      .order('ordinal_position');

    if (userError) {
      // Try alternate query method
      const { data: sampleUser } = await supabase
        .from('trial_users')
        .select('*')
        .limit(1)
        .single();

      if (sampleUser) {
        console.log('\n📋 trial_users columns (from sample data):');
        console.log(Object.keys(sampleUser).sort().join(', '));
      }
    } else if (userColumns) {
      console.log('\n📋 trial_users columns:');
      userColumns.forEach(col => {
        console.log(`  - ${col.column_name.padEnd(30)} ${col.data_type.padEnd(25)} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
      });
    }

    // Check specific critical fields
    console.log('\n' + '='.repeat(70));
    console.log('\n🎯 CRITICAL FIELD VERIFICATION:\n');

    // Check domain vs org_domain
    const { data: testDomain, error: domainError } = await supabase
      .from('trial_organizations')
      .select('domain')
      .limit(1);

    const { data: testOrgDomain, error: orgDomainError } = await supabase
      .from('trial_organizations')
      .select('org_domain')
      .limit(1);

    if (!domainError) {
      console.log('✅ Column "domain" EXISTS');
    } else if (domainError.message.includes('column')) {
      console.log('❌ Column "domain" DOES NOT EXIST');
    }

    if (!orgDomainError) {
      console.log('✅ Column "org_domain" EXISTS');
    } else if (orgDomainError.message.includes('column')) {
      console.log('❌ Column "org_domain" DOES NOT EXIST');
    }

    // Check trial date fields
    const { data: testDates, error: datesError } = await supabase
      .from('trial_organizations')
      .select('trial_start_date, trial_end_date')
      .limit(1)
      .single();

    if (!datesError && testDates) {
      console.log('✅ Columns "trial_start_date" and "trial_end_date" EXIST');
      if (testDates.trial_start_date) {
        console.log(`   Sample value: ${testDates.trial_start_date} (type: ${typeof testDates.trial_start_date})`);
      }
    }

    // Check account_manager fields
    const { data: testAM, error: amError } = await supabase
      .from('trial_organizations')
      .select('account_manager, account_manager_id')
      .limit(1);

    if (!amError) {
      console.log('✅ Checked account_manager fields:');
      if (testAM && testAM[0]) {
        console.log(`   account_manager: ${testAM[0].account_manager !== undefined ? 'EXISTS' : 'DOES NOT EXIST'}`);
        console.log(`   account_manager_id: ${testAM[0].account_manager_id !== undefined ? 'EXISTS' : 'DOES NOT EXIST'}`);
      }
    }

    // Check parent_company field
    const { data: testPC, error: pcError } = await supabase
      .from('trial_organizations')
      .select('parent_company, parent_organization')
      .limit(1)
      .single();

    if (!pcError && testPC) {
      console.log('✅ Parent company fields:');
      console.log(`   parent_company: ${testPC.parent_company !== undefined ? 'EXISTS' : 'DOES NOT EXIST'}`);
      console.log(`   parent_organization: ${testPC.parent_organization !== undefined ? 'EXISTS' : 'DOES NOT EXIST'}`);
    }

    // Check trial_users account_manager field
    const { data: testUserAM, error: userAMError } = await supabase
      .from('trial_users')
      .select('account_manager')
      .limit(1)
      .single();

    if (!userAMError && testUserAM) {
      console.log('✅ trial_users.account_manager EXISTS');
      if (testUserAM.account_manager) {
        console.log(`   Sample value: ${testUserAM.account_manager}`);
        // Check if it's a UUID or text
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(testUserAM.account_manager);
        console.log(`   Appears to be: ${isUUID ? 'UUID' : 'TEXT/NAME'}`);
      }
    }

    // Check for indexes
    const { data: indexes, error: indexError } = await supabase.rpc('get_indexes', {
      table_name: 'trial_organizations'
    });

    if (!indexError && indexes) {
      console.log('\n📊 Indexes on trial_organizations:');
      indexes.forEach(idx => console.log(`  - ${idx.indexname}`));
    }

    console.log('\n' + '='.repeat(70));
    console.log('\n✅ Schema verification complete\n');

  } catch (error) {
    console.error('❌ Error verifying schema:', error.message);
    console.error(error);
  }
}

verifySchema();
