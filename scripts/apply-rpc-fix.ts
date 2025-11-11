import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function applyMigration() {
  console.log('🔧 Applying RPC column name fix migration...\n');

  const migrationPath = path.resolve(__dirname, '../supabase/migrations/20251112_fix_rpc_column_name.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  const connectionString = `postgresql://postgres.mkkhwiyolmowomojvtel:${process.env.SUPABASE_DB_PASSWORD}@aws-0-ap-south-1.pooler.supabase.com:6543/postgres`;

  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // For this migration, we can execute it as a single statement since it's creating/replacing a function
    console.log('Executing RPC function replacement...\n');

    try {
      await client.query(sql);
      console.log('✅ RPC function updated successfully!\n');
    } catch (err: any) {
      console.log(`⚠️ Error: ${err.message}\n`);
      throw err;
    }

    await client.end();
    console.log('\n🎉 Migration applied successfully!');
    console.log('\n✅ The create_resource_discussion function now uses full_name instead of name');
    console.log('\nYou can now create discussions without the column error!');

  } catch (err: any) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

applyMigration().catch(console.error);
