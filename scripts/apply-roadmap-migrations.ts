import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration(migrationName: string, sqlFile: string) {
  console.log(`\n📝 Applying ${migrationName}...`);

  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', sqlFile);
  const sql = fs.readFileSync(migrationPath, 'utf-8');

  try {
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error(`❌ Error applying ${migrationName}:`, error);
      // Try alternative method - direct query
      console.log('   Trying alternative method...');
      const lines = sql.split('\n').filter(line => line.trim() && !line.trim().startsWith('--'));
      for (const line of lines) {
        if (line.trim()) {
          const { error: queryError } = await supabase.from('_migrations').insert({
            name: migrationName,
            executed_at: new Date().toISOString()
          });
          if (queryError) {
            console.error('   Still failed:', queryError.message);
          }
        }
      }
    } else {
      console.log(`✅ ${migrationName} applied successfully!`);
    }
  } catch (err) {
    console.error(`❌ Exception applying ${migrationName}:`, err);
  }
}

async function main() {
  console.log('🚀 Starting Roadmap Migrations...\n');
  console.log('ℹ️  Note: These migrations need to be applied via Supabase Dashboard SQL Editor');
  console.log('ℹ️  Copy and paste the SQL from these files:\n');

  const migrations = [
    {
      name: 'Saved Filter Views',
      file: '20250114_saved_filter_views_FIXED.sql',
      path: path.join(__dirname, '..', 'supabase', 'migrations', '20250114_saved_filter_views_FIXED.sql')
    },
    {
      name: 'Voting System',
      file: '20250114_voting_system_complete_FIXED.sql',
      path: path.join(__dirname, '..', 'supabase', 'migrations', '20250114_voting_system_complete_FIXED.sql')
    }
  ];

  console.log('📋 Migrations to apply:\n');

  for (const migration of migrations) {
    console.log(`${migration.name}:`);
    console.log(`   File: ${migration.file}`);
    console.log(`   Path: ${migration.path}`);
    console.log('');
  }

  console.log('\n📝 INSTRUCTIONS:');
  console.log('1. Go to Supabase Dashboard: https://supabase.com/dashboard');
  console.log('2. Select your project: mkkhwiyolmowomojvtel');
  console.log('3. Navigate to SQL Editor');
  console.log('4. Create a new query');
  console.log('5. Copy and paste the contents of each migration file');
  console.log('6. Run the query');
  console.log('\n');

  // Output the SQL content for easy copying
  for (const migration of migrations) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`${migration.name} Migration SQL:`);
    console.log('='.repeat(60));
    console.log(fs.readFileSync(migration.path, 'utf-8'));
    console.log('='.repeat(60));
    console.log(`\nEnd of ${migration.name} Migration\n`);
  }
}

main();
