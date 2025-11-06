#!/usr/bin/env node

/**
 * Script: Apply roadmap migrations and import Excel data
 * Run this with: node scripts/apply-roadmap-migrations-and-import.js /path/to/your/file.xlsx
 */

const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Status mapping
const statusMap = {
  'done': 'completed',
  'complete': 'completed',
  'finished': 'completed',
  'closed': 'completed',
  'in progress': 'in_progress',
  'in-progress': 'in_progress',
  'active': 'in_progress',
  'working': 'in_progress',
  'todo': 'planned',
  'backlog': 'planned',
  'new': 'planned',
  'planned': 'planned',
  'canceled': 'cancelled',
  'cancelled': 'cancelled',
  'suggested': 'suggested',
  'idea': 'suggested',
};

async function applyMigrations() {
  console.log('\n🔧 Applying migrations...\n');

  // Step 1: Add missing columns from 20251105 migration
  console.log('1️⃣ Adding spreadsheet columns (proposer, goal, area, rationale, version_planned, assigned_to)...');
  try {
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE org_product_roadmap
        ADD COLUMN IF NOT EXISTS proposer TEXT,
        ADD COLUMN IF NOT EXISTS goal TEXT,
        ADD COLUMN IF NOT EXISTS area TEXT,
        ADD COLUMN IF NOT EXISTS rationale TEXT,
        ADD COLUMN IF NOT EXISTS version_planned TEXT,
        ADD COLUMN IF NOT EXISTS assigned_to TEXT;
      `
    });

    if (error && !error.message.includes('already exists')) {
      console.log('   ⚠️  RPC not available, columns may already exist or need manual creation');
      console.log('   Continuing with import...\n');
    } else {
      console.log('   ✅ Spreadsheet columns added\n');
    }
  } catch (err) {
    console.log('   ⚠️  Migration may have already been applied, continuing...\n');
  }

  // Step 2: Make org_id nullable
  console.log('2️⃣ Making org_id nullable for general roadmap items...');
  try {
    const { error } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE org_product_roadmap ALTER COLUMN org_id DROP NOT NULL;'
    });

    if (error) {
      console.log('   ⚠️  org_id may already be nullable, continuing...\n');
    } else {
      console.log('   ✅ org_id made nullable\n');
    }
  } catch (err) {
    console.log('   ⚠️  org_id may already be nullable, continuing...\n');
  }
}

async function importFromExcel(filePath) {
  console.log(`\n📁 Reading Excel file: ${filePath}`);

  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }

  // Read Excel file
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);

  console.log(`✅ Found ${data.length} rows\n`);

  // Get user email for created_by
  const { data: { user } } = await supabase.auth.getUser();
  const createdBy = user?.email || 'admin@myra.ai';

  let successCount = 0;
  let failedCount = 0;
  const errors = [];

  console.log('📤 Importing items...\n');

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const progress = `[${i + 1}/${data.length}]`;

    try {
      // Map column names (flexible matching)
      const title = row.title || row.Title || row.name || row.Name || row.feature || row.Feature;
      const description = row.description || row.Description || row.desc || row.Desc;
      const status = row.status || row.Status || row.state || row.State;
      const priority = row.priority || row.Priority || row.importance || row.Importance;
      const category = row.category || row.Category || row.type || row.Type;
      const goal = row.goal || row.Goal;
      const area = row.area || row.Area;
      const rationale = row.rationale || row.Rationale || row.why || row.Why;
      const proposer = row.proposer || row.Proposer || row.requested_by || row['Requested By'];
      const version_planned = row.version_planned || row['Version Planned'] || row.version || row.Version;
      const assigned_to = row.assigned_to || row['Assigned To'] || row.assignee || row.Assignee;
      const due_date = row.due_date || row['Due Date'] || row.target_date || row['Target Date'];

      if (!title || title.trim() === '') {
        console.log(`${progress} ⏭️  Skipping row ${i + 1}: No title`);
        continue;
      }

      // Normalize status
      const normalizedStatus = status ? (statusMap[status.toLowerCase().trim()] || 'planned') : 'planned';

      // Normalize priority
      let normalizedPriority = 'medium';
      if (priority) {
        const p = priority.toLowerCase().trim();
        if (['low', 'medium', 'high', 'critical'].includes(p)) {
          normalizedPriority = p;
        }
      }

      const itemData = {
        title: title,
        description: description || null,
        status: normalizedStatus,
        priority: normalizedPriority,
        target_date: due_date || null,
        created_by: createdBy,
        org_id: null,  // NULL for general roadmap items
        proposer: proposer || null,
        goal: goal || null,
        area: area || null,
        rationale: rationale || null,
        version_planned: version_planned || null,
        assigned_to: assigned_to || null,
      };

      // Check if item already exists
      const { data: existing } = await supabase
        .from('org_product_roadmap')
        .select('id')
        .eq('title', title)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('org_product_roadmap')
          .update(itemData)
          .eq('id', existing.id);

        if (error) throw error;
        console.log(`${progress} 🔄 Updated: ${title}`);
      } else {
        // Insert new
        const { error } = await supabase
          .from('org_product_roadmap')
          .insert(itemData);

        if (error) throw error;
        console.log(`${progress} ✅ Created: ${title}`);
      }

      successCount++;
    } catch (error) {
      failedCount++;
      errors.push({ row: i + 1, title: row.title || 'Unknown', error: error.message });
      console.log(`${progress} ❌ Failed: ${row.title || 'Unknown'} - ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`\n🎉 Import complete!`);
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Failed: ${failedCount}\n`);

  if (errors.length > 0 && errors.length <= 5) {
    console.log('Failed items:');
    errors.forEach(e => {
      console.log(`   - Row ${e.row}: ${e.title} - ${e.error}`);
    });
  }
}

async function main() {
  console.log('🚀 Roadmap Migration & Import Script\n');
  console.log('📍 Supabase URL:', supabaseUrl);

  // Get file path from command line
  const filePath = process.argv[2];

  if (!filePath) {
    console.error('❌ Please provide an Excel file path');
    console.error('Usage: node scripts/apply-roadmap-migrations-and-import.js /path/to/file.xlsx');
    process.exit(1);
  }

  try {
    // Apply migrations first
    await applyMigrations();

    // Import data
    await importFromExcel(filePath);

    console.log('✨ All done!\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Unexpected error:', err.message);
    process.exit(1);
  }
}

main();
