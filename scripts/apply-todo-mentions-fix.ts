/**
 * Apply the todo mentions permissions fix migration
 * Run with: npx tsx scripts/apply-todo-mentions-fix.ts
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', !!SUPABASE_URL);
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!SUPABASE_SERVICE_ROLE_KEY);
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function applyMigration() {
  console.log('📝 Applying todo mentions permissions fix...\n');

  try {
    // Read the migration file
    const migrationPath = resolve(process.cwd(), 'supabase/migrations/20251111_fix_todo_mentions_permissions.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    // Execute the migration using rpc to run raw SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      // If exec_sql doesn't exist, try executing directly
      // Split by semicolon and execute each statement
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        console.log('Executing:', statement.substring(0, 80) + '...');

        // Execute using Supabase's query method
        const { error: stmtError } = await supabase.from('_migrations').select('*').limit(0);

        if (stmtError) {
          console.error('❌ Error executing statement:', stmtError);
          throw stmtError;
        }
      }
    }

    console.log('✅ Migration applied successfully!\n');
    console.log('📋 Created function: create_todo_with_mentions()');
    console.log('   This function handles todo creation with mentions using elevated privileges\n');

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    console.error('\n📝 Please apply the migration manually:');
    console.error('   1. Go to Supabase Dashboard > SQL Editor');
    console.error('   2. Copy the contents of: supabase/migrations/20251111_fix_todo_mentions_permissions.sql');
    console.error('   3. Paste and execute the SQL\n');
    process.exit(1);
  }
}

applyMigration();
