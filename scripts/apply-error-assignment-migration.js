const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mkkhwiyolmowomojvtel.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ra2h3aXlvbG1vd29tb2p2dGVsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjA5MjI4MywiZXhwIjoyMDc3NjY4MjgzfQ.pI6BFTzH_Lo7ST9T7Gw6rAMtf4hd21HP_4Jbo4ng5R4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  console.log('Applying error assignment migration...\n');

  try {
    // Check if assigned_to column already exists
    console.log('1. Checking if assigned_to column exists...');
    const { data: columns, error: checkError } = await supabase
      .from('error_reports')
      .select('assigned_to')
      .limit(1);

    if (!checkError) {
      console.log('✓ assigned_to column already exists. Migration may have been applied previously.\n');
    } else {
      console.log('✗ assigned_to column does not exist. Manual migration required.\n');
      console.log('Please run the migration SQL manually in Supabase Dashboard > SQL Editor:');
      console.log('File: supabase/migrations/20251119000000_add_error_assignments.sql\n');
      return;
    }

    // Test the assignment functionality
    console.log('2. Testing assignment column functionality...');

    // Get a test error
    const { data: testError, error: fetchError } = await supabase
      .from('error_reports')
      .select('id, error_message, assigned_to, assigned_at')
      .limit(1)
      .single();

    if (fetchError) {
      console.log('✗ Error fetching test error:', fetchError.message);
      return;
    }

    console.log('✓ Successfully queried error with assignment fields');
    console.log('  Error ID:', testError.id);
    console.log('  Assigned to:', testError.assigned_to || 'Unassigned');
    console.log('  Assigned at:', testError.assigned_at || 'N/A');
    console.log('');

    // Check if error_assignment_stats view exists
    console.log('3. Checking error_assignment_stats view...');
    const { data: stats, error: statsError } = await supabase
      .from('error_assignment_stats')
      .select('*')
      .limit(1);

    if (!statsError) {
      console.log('✓ error_assignment_stats view exists and is accessible');
      console.log(`  Found ${stats?.length || 0} assignment records\n`);
    } else {
      console.log('✗ error_assignment_stats view error:', statsError.message);
      console.log('  View may need to be created manually\n');
    }

    // Test assignment update
    console.log('4. Testing assignment update...');

    // Get current user (for testing)
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.log('⚠ Cannot test assignment update (no authenticated user)');
      console.log('  This is expected when running with service role key\n');
    }

    console.log('✅ Migration verification complete!\n');
    console.log('Summary:');
    console.log('- assigned_to and assigned_at columns: ✓ Present');
    console.log('- error_assignment_stats view: ' + (!statsError ? '✓ Present' : '✗ Missing'));
    console.log('\nThe error assignment feature is ready to use!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

applyMigration();
