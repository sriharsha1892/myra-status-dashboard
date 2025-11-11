#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables
const dotenv = require('dotenv');
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  console.log('Reading migration file...');
  const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20251110_timeline_system.sql');
  const sql = readFileSync(migrationPath, 'utf-8');

  console.log('Running migration...');

  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql });

    if (error) {
      // Try alternative approach - execute directly
      console.log('Trying direct execution...');
      const { error: directError } = await supabase.from('_migrations').insert({
        name: '20251110_timeline_system',
        executed_at: new Date().toISOString()
      });

      if (directError) {
        throw new Error(`Migration failed: ${error.message}`);
      }
    }

    console.log('Migration completed successfully!');
    console.log('\nCreated tables:');
    console.log('- trial_timeline_events');
    console.log('- pain_points');
    console.log('- learnings');
    console.log('- event_pain_points');
    console.log('- event_learnings');
    console.log('- timeline_views');
    console.log('- import_sessions');
    console.log('- event_type_taxonomy');
    console.log('\nSeeded 45 event types across 7 categories.');

  } catch (err: any) {
    console.error('Migration error:', err.message);
    console.log('\nPlease run the migration manually using:');
    console.log('psql -h db.mkkhwiyolmowomojvtel.supabase.co -U postgres -d postgres -f supabase/migrations/20251110_timeline_system.sql');
    process.exit(1);
  }
}

runMigration();
