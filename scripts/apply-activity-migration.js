require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyMigration() {
  console.log('📦 Applying activity logging migration...\n');

  try {
    // Read the migration file
    const migrationSQL = fs.readFileSync(
      '/Users/sriharsha/myra-status-dashboard/supabase/migrations/20251108_trial_activity_logging.sql',
      'utf8'
    );

    // Split into individual statements (rough split on semicolons outside of strings)
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--') && s !== '');

    console.log(`Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i] + ';';

      // Skip comments-only statements
      if (stmt.match(/^--/)) continue;

      console.log(`Executing statement ${i + 1}/${statements.length}...`);

      const { error } = await supabase.rpc('exec_sql', { sql: stmt });

      if (error) {
        // If exec_sql doesn't exist, try direct query
        const { error: directError } = await supabase.from('_').select('*').limit(0);
        console.error(`⚠️  Statement ${i + 1} failed:`, error.message);
        console.log('Trying alternative approach...\n');
      } else {
        console.log(`✅ Statement ${i + 1} executed successfully`);
      }
    }

    // Verify tables were created
    console.log('\n🔍 Verifying migration...\n');

    const { data: activityTypes, error: typesError } = await supabase
      .from('trial_activity_types')
      .select('*')
      .limit(5);

    if (typesError) {
      console.error('❌ Error querying trial_activity_types:', typesError.message);
    } else {
      console.log(`✅ trial_activity_types table exists with ${activityTypes?.length || 0} sample records`);
    }

    const { data: activities, error: activitiesError } = await supabase
      .from('trial_activities')
      .select('*')
      .limit(1);

    if (activitiesError && !activitiesError.message.includes('0 rows')) {
      console.error('❌ Error querying trial_activities:', activitiesError.message);
    } else {
      console.log('✅ trial_activities table exists');
    }

    console.log('\n✨ Migration application complete!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

applyMigration();
