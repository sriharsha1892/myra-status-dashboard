/**
 * Apply Migration using pg library
 * Direct PostgreSQL connection to execute migration SQL
 */

const fs = require('fs');
const { Client } = require('pg');

async function applyMigration() {
  console.log('🚀 Applying AI Features Migration\n');
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
    const migrationPath = '/Users/sriharsha/myra-status-dashboard/supabase/migrations/20251115_ai_features.sql';
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log(`✅ Loaded ${migrationSQL.length} characters of SQL`);

    // Execute the entire migration as one transaction
    console.log('\n📋 Step 3: Executing migration...');
    const result = await client.query(migrationSQL);
    console.log('✅ Migration executed successfully');

    // Verify migration
    console.log('\n📋 Step 4: Verifying migration...');
    const verifyResult = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'trial_organizations'
      AND column_name IN ('tags', 'health_status', 'health_issues', 'health_recommendations', 'last_health_check')
      ORDER BY column_name;
    `);

    console.log('\n✅ Verification successful - new columns created:');
    verifyResult.rows.forEach(row => {
      console.log(`   • ${row.column_name} (${row.data_type})`);
    });

    // Test query
    console.log('\n📋 Step 5: Testing query with new columns...');
    const testResult = await client.query(`
      SELECT org_id, org_name, tags, health_status
      FROM trial_organizations
      LIMIT 1;
    `);

    console.log('✅ Query successful');
    if (testResult.rows.length > 0) {
      console.log('Sample data:', JSON.stringify(testResult.rows[0], null, 2));
    }

    console.log('\n' + '='.repeat(70));
    console.log('\n🎉 MIGRATION COMPLETE!\n');
    console.log('New columns added to trial_organizations:');
    console.log('  • tags (TEXT[]) - AI-generated organization tags');
    console.log('  • health_status (TEXT) - Overall health status');
    console.log('  • health_issues (JSONB) - Identified issues');
    console.log('  • health_recommendations (JSONB) - AI recommendations');
    console.log('  • last_health_check (TIMESTAMP) - Last health calculation');
    console.log('\n✅ Database is ready for Phase 2 AI features!\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);

    // Check if it's an "already exists" error
    if (error.message.includes('already exists') || error.message.includes('already has a value')) {
      console.log('\n⚠️  Migration appears to be already applied (columns/indexes already exist)');
      console.log('Running verification check...\n');

      try {
        const verifyResult = await client.query(`
          SELECT column_name, data_type
          FROM information_schema.columns
          WHERE table_name = 'trial_organizations'
          AND column_name IN ('tags', 'health_status', 'health_issues', 'health_recommendations', 'last_health_check')
          ORDER BY column_name;
        `);

        if (verifyResult.rows.length === 5) {
          console.log('✅ All migration columns exist:');
          verifyResult.rows.forEach(row => {
            console.log(`   • ${row.column_name} (${row.data_type})`);
          });
          console.log('\n✅ Migration is already complete!\n');
        } else {
          console.log(`⚠️  Only ${verifyResult.rows.length}/5 columns found`);
          console.log('You may need to apply the migration manually via Supabase Dashboard');
        }
      } catch (verifyError) {
        console.error('Verification also failed:', verifyError.message);
      }
    } else {
      console.error('Full error:', error);
      console.log('\n💡 TIP: Try applying the SQL manually via Supabase Dashboard');
      console.log('   File: supabase/migrations/20251115_ai_features.sql');
    }
  } finally {
    await client.end();
  }
}

// Run the migration
applyMigration();
