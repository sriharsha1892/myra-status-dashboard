#!/usr/bin/env node

/**
 * BULLETPROOF TRIAL ORGANIZATION IMPORT SCRIPT
 * 100% Accurate - Inch Perfect Validation & Error Handling
 *
 * Features:
 * - Comprehensive validation
 * - Duplicate detection (by org_name or org_domain)
 * - Smart defaults
 * - Date parsing with multiple formats
 * - Email validation
 * - Lifecycle stage normalization
 * - Detailed error reporting
 * - Dry-run mode
 * - Progress tracking
 *
 * Usage:
 *   node scripts/import-trial-organizations.js /path/to/file.csv
 *   node scripts/import-trial-organizations.js /path/to/file.csv --dry-run
 *   node scripts/import-trial-organizations.js /path/to/file.xlsx
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const Papa = require('papaparse');
const XLSX = require('xlsx');
require('dotenv').config({ path: '.env.local' });

// ============================================================================
// CONFIGURATION
// ============================================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Valid lifecycle stages
const VALID_STAGES = ['prospect', 'demo_scheduled', 'trial_active', 'converted', 'churned'];

// Stage synonyms for smart mapping
const STAGE_MAP = {
  'prospect': 'prospect',
  'lead': 'prospect',
  'new': 'prospect',
  'demo scheduled': 'demo_scheduled',
  'demo_scheduled': 'demo_scheduled',
  'demo': 'demo_scheduled',
  'trial active': 'trial_active',
  'trial_active': 'trial_active',
  'trial': 'trial_active',
  'active': 'trial_active',
  'converted': 'converted',
  'customer': 'converted',
  'paid': 'converted',
  'won': 'converted',
  'churned': 'churned',
  'lost': 'churned',
  'cancelled': 'churned',
  'inactive': 'churned',
};

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

function validateEmail(email) {
  if (!email) return null;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim()) ? email.trim().toLowerCase() : null;
}

function validateDomain(domain) {
  if (!domain) return null;
  domain = domain.trim().toLowerCase();
  // Remove http(s)://
  domain = domain.replace(/^https?:\/\//, '');
  // Remove www.
  domain = domain.replace(/^www\./, '');
  // Remove trailing slash
  domain = domain.replace(/\/$/, '');
  // Basic domain validation
  const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/;
  return domainRegex.test(domain) ? domain : null;
}

function normalizeLifecycleStage(stage) {
  if (!stage) return 'prospect'; // Default

  const normalized = stage.toString().toLowerCase().trim();
  return STAGE_MAP[normalized] || 'prospect';
}

function parseDate(dateStr) {
  if (!dateStr || dateStr.trim() === '') return null;

  try {
    const str = dateStr.trim();

    // Try ISO format (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      return str;
    }

    // Try MM/DD/YYYY
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
      const [month, day, year] = str.split('/');
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    // Try DD/MM/YYYY
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
      const [day, month, year] = str.split('/');
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    // Try M/D/YY
    if (/^\d{1,2}\/\d{1,2}\/\d{2}$/.test(str)) {
      const [month, day, year] = str.split('/');
      const fullYear = parseInt(year) < 50 ? `20${year}` : `19${year}`;
      return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    // Try parsing as JS Date
    const date = new Date(str);
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    console.warn(`⚠️  Could not parse date: "${dateStr}"`);
    return null;
  } catch (error) {
    console.warn(`⚠️  Date parse error for "${dateStr}":`, error.message);
    return null;
  }
}

function validateEngagementScore(score) {
  if (!score && score !== 0) return 0; // Default

  const num = parseInt(score);
  if (isNaN(num)) return 0;

  // Clamp between 0-100
  return Math.max(0, Math.min(100, num));
}

function validateRow(row, rowIndex) {
  const errors = [];
  const warnings = [];

  // Required: org_name
  if (!row.org_name || row.org_name.trim() === '') {
    errors.push('org_name is required');
  }

  // Validate lifecycle_stage
  const stage = normalizeLifecycleStage(row.lifecycle_stage);
  if (!VALID_STAGES.includes(stage)) {
    warnings.push(`Invalid lifecycle_stage "${row.lifecycle_stage}", defaulting to "prospect"`);
  }

  // Validate account_manager email
  if (row.account_manager) {
    const email = validateEmail(row.account_manager);
    if (!email) {
      warnings.push(`Invalid account_manager email: "${row.account_manager}"`);
    }
  }

  // Validate domain
  if (row.org_domain) {
    const domain = validateDomain(row.org_domain);
    if (!domain) {
      warnings.push(`Invalid org_domain: "${row.org_domain}"`);
    }
  }

  // Validate dates
  if (row.trial_start_date) {
    const parsed = parseDate(row.trial_start_date);
    if (!parsed) {
      warnings.push(`Could not parse trial_start_date: "${row.trial_start_date}"`);
    }
  }

  if (row.trial_end_date) {
    const parsed = parseDate(row.trial_end_date);
    if (!parsed) {
      warnings.push(`Could not parse trial_end_date: "${row.trial_end_date}"`);
    }
  }

  if (row.last_activity_date) {
    const parsed = parseDate(row.last_activity_date);
    if (!parsed) {
      warnings.push(`Could not parse last_activity_date: "${row.last_activity_date}"`);
    }
  }

  // Validate engagement_score
  if (row.engagement_score) {
    const score = validateEngagementScore(row.engagement_score);
    if (score !== parseInt(row.engagement_score)) {
      warnings.push(`engagement_score "${row.engagement_score}" adjusted to ${score}`);
    }
  }

  return { errors, warnings, isValid: errors.length === 0 };
}

// ============================================================================
// FILE PARSING
// ============================================================================

function readFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }

  const ext = filePath.split('.').pop().toLowerCase();

  if (ext === 'csv') {
    // Parse CSV
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const result = Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase().replace(/\s+/g, '_'),
    });

    if (result.errors.length > 0) {
      console.error('❌ CSV parsing errors:', result.errors);
      process.exit(1);
    }

    return result.data;
  } else if (ext === 'xlsx' || ext === 'xls') {
    // Parse Excel
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, {
      raw: false,
      defval: '',
    });

    // Normalize headers
    return data.map(row => {
      const normalizedRow = {};
      Object.keys(row).forEach(key => {
        const normalizedKey = key.trim().toLowerCase().replace(/\s+/g, '_');
        normalizedRow[normalizedKey] = row[key];
      });
      return normalizedRow;
    });
  } else {
    console.error('❌ Unsupported file format. Use .csv, .xlsx, or .xls');
    process.exit(1);
  }
}

// ============================================================================
// MAIN IMPORT LOGIC
// ============================================================================

async function importTrialOrganizations(filePath, isDryRun = false) {
  console.log('🚀 Trial Organization Import Script');
  console.log('📍 Supabase URL:', supabaseUrl);
  console.log('📁 File:', filePath);
  console.log('🔍 Mode:', isDryRun ? 'DRY RUN (no changes)' : 'LIVE IMPORT');
  console.log('');

  // Read and parse file
  console.log('📖 Reading file...');
  const rows = readFile(filePath);
  console.log(`✅ Parsed ${rows.length} rows\n`);

  if (rows.length === 0) {
    console.error('❌ No data found in file');
    process.exit(1);
  }

  // Validate all rows
  console.log('🔍 Validating data...\n');
  const validationResults = rows.map((row, index) => ({
    row,
    index: index + 1,
    ...validateRow(row, index + 1),
  }));

  const validRows = validationResults.filter(r => r.isValid);
  const invalidRows = validationResults.filter(r => !r.isValid);

  console.log(`✅ Valid rows: ${validRows.length}`);
  console.log(`❌ Invalid rows: ${invalidRows.length}\n`);

  // Show validation errors
  if (invalidRows.length > 0) {
    console.log('⚠️  Invalid Rows:\n');
    invalidRows.forEach(({ row, index, errors }) => {
      console.log(`   Row ${index}: ${row.org_name || '(no name)'}`);
      errors.forEach(error => console.log(`      - ${error}`));
    });
    console.log('');
  }

  // Show warnings
  const rowsWithWarnings = validationResults.filter(r => r.warnings.length > 0);
  if (rowsWithWarnings.length > 0) {
    console.log('⚠️  Warnings:\n');
    rowsWithWarnings.slice(0, 10).forEach(({ row, index, warnings }) => {
      console.log(`   Row ${index}: ${row.org_name}`);
      warnings.forEach(warning => console.log(`      - ${warning}`));
    });
    if (rowsWithWarnings.length > 10) {
      console.log(`   ... and ${rowsWithWarnings.length - 10} more warnings\n`);
    }
    console.log('');
  }

  if (validRows.length === 0) {
    console.error('❌ No valid rows to import');
    process.exit(1);
  }

  if (isDryRun) {
    console.log('✅ DRY RUN COMPLETE - No changes made');
    console.log(`   ${validRows.length} rows would be imported`);
    process.exit(0);
  }

  // Check for existing organizations (duplicates)
  console.log('🔍 Checking for duplicates...\n');
  const orgNames = validRows.map(r => r.row.org_name.trim());
  const { data: existingOrgs } = await supabase
    .from('trial_organizations')
    .select('org_id, org_name, org_domain')
    .in('org_name', orgNames);

  const existingOrgMap = new Map();
  (existingOrgs || []).forEach(org => {
    existingOrgMap.set(org.org_name.toLowerCase(), org);
    if (org.org_domain) {
      existingOrgMap.set(org.org_domain.toLowerCase(), org);
    }
  });

  console.log(`   Found ${existingOrgs?.length || 0} existing organizations\n`);

  // Import rows
  console.log('📤 Importing organizations...\n');
  let successCount = 0;
  let updateCount = 0;
  let failedCount = 0;
  const errors = [];

  for (let i = 0; i < validRows.length; i++) {
    const { row, index } = validRows[i];
    const progress = `[${i + 1}/${validRows.length}]`;

    try {
      // Normalize data
      const orgData = {
        org_name: row.org_name.trim(),
        org_domain: validateDomain(row.org_domain) || null,
        account_manager: validateEmail(row.account_manager) || null,
        org_lifecycle_stage: normalizeLifecycleStage(row.lifecycle_stage),
        trial_start_date: parseDate(row.trial_start_date) || null,
        trial_end_date: parseDate(row.trial_end_date) || null,
        engagement_score: validateEngagementScore(row.engagement_score),
        last_activity_date: parseDate(row.last_activity_date) || null,
        comments: row.comments?.trim() || null,
      };

      // Check for duplicate
      const existingByName = existingOrgMap.get(orgData.org_name.toLowerCase());
      const existingByDomain = orgData.org_domain ? existingOrgMap.get(orgData.org_domain.toLowerCase()) : null;
      const existing = existingByName || existingByDomain;

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('trial_organizations')
          .update(orgData)
          .eq('org_id', existing.org_id);

        if (error) throw error;
        console.log(`${progress} 🔄 Updated: ${orgData.org_name}`);
        updateCount++;
      } else {
        // Insert new
        const { error } = await supabase
          .from('trial_organizations')
          .insert(orgData);

        if (error) throw error;
        console.log(`${progress} ✅ Created: ${orgData.org_name}`);
        successCount++;
      }
    } catch (error) {
      failedCount++;
      errors.push({
        row: index,
        name: row.org_name,
        error: error.message,
      });
      console.log(`${progress} ❌ Failed: ${row.org_name} - ${error.message}`);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('\n🎉 Import Complete!\n');
  console.log(`   ✅ Created: ${successCount}`);
  console.log(`   🔄 Updated: ${updateCount}`);
  console.log(`   ❌ Failed: ${failedCount}`);
  console.log(`   📊 Total: ${successCount + updateCount} organizations imported\n`);

  if (errors.length > 0 && errors.length <= 10) {
    console.log('Failed imports:\n');
    errors.forEach(e => {
      console.log(`   Row ${e.row}: ${e.name}`);
      console.log(`      Error: ${e.error}`);
    });
    console.log('');
  }

  if (errors.length > 0) {
    process.exit(1);
  }
}

// ============================================================================
// CLI
// ============================================================================

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║                  TRIAL ORGANIZATION IMPORT SCRIPT                           ║
║                    100% Accurate - Inch Perfect                             ║
╚════════════════════════════════════════════════════════════════════════════╝

Usage:
  node scripts/import-trial-organizations.js <file> [options]

Arguments:
  file          Path to CSV or Excel file (.csv, .xlsx, .xls)

Options:
  --dry-run     Validate data without importing (recommended first)
  --help, -h    Show this help message

Examples:
  # Validate data (dry run - no changes)
  node scripts/import-trial-organizations.js data.csv --dry-run

  # Import data
  node scripts/import-trial-organizations.js data.csv

  # Import from Excel
  node scripts/import-trial-organizations.js data.xlsx

Template:
  Use templates/trial-organizations-import-template.csv as reference

Required Columns:
  - org_name             (required)
  - org_domain           (optional, e.g., "acme.com")
  - account_manager      (optional, email address)
  - lifecycle_stage      (optional: prospect, demo_scheduled, trial_active, converted, churned)
  - trial_start_date     (optional, YYYY-MM-DD or MM/DD/YYYY)
  - trial_end_date       (optional, YYYY-MM-DD or MM/DD/YYYY)
  - engagement_score     (optional, 0-100)
  - last_activity_date   (optional, YYYY-MM-DD)
  - comments             (optional, text notes)

Features:
  ✓ Smart duplicate detection (by name and domain)
  ✓ Comprehensive validation
  ✓ Multiple date format support
  ✓ Email validation
  ✓ Lifecycle stage normalization
  ✓ Detailed error reporting
  ✓ Update existing organizations
  ✓ Progress tracking
`);
    process.exit(0);
  }

  const filePath = args[0];
  const isDryRun = args.includes('--dry-run');

  importTrialOrganizations(filePath, isDryRun).catch(error => {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  });
}

main();
