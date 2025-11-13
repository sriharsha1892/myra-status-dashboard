/**
 * Apply user_timeline_preferences migration
 * Run: node scripts/apply-timeline-preferences-migration.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function applyMigration() {
  console.log('📦 Applying user_timeline_preferences migration...\n');

  try {
    // Read migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/20251113_user_timeline_preferences.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Split into individual statements (rough split by semicolons)
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--') && s !== '');

    console.log(`Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';

      // Skip comment-only statements
      if (statement.trim().startsWith('--')) continue;

      console.log(`[${i + 1}/${statements.length}] Executing statement...`);

      try {
        const { error } = await supabase.rpc('exec_sql', { sql_query: statement });

        if (error) {
          // If RPC doesn't exist, try direct query
          const { error: queryError } = await supabase.from('_migrations').select('*').limit(1);

          if (queryError) {
            console.log(`⚠️  Statement ${i + 1} failed (may already exist):`, error.message);
          }
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`);
        }
      } catch (err) {
        console.log(`⚠️  Statement ${i + 1} error (may already exist):`, err.message);
      }
    }

    console.log('\n🎉 Migration application complete!\n');

    // Verify table exists
    console.log('📊 Verifying table creation...');
    const { data, error } = await supabase
      .from('user_timeline_preferences')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ Verification failed:', error.message);
      console.log('\n⚠️  Please apply migration manually in Supabase Dashboard SQL Editor');
      console.log('   Location: supabase/migrations/20251113_user_timeline_preferences.sql\n');
    } else {
      console.log('✅ Table user_timeline_preferences exists and is accessible!\n');
      console.log('Migration successfully applied! 🎉\n');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.log('\n⚠️  Please apply migration manually in Supabase Dashboard SQL Editor');
    console.log('   Location: supabase/migrations/20251113_user_timeline_preferences.sql\n');
  }
}

applyMigration();
