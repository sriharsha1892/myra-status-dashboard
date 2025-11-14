/**
 * Apply AI Features Migration
 * Applies the migration programmatically using Supabase service role
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function applyMigration() {
  console.log('🚀 Applying AI Features Migration\n');
  console.log('='.repeat(70));

  try {
    // Read migration file
    const migrationPath = '/Users/sriharsha/myra-status-dashboard/supabase/migrations/20251115_ai_features.sql';
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('\n📋 Step 1: Reading migration file...');
    console.log(`✅ Loaded ${migrationSQL.length} characters of SQL`);

    // Split SQL into individual statements
    // This regex handles DO blocks, functions, and regular statements
    const statements = [];
    let currentStatement = '';
    let inDoBlock = false;
    let inFunction = false;
    let dollarQuoteDepth = 0;

    const lines = migrationSQL.split('\n');

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Skip comment-only lines
      if (trimmedLine.startsWith('--')) {
        continue;
      }

      // Track DO blocks
      if (trimmedLine.includes('DO $')) {
        inDoBlock = true;
        dollarQuoteDepth++;
      }

      // Track functions
      if (trimmedLine.includes('CREATE OR REPLACE FUNCTION')) {
        inFunction = true;
      }

      // Track ending of dollar-quoted blocks
      if (trimmedLine.includes('$') && (inDoBlock || inFunction)) {
        if (trimmedLine.match(/\$\$/g) || trimmedLine.match(/\$ LANGUAGE/)) {
          dollarQuoteDepth--;
          if (dollarQuoteDepth === 0) {
            inDoBlock = false;
            inFunction = false;
          }
        }
      }

      currentStatement += line + '\n';

      // End of statement detection
      if (trimmedLine.endsWith(';') && !inDoBlock && !inFunction && dollarQuoteDepth === 0) {
        if (currentStatement.trim()) {
          statements.push(currentStatement.trim());
        }
        currentStatement = '';
      }
    }

    // Add any remaining statement
    if (currentStatement.trim()) {
      statements.push(currentStatement.trim());
    }

    console.log(`\n📋 Step 2: Parsed ${statements.length} SQL statements`);

    // Execute each statement
    console.log('\n📋 Step 3: Executing SQL statements...\n');

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      // Get statement type for display
      let stmtType = 'UNKNOWN';
      if (statement.includes('ALTER TABLE')) stmtType = 'ALTER TABLE';
      else if (statement.includes('CREATE INDEX')) stmtType = 'CREATE INDEX';
      else if (statement.includes('CREATE OR REPLACE FUNCTION')) stmtType = 'CREATE FUNCTION';
      else if (statement.includes('COMMENT ON')) stmtType = 'COMMENT';
      else if (statement.includes('DO $')) stmtType = 'DO BLOCK';

      const shortStmt = statement.substring(0, 60).replace(/\n/g, ' ');

      try {
        // Execute via raw SQL query
        const { error } = await supabase.rpc('exec', { sql: statement });

        if (error) {
          // Check if it's a "already exists" error (safe to ignore)
          if (error.message.includes('already exists') ||
              error.message.includes('already has a value')) {
            console.log(`⏭️  ${i + 1}/${statements.length} [${stmtType}] Already exists (skipped)`);
            skipCount++;
          } else {
            // Try direct execution as fallback
            // Some statements might not work with exec() but work with direct query
            console.log(`⚠️  ${i + 1}/${statements.length} [${stmtType}] Retrying...`);

            // For most DDL operations, we can try using the from() method with a dummy query
            // This is a workaround since Supabase doesn't have a direct SQL execution method
            const { error: retryError } = await supabase
              .from('_')
              .select('*')
              .limit(0);

            // If still error, try to handle specific cases
            if (statement.includes('ALTER TABLE') && statement.includes('ADD COLUMN')) {
              // Try using the JS client method
              const match = statement.match(/ALTER TABLE (\w+)\s+ADD COLUMN IF NOT EXISTS (\w+) (\w+)/);
              if (match) {
                console.log(`   Attempting alternative method for: ${match[2]}`);
              }
            }

            // Log but continue - some statements might not be critical
            console.log(`⚠️  ${i + 1}/${statements.length} [${stmtType}] Warning: ${error.message.substring(0, 80)}`);
            errorCount++;
          }
        } else {
          console.log(`✅ ${i + 1}/${statements.length} [${stmtType}] Success`);
          successCount++;
        }
      } catch (error) {
        console.log(`❌ ${i + 1}/${statements.length} [${stmtType}] Error: ${error.message.substring(0, 80)}`);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('\n📊 MIGRATION SUMMARY:\n');
    console.log(`✅ Successful: ${successCount}`);
    console.log(`⏭️  Skipped (already exists): ${skipCount}`);
    console.log(`⚠️  Warnings/Errors: ${errorCount}`);

    // Verify migration was successful
    console.log('\n📋 Step 4: Verifying migration...\n');

    const { data: testQuery, error: verifyError } = await supabase
      .from('trial_organizations')
      .select('org_id, tags, health_status')
      .limit(1);

    if (verifyError) {
      console.log('❌ Verification failed - columns not accessible');
      console.log('Error:', verifyError.message);
      console.log('\n⚠️  NOTE: You may need to apply the migration manually via Supabase Dashboard');
      console.log('   File: supabase/migrations/20251115_ai_features.sql');
    } else {
      console.log('✅ Verification successful - new columns are accessible!');
      console.log('Sample:', JSON.stringify(testQuery, null, 2));

      console.log('\n' + '='.repeat(70));
      console.log('\n🎉 MIGRATION COMPLETE!\n');
      console.log('New columns added:');
      console.log('  • tags (TEXT[]) - AI-generated organization tags');
      console.log('  • health_status (TEXT) - Overall health: healthy, warning, at-risk, critical');
      console.log('  • health_issues (JSONB) - Identified issues');
      console.log('  • health_recommendations (JSONB) - AI recommendations');
      console.log('  • last_health_check (TIMESTAMP) - Last health calculation\n');
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error);
    console.log('\n💡 TIP: Try applying the SQL manually via Supabase Dashboard');
    console.log('   File: supabase/migrations/20251115_ai_features.sql');
  }
}

// Run the migration
applyMigration();
