const https = require('https');
const fs = require('fs');

const supabaseUrl = 'mkkhwiyolmowomojvtel.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ra2h3aXlvbG1vd29tb2p2dGVsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjA5MjI4MywiZXhwIjoyMDc3NjY4MjgzfQ.pI6BFTzH_Lo7ST9T7Gw6rAMtf4hd21HP_4Jbo4ng5R4';

// SQL statements to execute
const sqlStatements = [
  `ALTER TABLE error_reports ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL;`,
  `ALTER TABLE error_reports ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;`,
  `CREATE INDEX IF NOT EXISTS idx_error_reports_assigned_to ON error_reports(assigned_to) WHERE assigned_to IS NOT NULL;`,
  `CREATE INDEX IF NOT EXISTS idx_error_reports_unassigned ON error_reports(assigned_to) WHERE assigned_to IS NULL AND status != 'resolved';`,
  `DROP POLICY IF EXISTS "Users can view errors assigned to them" ON error_reports;`,
  `CREATE POLICY "Users can view errors assigned to them" ON error_reports FOR SELECT USING (assigned_to = auth.uid());`,
];

async function executeSql(sql) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query: sql });

    const options = {
      hostname: supabaseUrl,
      path: '/rest/v1/rpc/execute_sql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          resolve({ success: true, data: body });
        } else {
          resolve({ success: false, error: body, status: res.statusCode });
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.write(data);
    req.end();
  });
}

async function runMigration() {
  console.log('🚀 Starting error assignment migration...\n');

  for (let i = 0; i < sqlStatements.length; i++) {
    const sql = sqlStatements[i];
    const shortSql = sql.substring(0, 60) + (sql.length > 60 ? '...' : '');

    console.log(`[${i + 1}/${sqlStatements.length}] Running: ${shortSql}`);

    try {
      const result = await executeSql(sql);
      if (result.success) {
        console.log('  ✓ Success\n');
      } else {
        console.log(`  ✗ Failed (${result.status}): ${result.error}\n`);
        console.log('  Note: This may be expected if using direct SQL execution is not available.');
        console.log('  The migration should be run manually in Supabase Dashboard.\n');
        break;
      }
    } catch (error) {
      console.error(`  ✗ Error: ${error.message}\n`);
      break;
    }
  }

  console.log('\n📋 Migration file location: supabase/migrations/20251119000000_add_error_assignments.sql');
  console.log('\n💡 To apply manually:');
  console.log('1. Go to Supabase Dashboard > SQL Editor');
  console.log('2. Copy the contents of the migration file');
  console.log('3. Paste and run the SQL');
}

runMigration();
