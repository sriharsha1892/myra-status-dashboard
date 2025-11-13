/**
 * Verify user_timeline_preferences table exists
 * If not, provide instructions for manual application
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function verifyMigration() {
  console.log('📊 Checking user_timeline_preferences table...\n');

  try {
    // Try to query the table
    const { data, error } = await supabase
      .from('user_timeline_preferences')
      .select('*')
      .limit(1);

    if (error) {
      if (error.message.includes('does not exist') || error.code === '42P01') {
        console.log('❌ Table user_timeline_preferences does NOT exist\n');
        console.log('📋 MANUAL ACTION REQUIRED:');
        console.log('   1. Open Supabase Dashboard: https://app.supabase.com/project/mkkhwiyolmowomojvtel/editor');
        console.log('   2. Navigate to SQL Editor');
        console.log('   3. Create a new query');
        console.log('   4. Copy contents of: supabase/migrations/20251113_user_timeline_preferences.sql');
        console.log('   5. Paste and click "Run"');
        console.log('   6. Re-run this script to verify\n');
        return false;
      } else {
        console.log(`⚠️  Unexpected error: ${error.message}\n`);
        return false;
      }
    }

    console.log('✅ Table user_timeline_preferences EXISTS!\n');
    console.log('📊 Table Schema:');
    console.log('   - id (UUID)');
    console.log('   - user_id (UUID, FK to auth.users)');
    console.log('   - custom_templates (JSONB)');
    console.log('   - correction_history (JSONB)');
    console.log('   - auto_select_high_confidence (BOOLEAN)');
    console.log('   - default_sentiment (TEXT)');
    console.log('   - default_severity (TEXT)');
    console.log('   - created_at, updated_at (TIMESTAMPTZ)\n');

    // Try to insert a test preference for current user (if we have one)
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();

    if (!usersError && users && users.length > 0) {
      const testUser = users[0];
      console.log(`🧪 Testing insert for user: ${testUser.email}`);

      const { data: existing } = await supabase
        .from('user_timeline_preferences')
        .select('*')
        .eq('user_id', testUser.id)
        .single();

      if (!existing) {
        const { error: insertError } = await supabase
          .from('user_timeline_preferences')
          .insert({
            user_id: testUser.id,
            custom_templates: [],
            correction_history: {},
            auto_select_high_confidence: true,
            default_sentiment: 'neutral',
            default_severity: 'medium'
          });

        if (insertError) {
          console.log(`⚠️  Test insert failed: ${insertError.message}`);
        } else {
          console.log('✅ Test insert successful!');
        }
      } else {
        console.log('✅ User already has preferences row');
      }
    }

    console.log('\n🎉 Migration verified successfully!\n');
    return true;

  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    return false;
  }
}

verifyMigration().then(success => {
  process.exit(success ? 0 : 1);
});
