require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTables() {
  console.log('🔍 Checking if activity logging tables exist...\n');

  // Check trial_activity_types
  const { data: activityTypes, error: typesError } = await supabase
    .from('trial_activity_types')
    .select('*')
    .limit(5);

  if (typesError) {
    console.log('❌ trial_activity_types table does NOT exist');
    console.log('   Error:', typesError.message);
    console.log('\n📋 You need to apply the migration manually:');
    console.log('   1. Go to Supabase Dashboard → SQL Editor');
    console.log('   2. Run the migration file: supabase/migrations/20251108_trial_activity_logging.sql');
  } else {
    console.log(`✅ trial_activity_types table exists with ${activityTypes?.length || 0} records`);
    if (activityTypes?.length > 0) {
      console.log('   Sample types:', activityTypes.map(t => t.name).join(', '));
    }
  }

  // Check trial_activities
  const { data: activities, error: activitiesError } = await supabase
    .from('trial_activities')
    .select('*')
    .limit(1);

  if (activitiesError && !activitiesError.message.includes('0 rows')) {
    console.log('\n❌ trial_activities table does NOT exist');
    console.log('   Error:', activitiesError.message);
  } else {
    console.log('\n✅ trial_activities table exists');
    console.log(`   Records: ${activities?.length || 0}`);
  }
}

checkTables();
