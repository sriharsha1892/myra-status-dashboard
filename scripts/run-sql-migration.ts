/**
 * Run SQL migration against Supabase using the REST API
 * This bypasses the SDK and runs raw SQL
 */
import { readFileSync } from 'fs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Extract project ref from URL
const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

if (!projectRef) {
  console.error('Could not extract project ref from URL');
  process.exit(1);
}

async function runSQL(sql: string): Promise<{ success: boolean; error?: string }> {
  // Use the REST API to run SQL via the /sql endpoint
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ sql }),
  });

  if (!response.ok) {
    // If exec_sql doesn't exist, we need a different approach
    const text = await response.text();
    return { success: false, error: text };
  }

  return { success: true };
}

async function main() {
  console.log('Running SQL migrations...');
  console.log('Project:', projectRef);
  console.log('');

  // Try running a simple test first
  const testResult = await runSQL('SELECT 1 as test;');

  if (!testResult.success) {
    console.log('exec_sql function not available.');
    console.log('Please run the following SQL in the Supabase Dashboard SQL Editor:');
    console.log('');
    console.log('=== STEP 1: Create organizations_unified table ===');
    console.log('');

    const sql1 = readFileSync('/Users/sriharsha/myra-status-dashboard/supabase/migrations/20251220_unified_orgs.sql', 'utf-8');
    console.log(sql1);

    console.log('');
    console.log('=== STEP 2: Create org_contacts and contact_activities tables ===');
    console.log('');

    const sql2 = readFileSync('/Users/sriharsha/myra-status-dashboard/supabase/migrations/20251220_org_contacts.sql', 'utf-8');
    console.log(sql2);

    console.log('');
    console.log('=== After running above SQL, run the data migration: ===');
    console.log('NEXT_PUBLIC_SUPABASE_URL="..." SUPABASE_SERVICE_ROLE_KEY="..." npx tsx scripts/migrate-unified-orgs.ts');

    return;
  }

  console.log('exec_sql is available, running migrations...');

  // Run the migrations
  const migrations = [
    '/Users/sriharsha/myra-status-dashboard/supabase/migrations/20251220_unified_orgs.sql',
    '/Users/sriharsha/myra-status-dashboard/supabase/migrations/20251220_org_contacts.sql',
  ];

  for (const migrationPath of migrations) {
    console.log(`Running: ${migrationPath}`);
    const sql = readFileSync(migrationPath, 'utf-8');
    const result = await runSQL(sql);

    if (result.success) {
      console.log('  Success!');
    } else {
      console.log('  Error:', result.error);
    }
  }
}

main().catch(console.error);
