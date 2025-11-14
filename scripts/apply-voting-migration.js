#!/usr/bin/env node

/**
 * Script to apply the comprehensive voting system migration to Supabase
 * Run with: node scripts/apply-voting-migration.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mkkhwiyolmowomojvtel.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ra2h3aXlvbG1vd29tb2p2dGVsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjA5MjI4MywiZXhwIjoyMDc3NjY4MjgzfQ.pI6BFTzH_Lo7ST9T7Gw6rAMtf4hd21HP_4Jbo4ng5R4';

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigration() {
  try {
    console.log('🚀 Applying comprehensive voting system migration...\n');

    // Read migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/20250114_voting_system_complete.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration file loaded');
    console.log('📊 Features being added:');
    console.log('   ✓ Feature request voting with comments');
    console.log('   ✓ Roadmap item voting with comments');
    console.log('   ✓ Enhanced reactions (helpful, solved)');
    console.log('   ✓ Vote notifications');
    console.log('   ✓ Milestone notifications\n');

    console.log('⚠️  IMPORTANT: This migration should be applied via Supabase Dashboard');
    console.log('   for production environments.\n');

    console.log('📋 Next Steps:');
    console.log('1. Go to Supabase Dashboard: https://supabase.com/dashboard');
    console.log('2. Select your project: mkkhwiyolmowomojvtel');
    console.log('3. Navigate to SQL Editor');
    console.log('4. Paste and execute the migration SQL');
    console.log('5. Migration file location: supabase/migrations/20250114_voting_system_complete.sql\n');

    // Test database connection
    const { data, error } = await supabase
      .from('feature_requests')
      .select('id')
      .limit(1);

    if (error) {
      console.error('❌ Database connection test failed:', error.message);
      return;
    }

    console.log('✅ Database connection successful');
    console.log('✅ Migration file ready to be applied\n');

    console.log('🎯 Once applied, the voting system will be fully functional:');
    console.log('   • Users can vote on feature requests with comments');
    console.log('   • Users can vote on roadmap items with comments');
    console.log('   • Enhanced reactions available in resources');
    console.log('   • Vote notifications will be sent automatically');
    console.log('   • Milestone notifications at 10, 25, 50, 100 votes');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
applyMigration();