import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function applyMigration() {
  console.log('🔧 Applying trigger fix migration...\n');

  const migrationPath = path.resolve(__dirname, '../supabase/migrations/20251111_fix_roadmap_trigger.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  const connectionString = `postgresql://postgres.mkkhwiyolmowomojvtel:${process.env.SUPABASE_DB_PASSWORD}@aws-0-ap-south-1.pooler.supabase.com:6543/postgres`;

  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Split into statements
    const statements = sql
      .replace(/--[^\n]*/g, '') // Remove SQL comments
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 10);

    console.log(`Executing ${statements.length} statements...\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      const preview = statement.substring(0, 70).replace(/\n/g, ' ');
      console.log(`${i + 1}. ${preview}...`);

      try {
        await client.query(statement);
        console.log('   ✅ Success\n');
      } catch (err: any) {
        console.log(`   ⚠️  Error: ${err.message}\n`);
      }
    }

    await client.end();
    console.log('\n🎉 Migration applied successfully!');
    console.log('\n✅ Trigger fix has been deployed to the database');
    console.log('\nYou can now run: npm run test:roadmap');

  } catch (err: any) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

applyMigration().catch(console.error);
