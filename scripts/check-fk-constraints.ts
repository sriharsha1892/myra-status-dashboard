import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const connectionString = `postgresql://postgres.mkkhwiyolmowomojvtel:${process.env.SUPABASE_DB_PASSWORD}@aws-0-ap-south-1.pooler.supabase.com:6543/postgres`;

async function checkConstraints() {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('Checking foreign key constraints...\n');

    const query = `
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        tc.constraint_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name IN ('roadmap_milestones', 'roadmap_labels', 'org_product_roadmap')
        AND ccu.table_name IN ('organizations', 'trial_organizations')
      ORDER BY tc.table_name, kcu.column_name;
    `;

    const result = await client.query(query);

    console.log('Foreign key constraints found:\n');
    result.rows.forEach(row => {
      console.log(`${row.table_name}.${row.column_name} -> ${row.foreign_table_name}.${row.foreign_column_name}`);
      console.log(`  Constraint: ${row.constraint_name}\n`);
    });

    await client.end();
  } catch (err: any) {
    console.error('Error:', err.message);
  }
}

checkConstraints().catch(console.error);
