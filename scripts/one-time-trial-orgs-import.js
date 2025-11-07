#!/usr/bin/env node

/**
 * ONE-TIME TRIAL ORGANIZATIONS IMPORT SCRIPT
 *
 * Simple, interactive script to import trial orgs from Excel/CSV
 * - Maps your Excel columns to database fields
 * - Shows preview of all data
 * - Allows manual edits before import
 * - One-time use, then delete this script
 *
 * Usage:
 *   node scripts/one-time-trial-orgs-import.js path/to/your/file.xlsx
 */

const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
const { format, parse, isValid } = require('date-fns');
const readline = require('readline');
require('dotenv').config({ path: '.env.local' });

// Supabase setup
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// ============================================================
// COLUMN MAPPING - Maps your Excel columns to DB fields
// ============================================================
const COLUMN_MAP = {
  // Organization name (REQUIRED)
  org_name: ['org name', 'organization name', 'organization', 'company name', 'company', 'org_name', 'name'],

  // Domain/URL
  org_domain: ['org domain', 'domain', 'website', 'url', 'org_domain'],
  org_url: ['org url', 'url', 'website url'],

  // Lifecycle stage
  org_lifecycle_stage: ['lifecycle stage', 'stage', 'status', 'pipeline stage', 'org_lifecycle_stage'],
  trial_status: ['trial status', 'status', 'trial_status'],

  // Dates
  trial_start_date: ['trial start', 'trial start date', 'start date', 'trial_start_date'],
  trial_end_date: ['trial end', 'trial end date', 'end date', 'trial_end_date'],
  trial_request_date: ['trial request', 'request date', 'trial_request_date'],
  trial_access_provided_date: ['access provided', 'access date', 'trial_access_provided_date'],
  trial_expiry_date: ['expiry date', 'expiry', 'trial_expiry_date'],
  last_activity_date: ['last activity', 'last activity date', 'last_activity_date'],

  // People
  account_manager: ['account manager', 'am', 'manager', 'account_manager'],
  sales_poc_id: ['sales poc', 'sales', 'sales_poc_id'],
  access_provided_by: ['provided by', 'access provided by', 'access_provided_by'],
  access_provided_by_role: ['provider role', 'access provided by role', 'access_provided_by_role'],

  // Score and description
  engagement_score: ['engagement score', 'engagement', 'score', 'engagement_score'],
  description: ['description', 'desc', 'details'],
  comments: ['comments', 'notes', 'remarks'],
};

// ============================================================
// Helper Functions
// ============================================================

function parseDate(dateValue) {
  if (!dateValue) return null;

  try {
    // Already a Date object
    if (dateValue instanceof Date) {
      return format(dateValue, 'yyyy-MM-dd');
    }

    // String date
    if (typeof dateValue === 'string') {
      const trimmed = dateValue.trim();
      if (!trimmed) return null;

      const formats = [
        'yyyy-MM-dd',
        'MM/dd/yyyy',
        'dd/MM/yyyy',
        'M/d/yyyy',
        'd/M/yyyy',
        'yyyy/MM/dd',
        'MMM dd, yyyy',
        'MMMM dd, yyyy',
        'dd-MMM-yyyy',
        'dd MMM yyyy',
      ];

      for (const fmt of formats) {
        try {
          const parsed = parse(trimmed, fmt, new Date());
          if (isValid(parsed)) {
            return format(parsed, 'yyyy-MM-dd');
          }
        } catch (e) {
          continue;
        }
      }
    }

    // Excel serial date (number)
    if (typeof dateValue === 'number') {
      const excelDate = XLSX.SSF.parse_date_code(dateValue);
      if (excelDate) {
        const date = new Date(excelDate.y, excelDate.m - 1, excelDate.d);
        if (isValid(date)) {
          return format(date, 'yyyy-MM-dd');
        }
      }
    }
  } catch (e) {
    console.error('Date parsing error:', e.message);
  }

  return null;
}

function mapColumnName(header) {
  const normalized = header.toLowerCase().trim();

  for (const [dbField, synonyms] of Object.entries(COLUMN_MAP)) {
    if (synonyms.some(syn => normalized.includes(syn))) {
      return dbField;
    }
  }

  return null;
}

async function fetchUsers() {
  const { data: users, error } = await supabase.auth.admin.listUsers();
  if (error) throw error;
  return users.users.map(u => ({
    id: u.id,
    email: u.email,
    name: u.user_metadata?.name || u.email.split('@')[0],
  }));
}

