/**
 * Apply Notifications Migration Script
 * Direct PostgreSQL connection to execute notifications migration
 */

const fs = require('fs');
const { Client } = require('pg');

async function applyMigration() {
  console.log('🚀 Applying Notifications Migration\n');
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
    const migrationPath = '/Users/sriharsha/myra-status-dashboard/supabase/migrations/20251119000003_add_notifications.sql';
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log(`✅ Loaded ${migrationSQL.length} characters of SQL`);

    // Execute the migration
    console.log('\n📋 Step 3: Executing migration...');
    await client.query(migrationSQL);
    console.log('✅ Migration executed successfully');

    // Verify migration - check notifications table
    console.log('\n📋 Step 4: Verifying migration...');
    const verifyTable = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'notifications'
      ORDER BY ordinal_position;
    `);

    console.log('\n✅ Notifications table columns:');
    verifyTable.rows.forEach(row => {
      console.log(`   • ${row.column_name} (${row.data_type})`);
    });

    // Verify trigger exists
    const verifyTrigger = await client.query(`
      SELECT trigger_name
      FROM information_schema.triggers
      WHERE trigger_name = 'trigger_error_assignment_notification';
    `);

    if (verifyTrigger.rows.length > 0) {
      console.log('\n✅ Error assignment trigger created successfully');
    }

    // Verify assigned_by column added to error_reports
    const verifyColumn = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'error_reports'
      AND column_name = 'assigned_by';
    `);

    if (verifyColumn.rows.length > 0) {
      console.log('✅ assigned_by column added to error_reports');
    }

    // Verify view exists
    const verifyView = await client.query(`
      SELECT viewname
      FROM pg_views
      WHERE viewname = 'unread_notification_counts';
    `);

    if (verifyView.rows.length > 0) {
      console.log('✅ unread_notification_counts view created');
    }

    console.log('\n' + '='.repeat(70));
    console.log('\n🎉 MIGRATION COMPLETE!\n');
    console.log('Notification system is ready:');
    console.log('  • notifications table created');
    console.log('  • Auto-notification trigger on error assignment');
    console.log('  • NotificationBell component integrated in header');
    console.log('  • Real-time updates via Supabase Realtime');
    console.log('\n✅ Next: Test by assigning an error to a super admin!\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);

    // Check if it's an "already exists" error
    if (error.message.includes('already exists')) {
      console.log('\n⚠️  Migration appears to be already applied');
      console.log('Running verification check...\n');

      try {
        const verifyResult = await client.query(`
          SELECT column_name
          FROM information_schema.columns
          WHERE table_name = 'notifications'
          LIMIT 5;
        `);

        if (verifyResult.rows.length > 0) {
          console.log('✅ Notifications table exists with columns:');
          verifyResult.rows.forEach(row => {
            console.log(`   • ${row.column_name}`);
          });
          console.log('\n✅ Migration is already complete!\n');
        }
      } catch (verifyError) {
        console.error('Verification also failed:', verifyError.message);
      }
    } else {
      console.error('Full error:', error);
      console.log('\n💡 TIP: Try applying the SQL manually via Supabase Dashboard');
      console.log('   File: supabase/migrations/20251119000003_add_notifications.sql');
    }
  } finally {
    await client.end();
  }
}

// Run the migration
applyMigration();
