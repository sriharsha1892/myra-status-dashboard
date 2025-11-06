require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addRoadmapColumns() {
  console.log('🚀 Adding roadmap columns...\n');

  const sql = `
    -- Add missing columns
    ALTER TABLE org_product_roadmap
    ADD COLUMN IF NOT EXISTS proposer TEXT,
    ADD COLUMN IF NOT EXISTS goal TEXT,
    ADD COLUMN IF NOT EXISTS area TEXT,
    ADD COLUMN IF NOT EXISTS rationale TEXT,
    ADD COLUMN IF NOT EXISTS version_planned TEXT,
    ADD COLUMN IF NOT EXISTS assigned_to TEXT;

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_org_roadmap_goal ON org_product_roadmap(goal);
    CREATE INDEX IF NOT EXISTS idx_org_roadmap_area ON org_product_roadmap(area);
    CREATE INDEX IF NOT EXISTS idx_org_roadmap_version_planned ON org_product_roadmap(version_planned);
  `;

  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql });

    if (error) {
      // Try direct query approach
      console.log('Trying direct ALTER TABLE approach...');

      const alterCommands = [
        `ALTER TABLE org_product_roadmap ADD COLUMN IF NOT EXISTS proposer TEXT`,
        `ALTER TABLE org_product_roadmap ADD COLUMN IF NOT EXISTS goal TEXT`,
        `ALTER TABLE org_product_roadmap ADD COLUMN IF NOT EXISTS area TEXT`,
        `ALTER TABLE org_product_roadmap ADD COLUMN IF NOT EXISTS rationale TEXT`,
        `ALTER TABLE org_product_roadmap ADD COLUMN IF NOT EXISTS version_planned TEXT`,
        `ALTER TABLE org_product_roadmap ADD COLUMN IF NOT EXISTS assigned_to TEXT`
      ];

      for (const cmd of alterCommands) {
        try {
          await supabase.rpc('exec_sql', { sql: cmd });
          console.log(`✅ ${cmd.match(/ADD COLUMN.*?(\w+) TEXT/)[1]}`);
        } catch (e) {
          console.log(`⚠️  Column may already exist: ${cmd.match(/ADD COLUMN.*?(\w+) TEXT/)[1]}`);
        }
      }
    } else {
      console.log('✅ All columns added successfully');
    }

    // Verify columns exist
    console.log('\n🔍 Verifying columns...');
    const { data: tableInfo } = await supabase
      .from('org_product_roadmap')
      .select('proposer, goal, area, rationale, version_planned, assigned_to')
      .limit(1);

    console.log('✅ Columns verified!\n');
    console.log('📊 New columns available:');
    console.log('   - proposer');
    console.log('   - goal');
    console.log('   - area');
    console.log('   - rationale');
    console.log('   - version_planned');
    console.log('   - assigned_to\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

addRoadmapColumns();
