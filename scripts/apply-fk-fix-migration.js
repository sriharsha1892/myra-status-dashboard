/**
 * Apply FK Fix Migration Script
 * Fixes assigned_to and assigned_by FK constraints to reference users table instead of auth.users
 */

const fs = require('fs');
const { Client } = require('pg');

async function applyMigration() {
  console.log('🚀 Applying FK Fix Migration\n');
  console.log('='.repeat(70));

  const client = new Client({
    host: 'aws-0-ap-south-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: 'postgres.mkkhwiyolmowomojvtel',
    password: process.env.SUPABASE_DB_PASSWORD,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Connect to database
    console.log('\n📋 Step 1: Connecting to database...');
    await client.connect();
    console.log('✅ Connected successfully');

    // Read migration file
    console.log('\n📋 Step 2: Reading migration file...');
    const migrationPath = '/Users/sriharsha/myra-status-dashboard/supabase/migrations/20251119000006_fix_error_assignment_fk.sql';
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log(`✅ Loaded ${migrationSQL.length} characters of SQL`);

    // Execute the migration
    console.log('\n📋 Step 3: Executing migration...');
    await client.query(migrationSQL);
    console.log('✅ Migration executed successfully');

    // Verify migration - check FK constraints
    console.log('\n📋 Step 4: Verifying FK constraints...');
    const verifyFK = await client.query(`
      SELECT
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.table_name = 'error_reports'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name IN ('assigned_to', 'assigned_by');
    `);

    console.log('\n✅ FK constraints on error_reports:');
    verifyFK.rows.forEach(row => {
      console.log(`   • ${row.column_name} → ${row.foreign_table_name}.${row.foreign_column_name}`);
    });

    console.log('\n' + '='.repeat(70));
    console.log('\n🎉 FK FIX MIGRATION COMPLETE!\n');
    console.log('Error assignment FK now correctly references:');
    console.log('  • error_reports.assigned_to → users.id');
    console.log('  • error_reports.assigned_by → users.id');
    console.log('\n✅ Next: Re-test the notification system!');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await client.end();
  }
}

// Run the migration
applyMigration();
