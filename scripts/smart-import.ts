#!/usr/bin/env tsx
/**
 * Smart Import Tool for Trial Organizations & Users
 *
 * Features:
 * - CSV/JSON import with auto-detection
 * - Smart defaults (80% automation)
 * - Interactive field editing
 * - Logo URL fetching from Clearbit/Google
 * - Domain categorization
 * - Batch processing with progress
 *
 * Usage:
 *   npm run smart-import <file.csv>
 *   npm run smart-import <file.json>
 *   npm run smart-import --interactive
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

// ============================================================================
// TYPES
// ============================================================================

interface RawOrgData {
  org_name: string;
  website_url?: string;
  domain_category?: string;
  description?: string;
  contact_name?: string;
  contact_email?: string;
  contact_designation?: string;
  account_manager_email?: string;
  sales_poc_name?: string;
}

interface EnrichedOrgData {
  // Organization fields
  org_name: string;
  domain: string;
  org_url: string;
  logo_url: string;
  description: string;
  account_manager_id: string;
  sales_poc_id: string | null;
  org_lifecycle_stage: string;
  trial_status: string;

  // Primary contact fields
  contact_name: string;
  contact_email: string;
  contact_designation: string;
}

interface AccountManager {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

interface SalesPOC {
  id: string;
  name: string;
  email: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const DOMAIN_CATEGORIES = {
  'TMT': ['technology', 'software', 'tech', 'digital', 'it', 'computer', 'internet', 'telecom', 'media'],
  'NEO': ['startup', 'venture', 'innovation', 'new economy', 'fintech', 'edtech'],
  'AF&B': ['agriculture', 'food', 'beverage', 'farming', 'agri', 'nutrition', 'dairy'],
  'E&C': ['engineering', 'construction', 'infrastructure', 'building', 'contractor'],
  'HC': ['healthcare', 'hospital', 'medical', 'pharma', 'pharmaceutical', 'health'],
  'AAD': ['architecture', 'art', 'design', 'creative', 'studio'],
};

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function log(message: string, color: keyof typeof COLORS = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function error(message: string) {
  log(`❌ ${message}`, 'red');
}

function success(message: string) {
  log(`✅ ${message}`, 'green');
}

function info(message: string) {
  log(`ℹ️  ${message}`, 'cyan');
}

function warn(message: string) {
  log(`⚠️  ${message}`, 'yellow');
}

function normalizeUrl(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

function getDomainFromUrl(url: string): string {
  try {
    const normalized = normalizeUrl(url);
    const urlObj = new URL(normalized);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return '';
  }
}

function getOrgInitials(name: string): string {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

function detectDomainCategory(orgName: string, websiteUrl: string, description: string = ''): string {
  const searchText = `${orgName} ${websiteUrl} ${description}`.toLowerCase();

  for (const [category, keywords] of Object.entries(DOMAIN_CATEGORIES)) {
    for (const keyword of keywords) {
      if (searchText.includes(keyword)) {
        return category;
      }
    }
  }

  return 'TMT'; // Default fallback
}

function generateLogoUrl(websiteUrl: string, orgName: string): string {
  const domain = getDomainFromUrl(websiteUrl);
  if (domain) {
    // Try Clearbit Logo API first
    return `https://logo.clearbit.com/${domain}`;
  }
  // Fallback to placeholder with initials
  const initials = getOrgInitials(orgName);
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&size=200&background=3B82F6&color=ffffff&bold=true`;
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateUrl(url: string): boolean {
  try {
    new URL(normalizeUrl(url));
    return true;
  } catch {
    return false;
  }
}

async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// ============================================================================
// CSV PARSING
// ============================================================================

function parseCSV(content: string): RawOrgData[] {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length < 2) {
    throw new Error('CSV file must have at least a header row and one data row');
  }

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'));
  const data: RawOrgData[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const row: any = {};

    headers.forEach((header, index) => {
      if (values[index]) {
        row[header] = values[index];
      }
    });

    // Map common column name variations to standard fields
    const normalized: Partial<RawOrgData> = {
      org_name: row.org_name || row.organization || row.company || row.name || '',
      website_url: row.website_url || row.website || row.url || row.domain || '',
      domain_category: row.domain_category || row.domain || row.category || '',
      description: row.description || row.about || row.desc || '',
      contact_name: row.contact_name || row.contact || row.primary_contact || '',
      contact_email: row.contact_email || row.email || '',
      contact_designation: row.contact_designation || row.designation || row.title || row.role || '',
      account_manager_email: row.account_manager_email || row.account_manager || row.am_email || '',
      sales_poc_name: row.sales_poc_name || row.sales_poc || row.poc || '',
    };

    if (normalized.org_name) {
      data.push(normalized as RawOrgData);
    }
  }

  return data;
}

function parseJSON(content: string): RawOrgData[] {
  const parsed = JSON.parse(content);
  return Array.isArray(parsed) ? parsed : [parsed];
}

// ============================================================================
// SMART ENRICHMENT
// ============================================================================

async function enrichOrganizationData(
  raw: RawOrgData,
  accountManagers: AccountManager[],
  salesPOCs: SalesPOC[]
): Promise<Partial<EnrichedOrgData>> {
  const enriched: Partial<EnrichedOrgData> = {};

  // Basic fields
  enriched.org_name = raw.org_name;

  // Website URL (required)
  if (raw.website_url) {
    enriched.org_url = normalizeUrl(raw.website_url);
  } else {
    // Try to guess from company name
    const guessedDomain = raw.org_name.toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[^a-z0-9]/g, '');
    enriched.org_url = `https://${guessedDomain}.com`;
    warn(`No website provided for ${raw.org_name}, guessing: ${enriched.org_url}`);
  }

  // Logo URL
  enriched.logo_url = generateLogoUrl(enriched.org_url, raw.org_name);

  // Domain category
  enriched.domain = raw.domain_category || detectDomainCategory(
    raw.org_name,
    enriched.org_url,
    raw.description || ''
  );

  // Description
  if (raw.description) {
    enriched.description = raw.description;
  } else {
    enriched.description = `${raw.org_name} is a professional organization.`;
    warn(`No description provided for ${raw.org_name}, using placeholder`);
  }

  // Account Manager
  if (raw.account_manager_email) {
    const am = accountManagers.find(m =>
      m.email.toLowerCase() === raw.account_manager_email.toLowerCase()
    );
    if (am) {
      enriched.account_manager_id = am.id;
    } else {
      warn(`Account manager not found: ${raw.account_manager_email}`);
    }
  }

  // Sales POC
  if (raw.sales_poc_name) {
    const poc = salesPOCs.find(p =>
      p.name.toLowerCase().includes(raw.sales_poc_name.toLowerCase()) ||
      p.email.toLowerCase().includes(raw.sales_poc_name.toLowerCase())
    );
    enriched.sales_poc_id = poc?.id || null;
  } else {
    enriched.sales_poc_id = null;
  }

  // Lifecycle and status
  enriched.org_lifecycle_stage = 'prospect';
  enriched.trial_status = 'requested';

  // Contact information
  enriched.contact_name = raw.contact_name || '';
  enriched.contact_email = raw.contact_email || '';
  enriched.contact_designation = raw.contact_designation || '';

  return enriched;
}

// ============================================================================
// INTERACTIVE EDITING
// ============================================================================

async function reviewAndEdit(data: Partial<EnrichedOrgData>): Promise<EnrichedOrgData | null> {
  console.log('\n' + '='.repeat(80));
  log(`\n📋 ORGANIZATION: ${data.org_name}`, 'bright');
  console.log('='.repeat(80));

  // Display current values
  console.log('\n📊 Current Values:');
  console.log(`  1. Organization Name: ${COLORS.cyan}${data.org_name}${COLORS.reset}`);
  console.log(`  2. Website URL:       ${COLORS.cyan}${data.org_url}${COLORS.reset}`);
  console.log(`  3. Logo URL:          ${COLORS.dim}${data.logo_url}${COLORS.reset}`);
  console.log(`  4. Domain Category:   ${COLORS.cyan}${data.domain}${COLORS.reset}`);
  console.log(`  5. Description:       ${COLORS.cyan}${data.description?.substring(0, 60)}...${COLORS.reset}`);
  console.log(`  6. Contact Name:      ${COLORS.cyan}${data.contact_name || '(empty)'}${COLORS.reset}`);
  console.log(`  7. Contact Email:     ${COLORS.cyan}${data.contact_email || '(empty)'}${COLORS.reset}`);
  console.log(`  8. Contact Designation: ${COLORS.cyan}${data.contact_designation || '(empty)'}${COLORS.reset}`);

  console.log('\n💡 Options:');
  console.log('  [Enter] Accept and continue');
  console.log('  [1-8]   Edit specific field');
  console.log('  [s]     Skip this organization');
  console.log('  [q]     Quit import');

  const choice = await prompt('\nYour choice: ');

  if (choice === '' || choice.toLowerCase() === 'y') {
    // Validate required fields
    if (!data.org_name || !data.org_url || !data.logo_url || !data.domain || !data.description) {
      error('Missing required organization fields!');
      return await reviewAndEdit(data);
    }

    if (!data.contact_name || !data.contact_email) {
      error('Missing required contact fields (name and email)!');
      return await reviewAndEdit(data);
    }

    if (!validateEmail(data.contact_email)) {
      error('Invalid contact email format!');
      return await reviewAndEdit(data);
    }

    return data as EnrichedOrgData;
  }

  if (choice === 's') {
    warn('Skipping organization');
    return null;
  }

  if (choice === 'q') {
    info('Import cancelled by user');
    process.exit(0);
  }

  // Edit specific field
  switch (choice) {
    case '1':
      data.org_name = await prompt(`New organization name [${data.org_name}]: `) || data.org_name;
      break;
    case '2':
      data.org_url = await prompt(`New website URL [${data.org_url}]: `) || data.org_url;
      data.org_url = normalizeUrl(data.org_url);
      // Regenerate logo based on new URL
      data.logo_url = generateLogoUrl(data.org_url, data.org_name!);
      break;
    case '3':
      data.logo_url = await prompt(`New logo URL [${data.logo_url}]: `) || data.logo_url;
      break;
    case '4':
      console.log('\nAvailable domains:');
      Object.keys(DOMAIN_CATEGORIES).forEach((cat, idx) => {
        console.log(`  ${idx + 1}. ${cat}`);
      });
      const domainChoice = await prompt(`Select domain (1-${Object.keys(DOMAIN_CATEGORIES).length}) or enter custom: `);
      const domainIndex = parseInt(domainChoice) - 1;
      if (domainIndex >= 0 && domainIndex < Object.keys(DOMAIN_CATEGORIES).length) {
        data.domain = Object.keys(DOMAIN_CATEGORIES)[domainIndex];
      } else {
        data.domain = domainChoice || data.domain;
      }
      break;
    case '5':
      data.description = await prompt(`New description (max 300 chars): `) || data.description;
      if (data.description.length > 300) {
        data.description = data.description.substring(0, 300);
        warn('Description truncated to 300 characters');
      }
      break;
    case '6':
      data.contact_name = await prompt(`Contact name [${data.contact_name}]: `) || data.contact_name;
      break;
    case '7':
      data.contact_email = await prompt(`Contact email [${data.contact_email}]: `) || data.contact_email;
      break;
    case '8':
      data.contact_designation = await prompt(`Contact designation [${data.contact_designation}]: `) || data.contact_designation;
      break;
    default:
      warn('Invalid choice');
  }

  return await reviewAndEdit(data);
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

async function createOrganization(
  supabase: ReturnType<typeof createClient>,
  data: EnrichedOrgData
): Promise<string | null> {
  try {
    // Insert organization
    const { data: newOrg, error: orgError } = await supabase
      .from('trial_organizations')
      .insert({
        org_name: data.org_name,
        domain: data.domain,
        org_url: data.org_url,
        logo_url: data.logo_url,
        description: data.description,
        sales_poc_id: data.sales_poc_id,
        account_manager_id: data.account_manager_id,
        org_lifecycle_stage: data.org_lifecycle_stage,
        trial_status: data.trial_status,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('org_id')
      .single();

    if (orgError) throw orgError;
    if (!newOrg) throw new Error('Failed to create organization');

    // Insert primary contact if provided
    if (data.contact_name && data.contact_email) {
      const { error: contactError } = await supabase
        .from('trial_users')
        .insert({
          org_id: newOrg.org_id,
          full_name: data.contact_name,
          email: data.contact_email,
          user_designation: data.contact_designation || null,
          is_primary_contact: true,
          user_status: 'invited',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (contactError) throw contactError;
    }

    success(`Created: ${data.org_name} (${newOrg.org_id})`);
    return newOrg.org_id;
  } catch (err: any) {
    error(`Failed to create ${data.org_name}: ${err.message}`);
    return null;
  }
}

// ============================================================================
// MAIN IMPORT FLOW
// ============================================================================

async function main() {
  console.clear();
  log('\n🚀 SMART IMPORT TOOL - Trial Organizations & Users\n', 'bright');

  // Get environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !supabaseKey) {
    error('Missing Supabase environment variables!');
    console.log('\nSet these in your .env.local:');
    console.log('  NEXT_PUBLIC_SUPABASE_URL=...');
    console.log('  SUPABASE_SERVICE_ROLE_KEY=...');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Fetch account managers and sales POCs
  info('Fetching account managers and sales POCs...');

  const { data: managers } = await supabase
    .from('users')
    .select('id, full_name, email, role')
    .in('role', ['admin', 'account_manager']);

  const { data: pocs } = await supabase
    .from('sales_pocs')
    .select('id, name, email');

  const accountManagers: AccountManager[] = managers || [];
  const salesPOCs: SalesPOC[] = pocs || [];

  success(`Loaded ${accountManagers.length} account managers and ${salesPOCs.length} sales POCs`);

  // Get import file
  const args = process.argv.slice(2);
  if (args.length === 0) {
    error('No import file specified!');
    console.log('\nUsage:');
    console.log('  npm run smart-import <file.csv>');
    console.log('  npm run smart-import <file.json>');
    console.log('\nExample CSV format:');
    console.log('  org_name,website_url,domain_category,description,contact_name,contact_email,contact_designation');
    console.log('  Acme Corp,acme.com,TMT,Software company,John Doe,john@acme.com,CEO');
    process.exit(1);
  }

  const filePath = args[0];
  if (!fs.existsSync(filePath)) {
    error(`File not found: ${filePath}`);
    process.exit(1);
  }

  // Parse file
  info(`Reading file: ${filePath}`);
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const ext = path.extname(filePath).toLowerCase();

  let rawData: RawOrgData[] = [];
  try {
    if (ext === '.csv') {
      rawData = parseCSV(fileContent);
    } else if (ext === '.json') {
      rawData = parseJSON(fileContent);
    } else {
      error('Unsupported file format. Use .csv or .json');
      process.exit(1);
    }
  } catch (err: any) {
    error(`Failed to parse file: ${err.message}`);
    process.exit(1);
  }

  success(`Parsed ${rawData.length} organizations from file`);

  // Show account managers for selection
  if (accountManagers.length > 0) {
    console.log('\n📋 Available Account Managers:');
    accountManagers.forEach((am, idx) => {
      console.log(`  ${idx + 1}. ${am.full_name} (${am.email})`);
    });

    const defaultAMChoice = await prompt('\nSelect default account manager (number or press Enter to skip): ');
    const defaultAMIndex = parseInt(defaultAMChoice) - 1;

    if (defaultAMIndex >= 0 && defaultAMIndex < accountManagers.length) {
      const defaultAM = accountManagers[defaultAMIndex];
      info(`Using ${defaultAM.full_name} as default account manager for orgs without one specified`);

      // Apply default AM to all orgs without one
      rawData.forEach(org => {
        if (!org.account_manager_email) {
          org.account_manager_email = defaultAM.email;
        }
      });
    }
  }

  // Process each organization
  const results = {
    total: rawData.length,
    created: 0,
    skipped: 0,
    failed: 0,
  };

  for (let i = 0; i < rawData.length; i++) {
    const raw = rawData[i];

    console.log(`\n${'─'.repeat(80)}`);
    log(`Processing ${i + 1} of ${rawData.length}`, 'bright');

    // Enrich data
    const enriched = await enrichOrganizationData(raw, accountManagers, salesPOCs);

    // Interactive review and edit
    const finalData = await reviewAndEdit(enriched);

    if (!finalData) {
      results.skipped++;
      continue;
    }

    // Create in database
    const orgId = await createOrganization(supabase, finalData);
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
  success(`Successfully created:        ${results.created}`);
  warn(`Skipped:                      ${results.skipped}`);
  error(`Failed:                       ${results.failed}`);
  console.log('='.repeat(80) + '\n');
}

// Run the script
main().catch((err) => {
  error(`Unexpected error: ${err.message}`);
  console.error(err);
  process.exit(1);
});
