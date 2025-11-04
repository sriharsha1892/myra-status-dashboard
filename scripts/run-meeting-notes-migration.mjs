import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

// Use service role key to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🔄 Running meeting_notes migration...\n');

try {
  // Read migration file
  const migrationSQL = readFileSync(
    join(__dirname, '..', 'supabase', 'migrations', '20251103_meeting_notes.sql'),
    'utf-8'
  );

  // Execute migration
  const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL }).single();

  if (error) {
    // Try direct execution if rpc doesn't work
    console.log('Trying direct SQL execution...');

    // Split into individual statements and execute
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      const { error: stmtError } = await supabase.rpc('exec_sql', { sql: statement });
      if (stmtError) {
        console.log('Statement:', statement.substring(0, 100) + '...');
        console.log('Error:', stmtError.message);
      }
    }

    console.log('\n✅ Migration attempted via direct execution');
    console.log('⚠️  If errors occurred, please run the migration manually in Supabase SQL Editor');
    console.log('\nSQL to run manually:');
    console.log('------------------------');
    console.log(migrationSQL);
    console.log('------------------------\n');
  } else {
    console.log('✅ Migration completed successfully!\n');
  }

  console.log('📝 Verifying table creation...');

  // Verify table exists
  const { data: tableCheck, error: checkError } = await supabase
    .from('meeting_notes')
    .select('*')
    .limit(0);

  if (checkError) {
    console.log('⚠️  Table verification failed:', checkError.message);
    console.log('\n📋 Please run this SQL manually in Supabase SQL Editor:\n');
    console.log(migrationSQL);
  } else {
    console.log('✅ Table verified successfully!');
  }

} catch (error) {
  console.error('❌ Migration failed:', error.message);
  console.log('\n📋 Please run this SQL manually in Supabase SQL Editor:\n');
  const migrationSQL = readFileSync(
    join(__dirname, '..', 'supabase', 'migrations', '20251103_meeting_notes.sql'),
    'utf-8'
  );
  console.log(migrationSQL);
  process.exit(1);
}
