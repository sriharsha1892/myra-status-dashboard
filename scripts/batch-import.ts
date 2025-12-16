#!/usr/bin/env tsx
/**
 * @deprecated This CLI script is deprecated. Use the web UI instead:
 *   - Navigate to /bulk-import for the unified import dashboard
 *   - Use CSV Organizations or Smart Import tools
 *
 * Batch Import Tool - Non-Interactive Version
 *
 * Imports organizations and users from CSV without prompts
 * Usage: tsx scripts/batch-import.ts <file.csv> [account-manager-email]
 */

console.warn('\n⚠️  DEPRECATED: This CLI script is deprecated.');
console.warn('   Use the web UI at /bulk-import instead.\n');

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables from .env.local
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
}

// ============================================================================
// TYPES
// ============================================================================

interface OrgData {
  org_name: string;
  website_url: string;
  domain_category: string;
  description: string;
  contact_name: string;
  contact_email: string;
  contact_designation: string;
  sales_poc_name?: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const DOMAIN_MAP: Record<string, string> = {
  'TMT': 'TMT',
  'AF&B': 'AF&B',
  'E&C': 'E&C',
  'HC': 'HC',
  'NEO': 'NEO',
  'AAD': 'AAD',
  'AUTO': 'TMT',
  'F&B': 'AF&B',
  'AGRI': 'AF&B',
  'C&M': 'E&C',
  'ICT': 'TMT',
  'Consulting': 'TMT',
  'Packaging': 'TMT',
  'Media': 'TMT',
};

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bright: '\x1b[1m',
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function log(message: string, color: keyof typeof COLORS = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function normalizeUrl(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

function generateLogoUrl(websiteUrl: string, orgName: string): string {
  const domain = websiteUrl.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  if (domain) {
    return `https://logo.clearbit.com/${domain}`;
  }
  const initials = orgName
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&size=200&background=3B82F6&color=ffffff&bold=true`;
}

function parseCSV(content: string): OrgData[] {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length < 2) {
    throw new Error('CSV file must have at least a header row and one data row');
  }

  const headers = lines[0].split(',').map(h => h.trim());
  const data: OrgData[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const row: any = {};

    headers.forEach((header, index) => {
      if (values[index]) {
        row[header] = values[index];
      }
    });

    if (row.org_name && row.contact_email) {
      data.push({
        org_name: row.org_name,
        website_url: row.website_url || '',
        domain_category: DOMAIN_MAP[row.domain_category] || row.domain_category || 'TMT',
        description: row.description || `${row.org_name} is a professional organization.`,
        contact_name: row.contact_name || '',
        contact_email: row.contact_email,
        contact_designation: row.contact_designation || '',
        sales_poc_name: row.sales_poc_name || '',
      });
    }
  }

  return data;
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

function fuzzyMatchAccountManager(salesPocName: string, managers: any[]): any | null {
  if (!salesPocName) return null;

  const searchName = salesPocName.toLowerCase().trim();

  // Try exact match first
  let match = managers.find(m =>
    m.full_name?.toLowerCase().includes(searchName) ||
    m.email?.toLowerCase().includes(searchName)
  );

  if (match) return match;

  // Try partial match (first name)
  const firstWord = searchName.split(/[\/\s]/)[0]; // Handle "Rupak/Paras" or "Rupak Paras"
  match = managers.find(m =>
    m.full_name?.toLowerCase().includes(firstWord) ||
    m.email?.toLowerCase().startsWith(firstWord)
  );

  return match || null;
}

async function createOrganization(
  supabase: ReturnType<typeof createClient>,
  data: OrgData,
  accountManagerId: string | null,
  salesPocId: string | null
): Promise<string | null> {
  try {
    const normalizedUrl = normalizeUrl(data.website_url);
    const logoUrl = generateLogoUrl(normalizedUrl, data.org_name);

    // Insert organization
    const { data: newOrg, error: orgError } = await supabase
      .from('trial_organizations')
      .insert({
        org_name: data.org_name,
        domain: data.domain_category,
        org_url: normalizedUrl,
        logo_url: logoUrl,
        description: data.description,
        sales_poc_id: salesPocId,
        account_manager_id: accountManagerId,
        org_lifecycle_stage: 'prospect',
        trial_status: 'requested',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('org_id')
      .single();

    if (orgError) throw orgError;
    if (!newOrg) throw new Error('Failed to create organization');

    // Insert primary contact
    if (data.contact_name && data.contact_email) {
      const { error: contactError } = await supabase
        .from('trial_users')
        .insert({
          org_id: newOrg.org_id,
          name: data.contact_name,
          email: data.contact_email,
          role: data.contact_designation || null,
          current_stage: 'invited',
          account_manager: data.account_manager_id || '',
          created_at: new Date().toISOString(),
        });

      if (contactError) throw contactError;
    }

    log(`✅ Created: ${data.org_name}`, 'green');
    return newOrg.org_id;
  } catch (err: any) {
    log(`❌ Failed: ${data.org_name} - ${err.message}`, 'red');
    return null;
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.clear();
  log('\n🚀 BATCH IMPORT TOOL - Trial Organizations\n', 'bright');

  // Check environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !supabaseKey) {
    log('❌ Missing Supabase environment variables!', 'red');
    console.log('\nRequired in .env.local:');
    console.log('  NEXT_PUBLIC_SUPABASE_URL=...');
    console.log('  SUPABASE_SERVICE_ROLE_KEY=...');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Get file path
  const args = process.argv.slice(2);
  if (args.length === 0) {
    log('❌ No import file specified!', 'red');
    console.log('\nUsage:');
    console.log('  tsx scripts/batch-import.ts <file.csv> [account-manager-email]');
    console.log('\nExample:');
    console.log('  tsx scripts/batch-import.ts myra-clean-import.csv sarah@myra.ai');
    process.exit(1);
  }

  const filePath = args[0];
  const defaultAMEmail = args[1];

  if (!fs.existsSync(filePath)) {
    log(`❌ File not found: ${filePath}`, 'red');
    process.exit(1);
  }

  // Fetch account managers
  log('📋 Fetching account managers...', 'cyan');
  const { data: managers, error: managersError } = await supabase
    .from('users')
    .select('id, full_name, email, role')
    .in('role', ['Admin', 'Account Manager']);

  let accountManagerId: string | null = null;

  if (managersError) {
    log(`⚠️  Could not fetch account managers: ${managersError.message}`, 'yellow');
    log('⚠️  Will create organizations without account manager assignment', 'yellow');
  } else if (!managers || managers.length === 0) {
    log('⚠️  No account managers found in database', 'yellow');
    log('⚠️  Organizations will be created without account manager assignment', 'yellow');
    log('⚠️  You can assign them later through the UI', 'yellow');
  } else {
    log(`✅ Found ${managers.length} account managers`, 'green');
    managers.forEach((am, idx) => {
      console.log(`  ${idx + 1}. ${am.full_name} (${am.email})`);
    });

    // Select account manager
    if (defaultAMEmail) {
      const am = managers.find(m => m.email.toLowerCase() === defaultAMEmail.toLowerCase());
      if (!am) {
        log(`⚠️  Account manager not found: ${defaultAMEmail}`, 'yellow');
        log(`⚠️  Using first account manager: ${managers[0].full_name}`, 'yellow');
        accountManagerId = managers[0].id;
      } else {
        accountManagerId = am.id;
        log(`\n✅ Using account manager: ${am.full_name} (${am.email})`, 'green');
      }
    } else {
      // Use first account manager as default
      accountManagerId = managers[0].id;
      log(`\n✅ Using default account manager: ${managers[0].full_name}`, 'green');
    }
  }

  // Fetch sales POCs
  const { data: pocs } = await supabase
    .from('sales_pocs')
    .select('id, name, email');

  // Parse CSV
  log(`\n📄 Reading file: ${filePath}`, 'cyan');
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const orgsData = parseCSV(fileContent);
  log(`✅ Parsed ${orgsData.length} organizations from CSV\n`, 'green');

  // Process each organization
  const results = {
    total: orgsData.length,
    created: 0,
    failed: 0,
  };

  console.log('─'.repeat(80));
  log('Starting import...', 'bright');
  console.log('─'.repeat(80) + '\n');

  for (let i = 0; i < orgsData.length; i++) {
    const org = orgsData[i];
    const progress = `[${i + 1}/${orgsData.length}]`;

    console.log(`${progress} Processing: ${org.org_name}...`);

    // Match sales POC name to account manager
    let orgAccountManagerId = accountManagerId; // Use default if no match
    if (org.sales_poc_name && managers && managers.length > 0) {
      const matchedAM = fuzzyMatchAccountManager(org.sales_poc_name, managers);
      if (matchedAM) {
        orgAccountManagerId = matchedAM.id;
        console.log(`    → Assigned to: ${matchedAM.full_name}`);
      } else if (accountManagerId) {
        console.log(`    → Using default AM (no match for "${org.sales_poc_name}")`);
      }
    }

    // Try to match sales POC (from sales_pocs table, different from account managers)
    let salesPocId: string | null = null;
    if (org.sales_poc_name && pocs) {
      const poc = pocs.find(p =>
        p.name.toLowerCase().includes(org.sales_poc_name!.toLowerCase()) ||
        p.email.toLowerCase().includes(org.sales_poc_name!.toLowerCase())
      );
      if (poc) {
        salesPocId = poc.id;
      }
    }

    const orgId = await createOrganization(supabase, org, orgAccountManagerId, salesPocId);
    if (orgId) {
      results.created++;
    } else {
      results.failed++;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  log('\n📊 IMPORT SUMMARY\n', 'bright');
  console.log('='.repeat(80));
  console.log(`Total organizations processed: ${results.total}`);
  log(`✅ Successfully created:        ${results.created}`, 'green');
  if (results.failed > 0) {
    log(`❌ Failed:                       ${results.failed}`, 'red');
  }
  console.log('='.repeat(80) + '\n');

  if (results.created > 0) {
    log('🎉 Import completed successfully!', 'green');
    console.log('\nNext steps:');
    console.log('  1. Visit /support/trials to view imported organizations');
    console.log('  2. Add additional contacts through the UI for orgs with multiple contacts');
    console.log('  3. Update trial status and lifecycle stages as needed\n');
  }
}

// Run the script
main().catch((err) => {
  log(`\n❌ Unexpected error: ${err.message}`, 'red');
  console.error(err);
  process.exit(1);
});
