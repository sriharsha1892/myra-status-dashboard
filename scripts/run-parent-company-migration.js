#!/usr/bin/env node
/**
 * Run migration: Add parent_company for multi-tenancy (Mordor Intelligence vs GMI)
 */

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  console.log('\n📝 Running parent_company migration...\n');
  console.log('This will:');
  console.log('1. Add parent_company column to trial_organizations (default: Mordor Intelligence)');
  console.log('2. Add parent_company and is_super_admin columns to users table');
  console.log('3. Set all existing users to Mordor Intelligence');
  console.log('4. Add CHECK constraints and indexes\n');

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250109_add_parent_company.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');

    // Split into individual statements (simple split on semicolons)
    const statements = migrationSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📋 Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      // Skip comment-only statements
      if (statement.startsWith('--')) continue;

      console.log(`Executing statement ${i + 1}/${statements.length}...`);

      try {
        // Use raw SQL query
        const { error } = await supabase.rpc('exec_sql', { sql: statement });

        if (error) {
          // If rpc doesn't exist, try direct query for some operations
          console.log(`   ⚠️  RPC method not available, attempting direct execution...`);

          // For ALTER TABLE and other DDL, we need to check manually
          if (statement.includes('ADD COLUMN')) {
            // Check if column already exists
            const tableName = statement.match(/ALTER TABLE (\w+)/i)?.[1];
            const columnName = statement.match(/ADD COLUMN (?:IF NOT EXISTS )?(\w+)/i)?.[1];

            if (tableName && columnName) {
              const { error: checkError } = await supabase
                .from(tableName)
                .select(columnName)
                .limit(1);

              if (!checkError) {
                console.log(`   ✅ Column ${columnName} already exists on ${tableName}`);
                continue;
              }
            }
          }

          throw error;
        }

        console.log(`   ✅ Success`);
      } catch (err) {
        console.error(`   ❌ Failed:`, err.message);
        console.error(`   Statement: ${statement.substring(0, 100)}...`);
        throw err;
      }
    }

    console.log('\n✅ Migration completed successfully!\n');
    console.log('📊 Summary:');
    console.log('  - trial_organizations.parent_company added (default: Mordor Intelligence)');
    console.log('  - users.parent_company added (all set to Mordor Intelligence)');
    console.log('  - users.is_super_admin added (all set to false)');
    console.log('  - CHECK constraints added to ensure valid values');
    console.log('  - Indexes created for better query performance\n');

    // Verify the changes
    console.log('🔍 Verifying migration...\n');

    const { data: orgs, error: orgsError } = await supabase
      .from('trial_organizations')
      .select('org_id, org_name, parent_company')
      .limit(3);

    if (orgsError) {
      console.error('⚠️  Could not verify trial_organizations:', orgsError.message);
    } else {
      console.log('Trial Organizations (sample):');
      orgs.forEach(org => {
        console.log(`  - ${org.org_name}: ${org.parent_company}`);
      });
    }

    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('name, email, parent_company, is_super_admin')
      .limit(3);

    if (usersError) {
      console.error('⚠️  Could not verify users:', usersError.message);
    } else {
      console.log('\nUsers (sample):');
      users.forEach(user => {
        console.log(`  - ${user.name} (${user.email}): ${user.parent_company} ${user.is_super_admin ? '[SUPER ADMIN]' : ''}`);
      });
    }

    console.log('\n✨ Migration complete! You can now:');
    console.log('  1. Add parent_company dropdown to CreateOrganizationModal');
    console.log('  2. Filter trial orgs by parent_company in the UI');
    console.log('  3. Assign users to parent companies');
    console.log('  4. Set super_admin flag for users who need cross-company access\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\n💡 You may need to run this migration manually in Supabase SQL Editor:');
    console.error('   1. Go to Supabase Dashboard > SQL Editor');
    console.error('   2. Copy the contents of supabase/migrations/20250109_add_parent_company.sql');
    console.error('   3. Paste and run the SQL\n');
    process.exit(1);
  }
}

runMigration();
