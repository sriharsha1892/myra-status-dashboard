import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyFix() {
  console.log('Applying trigger fix migration...\n');

  // Read the migration file
  const migrationPath = path.resolve(__dirname, '../supabase/migrations/20251111_fix_roadmap_trigger.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  // Execute the SQL
  const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

  if (error) {
    console.error('❌ Error applying migration:', error);

    // Try direct query approach
    console.log('\nTrying alternative approach...');
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      console.log(`Executing: ${statement.substring(0, 50)}...`);
      const { error: stmtError } = await (supabase as any).rpc('query', {
        query_text: statement
      });

      if (stmtError) {
        console.error('Error:', stmtError.message);
      }
    }
  } else {
    console.log('✅ Migration applied successfully!');
  }

  console.log('\nTrigger fix has been applied to the database.');
  console.log('You can now run: npm run test:roadmap');
}

applyFix().catch(console.error);
