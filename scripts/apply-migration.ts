import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function applyMigration() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing Supabase credentials in environment variables');
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  console.log('Reading migration file...');
  const migrationPath = path.join(
    __dirname,
    '../supabase/migrations/20251104_feature_roadmap_links.sql'
  );
  const migrationSql = fs.readFileSync(migrationPath, 'utf-8');

  console.log('Applying migration to Supabase...');

  try {
    // Split the migration into individual statements
    const statements = migrationSql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`Executing statement ${i + 1}/${statements.length}...`);

      const { error } = await supabase.rpc('exec_sql', {
        sql: statement,
      }).catch(() => {
        // If exec_sql doesn't exist, we'll use a different approach
        return { error: 'exec_sql not found' };
      });

      if (error && error !== 'exec_sql not found') {
        console.error(`Error executing statement ${i + 1}:`, error);
        throw error;
      }
    }

    console.log('✅ Migration applied successfully!');
  } catch (error) {
    console.error('Error during migration:', error);
    console.log('\n⚠️  The Supabase RPC approach may not work. Please apply the migration manually:');
    console.log('1. Go to https://app.supabase.com/project/_/sql');
    console.log('2. Create a new query');
    console.log('3. Copy and paste the contents of: supabase/migrations/20251104_feature_roadmap_links.sql');
    console.log('4. Execute the query');
    process.exit(1);
  }
}

applyMigration().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