function findUserByName(users, name) {
  if (!name) return null;

  const normalized = name.toLowerCase().trim();

  // Handle "A/B" format (A is account manager, B is sales POC)
  if (normalized.includes('/')) {
    const parts = normalized.split('/').map(p => p.trim());
    const targetName = parts[0]; // Take first part for account manager

    const user = users.find(u =>
      u.name.toLowerCase().includes(targetName) ||
      targetName.includes(u.name.toLowerCase()) ||
      u.email.toLowerCase().includes(targetName)
    );

    return user ? user.id : null;
  }

  // Regular single name lookup
  const user = users.find(u =>
    u.name.toLowerCase().includes(normalized) ||
    normalized.includes(u.name.toLowerCase()) ||
    u.email.toLowerCase().includes(normalized)
  );

  return user ? user.id : null;
}

function readExcelFile(filePath) {
  console.log(`\n📂 Reading file: ${filePath}\n`);

  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json(worksheet);

  console.log(`✅ Found ${rawData.length} rows in sheet "${sheetName}"\n`);

  return rawData;
}

async function mapDataToDbFields(rawData, users) {
  console.log('🔄 Mapping columns to database fields...\n');

  const headers = Object.keys(rawData[0] || {});
  const columnMapping = {};

  // Auto-map columns
  headers.forEach(header => {
    const dbField = mapColumnName(header);
    if (dbField) {
      columnMapping[header] = dbField;
      console.log(`  ${header} → ${dbField}`);
    } else {
      console.log(`  ${header} → (ignored)`);
    }
  });

  console.log('\n📊 Processing rows...\n');

  const mappedData = rawData.map((row, index) => {
    const mapped = {
      _rowNumber: index + 2, // Excel row number (1 is header)
      org_name: null,
      org_domain: null,
      org_url: null,
      org_lifecycle_stage: null,
      trial_status: null,
      trial_start_date: null,
      trial_end_date: null,
      trial_request_date: null,
      trial_access_provided_date: null,
      trial_expiry_date: null,
      last_activity_date: null,
      account_manager_id: null,
      sales_poc_id: null,
      access_provided_by: null,
      access_provided_by_role: null,
      engagement_score: null,
      description: null,
      comments: null,
      _errors: [],
    };

    // Map values
    Object.entries(row).forEach(([excelHeader, value]) => {
      const dbField = columnMapping[excelHeader];
      if (!dbField) return;

      // Handle dates
      if (dbField.includes('_date')) {
        mapped[dbField] = parseDate(value);
      }
      // Handle user IDs (account_manager, sales_poc)
      else if (dbField === 'account_manager') {
        const userId = findUserByName(users, value);
        mapped.account_manager_id = userId;
        if (value && !userId) {
          mapped._errors.push(`Account Manager "${value}" not found`);
        }
      }
      else if (dbField === 'sales_poc_id') {
        const userId = findUserByName(users, value);
        mapped.sales_poc_id = userId;
        if (value && !userId) {
          mapped._errors.push(`Sales POC "${value}" not found`);
        }
      }
      // Handle engagement score
      else if (dbField === 'engagement_score') {
        const score = parseInt(value);
        if (!isNaN(score)) {
          mapped.engagement_score = Math.max(0, Math.min(100, score));
        }
      }
      // Handle everything else
      else {
        mapped[dbField] = value ? String(value).trim() : null;
      }
    });

    // Validation
    if (!mapped.org_name) {
      mapped._errors.push('Organization name is required');
    }

    return mapped;
  });

  return mappedData;
}

function printPreview(mappedData) {
  console.log('\n' + '='.repeat(100));
  console.log('📋 DATA PREVIEW (First 10 rows)');
  console.log('='.repeat(100) + '\n');

  mappedData.slice(0, 10).forEach(row => {
    console.log(`Row ${row._rowNumber}:`);
    console.log(`  Name: ${row.org_name || '(missing)'}`);
    console.log(`  Domain: ${row.org_domain || '(none)'}`);
    console.log(`  Stage: ${row.org_lifecycle_stage || '(none)'}`);
    console.log(`  Trial Start: ${row.trial_start_date || '(none)'}`);
    console.log(`  Trial End: ${row.trial_end_date || '(none)'}`);
    console.log(`  Account Manager ID: ${row.account_manager_id || '(none)'}`);
    console.log(`  Sales POC ID: ${row.sales_poc_id || '(none)'}`);
    console.log(`  Engagement Score: ${row.engagement_score || '(none)'}`);

    if (row._errors.length > 0) {
      console.log(`  ⚠️  Errors: ${row._errors.join(', ')}`);
    }

    console.log('');
  });

  if (mappedData.length > 10) {
    console.log(`... and ${mappedData.length - 10} more rows\n`);
  }
}

