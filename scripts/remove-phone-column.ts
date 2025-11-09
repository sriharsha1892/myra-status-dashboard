#!/usr/bin/env tsx
/**
 * Remove phone column from trial_users table
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function removePhoneColumn() {
  console.log('\n🗑️  Removing phone column from trial_users table...\n');

  try {
    // Drop phone column
    const { error } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE trial_users DROP COLUMN IF EXISTS phone;'
    });

    if (error) {
      // Try direct SQL query method
      const { error: directError } = await supabase.from('trial_users').select('phone').limit(1);

      if (directError && directError.message.includes('column "phone" does not exist')) {
        console.log('✅ Phone column already removed or does not exist');
        return;
      }

      throw error;
    }

    console.log('✅ Phone column removed successfully from trial_users table');
    console.log('\n📋 Migration complete!\n');

  } catch (error: any) {
    console.error('❌ Error removing phone column:', error);
    console.error('\nPlease run this SQL manually on your Supabase database:');
    console.error('ALTER TABLE trial_users DROP COLUMN IF EXISTS phone;\n');
    process.exit(1);
  }
}

removePhoneColumn();
