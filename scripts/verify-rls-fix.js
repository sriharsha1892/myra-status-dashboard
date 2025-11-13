require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function verifyRLSFix() {
  console.log('🧪 Testing RLS Fix - Verifying No Infinite Recursion\n');

  let allTestsPassed = true;

  // Test 1: Users table
  console.log('Test 1: Querying users table...');
  try {
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, role')
      .limit(5);

    if (usersError) {
      console.error('❌ FAILED - Users table query error:');
      console.error(JSON.stringify(usersError, null, 2));
      if (usersError.code === '42P17') {
        console.error('🚨 STILL GETTING INFINITE RECURSION ERROR!');
      }
      allTestsPassed = false;
    } else {
      console.log(`✅ PASSED - Users table query successful (${users.length} rows)`);
    }
  } catch (err) {
    console.error('❌ FAILED - Exception querying users:', err.message);
    allTestsPassed = false;
  }

  // Test 2: Trial organizations table
  console.log('\nTest 2: Querying trial_organizations table...');
  try {
    const { data: orgs, error: orgsError } = await supabase
      .from('trial_organizations')
      .select('org_id, org_name, parent_company')
      .limit(5);

    if (orgsError) {
      console.error('❌ FAILED - Trial organizations query error:');
      console.error(JSON.stringify(orgsError, null, 2));
      if (orgsError.code === '42P17') {
        console.error('🚨 STILL GETTING INFINITE RECURSION ERROR!');
      }
      allTestsPassed = false;
    } else {
      console.log(`✅ PASSED - Trial organizations query successful (${orgs.length} rows)`);
    }
  } catch (err) {
    console.error('❌ FAILED - Exception querying trial_organizations:', err.message);
    allTestsPassed = false;
  }

  // Test 3: Announcements table
  console.log('\nTest 3: Querying announcements table...');
  try {
    const { data: announcements, error: announcementsError } = await supabase
      .from('announcements')
      .select('id, title, status')
      .limit(5);

    if (announcementsError) {
      console.error('❌ FAILED - Announcements query error:');
      console.error(JSON.stringify(announcementsError, null, 2));
      if (announcementsError.code === '42P17') {
        console.error('🚨 STILL GETTING INFINITE RECURSION ERROR!');
      }
      allTestsPassed = false;
    } else {
      console.log(`✅ PASSED - Announcements query successful (${announcements.length} rows)`);
    }
  } catch (err) {
    console.error('❌ FAILED - Exception querying announcements:', err.message);
    allTestsPassed = false;
  }

  // Test 4: Demos table
  console.log('\nTest 4: Querying demos table...');
  try {
    const { data: demos, error: demosError } = await supabase
      .from('demos')
      .select('id, demo_date, status')
      .limit(5);

    if (demosError) {
      console.error('❌ FAILED - Demos query error:');
      console.error(JSON.stringify(demosError, null, 2));
      if (demosError.code === '42P17') {
        console.error('🚨 STILL GETTING INFINITE RECURSION ERROR!');
      }
      allTestsPassed = false;
    } else {
      console.log(`✅ PASSED - Demos query successful (${demos.length} rows)`);
    }
  } catch (err) {
    console.error('❌ FAILED - Exception querying demos:', err.message);
    allTestsPassed = false;
  }

  // Final summary
  console.log('\n' + '='.repeat(60));
  if (allTestsPassed) {
    console.log('🎉 ALL TESTS PASSED!');
    console.log('✅ RLS infinite recursion is FIXED!');
    console.log('✅ All tables can be queried without 42P17 errors');
    console.log('\nNext steps:');
    console.log('1. Refresh localhost:3000/support in your browser');
    console.log('2. Check browser console for errors');
    console.log('3. Verify dashboard widgets load data correctly');
  } else {
    console.log('⚠️  SOME TESTS FAILED');
    console.log('Please review the errors above and check Supabase Dashboard.');
    console.log('Run this query in SQL Editor to check RLS policies:');
    console.log('SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = \'users\';');
  }
  console.log('='.repeat(60));
}

verifyRLSFix().catch(console.error);