function printSummary(mappedData) {
  const totalRows = mappedData.length;
  const rowsWithErrors = mappedData.filter(r => r._errors.length > 0).length;
  const validRows = totalRows - rowsWithErrors;

  console.log('\n' + '='.repeat(100));
  console.log('📊 IMPORT SUMMARY');
  console.log('='.repeat(100) + '\n');
  console.log(`Total Rows: ${totalRows}`);
  console.log(`Valid Rows: ${validRows}`);
  console.log(`Rows with Errors: ${rowsWithErrors}\n`);

  if (rowsWithErrors > 0) {
    console.log('⚠️  ROWS WITH ERRORS:\n');
    mappedData.filter(r => r._errors.length > 0).forEach(row => {
      console.log(`  Row ${row._rowNumber}: ${row.org_name || '(no name)'}`);
      console.log(`    Errors: ${row._errors.join(', ')}\n`);
    });
  }
}

async function askQuestion(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer);
    });
  });
}

async function importToDatabase(mappedData) {
  console.log('\n🗑️  Step 1: Deleting all existing trial organizations...\n');

  const { error: deleteError } = await supabase
    .from('trial_organizations')
    .delete()
    .neq('org_id', '00000000-0000-0000-0000-000000000000');

  if (deleteError) {
    throw new Error(`Failed to delete: ${deleteError.message}`);
  }

  console.log('✅ All existing trial organizations deleted\n');

  // Filter out rows with errors
  const validRows = mappedData.filter(r => r._errors.length === 0);

  console.log(`📥 Step 2: Inserting ${validRows.length} new organizations...\n`);

  // Prepare data for insert (remove internal fields)
  const insertData = validRows.map(row => {
    const { _rowNumber, _errors, ...data } = row;
    return data;
  });

  // Batch insert
  const { data: inserted, error: insertError } = await supabase
    .from('trial_organizations')
    .insert(insertData)
    .select();

  if (insertError) {
    throw new Error(`Failed to insert: ${insertError.message}`);
  }

  console.log(`✅ Successfully imported ${inserted?.length || 0} organizations\n`);

  return inserted;
}

// ============================================================
// Main Script
// ============================================================

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║   ONE-TIME TRIAL ORGANIZATIONS IMPORT SCRIPT                   ║');
  console.log('║   Simple, interactive import from Excel/CSV                    ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  // Get file path from command line
  const filePath = process.argv[2];

  if (!filePath) {
    console.error('❌ Please provide the Excel/CSV file path');
    console.error('\nUsage:');
    console.error('  node scripts/one-time-trial-orgs-import.js path/to/your/file.xlsx\n');
    process.exit(1);
  }

  try {
    // 1. Fetch users for mapping
    console.log('👥 Fetching users from database...\n');
    const users = await fetchUsers();
    console.log(`✅ Found ${users.length} users\n`);

    // 2. Read Excel file
    const rawData = readExcelFile(filePath);

    // 3. Map to database fields
    const mappedData = await mapDataToDbFields(rawData, users);

    // 4. Show preview
    printPreview(mappedData);

    // 5. Show summary
    printSummary(mappedData);

    // 6. Ask for confirmation
    console.log('⚠️  WARNING: This will DELETE all existing trial organizations and replace them!\n');
    const answer1 = await askQuestion('Do you want to proceed? (yes/no): ');

    if (answer1.toLowerCase() !== 'yes') {
      console.log('\n❌ Import cancelled by user\n');
      process.exit(0);
    }

    const answer2 = await askQuestion('\nAre you ABSOLUTELY sure? This cannot be undone! (yes/no): ');

    if (answer2.toLowerCase() !== 'yes') {
      console.log('\n❌ Import cancelled by user\n');
      process.exit(0);
    }

    // 7. Import to database
    console.log('\n🚀 Starting import...\n');
    const result = await importToDatabase(mappedData);

    // 8. Success!
    console.log('='.repeat(100));
    console.log('🎉 IMPORT COMPLETE!');
    console.log('='.repeat(100) + '\n');
    console.log(`✅ Imported ${result.length} trial organizations`);
    console.log(`✅ Account managers will now see their assigned organizations`);
    console.log('\n💡 Next Steps:');
    console.log('1. Visit /support/trials to view all organizations');
    console.log('2. Account managers will only see their assigned orgs');
    console.log('3. Admins will see all organizations');
    console.log('\n✨ You can now delete this script - it was a one-time operation!\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('\nFull error details:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);
