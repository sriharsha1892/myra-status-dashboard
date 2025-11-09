#!/usr/bin/env tsx

/**
 * Excel Trial Organizations Import Tool
 *
 * Imports trial organizations and users from Excel file (Final List.xlsx)
 *
 * Features:
 * - Intelligent duplicate detection (by email and org name)
 * - Handles multiple users per organization
 * - Smart data mapping and normalization
 * - Preserves existing data (never overwrites actual usage metrics)
 * - Dry-run mode for safety
 *
 * Usage:
 *   npm run excel-import -- /path/to/Final\ List.xlsx --dry-run
 *   npm run excel-import -- /path/to/Final\ List.xlsx --confirm
 */

import * as XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Domain normalization map
const DOMAIN_MAP: Record<string, string> = {
  'TMT': 'TMT',
  'AF&B': 'AF&B',
  'E&C': 'E&C',
  'HC': 'HC',
  'NEO': 'NEO',
  'AAD': 'AAD',
  // Normalizations
  'AUTO': 'TMT',
  'Auto': 'TMT',
  'F&B': 'AF&B',
  'AGRI': 'AF&B',
  'C&M': 'E&C',
  'ICT': 'TMT',
  'Consulting': 'TMT',
  'Packaging': 'TMT',
  'Media': 'TMT',
  'Media & Consulting': 'TMT',
};

interface ExcelRow {
  dateOfRequest?: Date | null;
  salesPOC?: string | null;
  companyName: string;
  titleRole?: string | null;
  email: string;
  domain?: string | null;
  licenseNeededOn?: string | Date | null;
  licenseGivenOn?: Date | null;
  comments?: string | null;
  currentStatus?: string | null;
  notes?: string | null;
}

interface ImportStats {
  totalRows: number;
  newOrgsCreated: number;
  existingOrgsUpdated: number;
  newUsersCreated: number;
  existingUsersUpdated: number;
  skipped: number;
  errors: number;
  errorDetails: string[];
}

const stats: ImportStats = {
  totalRows: 0,
  newOrgsCreated: 0,
  existingOrgsUpdated: 0,
  newUsersCreated: 0,
  existingUsersUpdated: 0,
  skipped: 0,
  errors: 0,
  errorDetails: [],
};

/**
 * Extract user's full name from email
 */
function extractNameFromEmail(email: string): string {
  if (!email || !email.includes('@')) return 'Primary Contact';

  const username = email.split('@')[0];

  // Handle formats: firstname.lastname, firstname_lastname, firstnamelastname
  const parts = username
    .replace(/[._-]/g, ' ')  // Replace separators with spaces
    .split(' ')
    .filter(part => part.length > 0)
    .map(part =>
      part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
    );

  return parts.join(' ') || 'Primary Contact';
}

/**
 * Extract website URL from email domain
 */
function extractWebsiteFromEmail(email: string): string {
  if (!email || !email.includes('@')) return '';

  const domain = email.split('@')[1];

  // Clean up common subdomains but keep country codes
  const cleanDomain = domain
    .replace(/^(mail|email|smtp|webmail)\./, '');  // Remove mail subdomains

  return `https://${cleanDomain}`;
}

/**
 * Generate logo URL using Clearbit or UI Avatars
 */
function generateLogoUrl(websiteUrl: string, orgName: string): string {
  if (!websiteUrl) {
    const initials = getOrgInitials(orgName);
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&size=200&background=3B82F6&color=ffffff&bold=true`;
  }

  try {
    const url = new URL(websiteUrl);
    const domain = url.hostname.replace(/^www\./, '');
    return `https://logo.clearbit.com/${domain}`;
  } catch {
    const initials = getOrgInitials(orgName);
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&size=200&background=3B82F6&color=ffffff&bold=true`;
  }
}

/**
 * Get organization initials for avatar
 */
function getOrgInitials(orgName: string): string {
  const words = orgName.split(/[\s-]+/).filter(w => w.length > 0);
  if (words.length === 0) return 'ORG';
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/**
 * Generate organization description
 */
function generateDescription(orgName: string, domain: string): string {
  const domainText = domain ? ` in the ${domain} industry` : '';
  return `${orgName} is a professional organization${domainText}.`;
}

/**
 * Normalize domain value
 */
function normalizeDomain(domain: string | null | undefined): string {
  if (!domain) return 'TMT'; // Default

  const normalized = DOMAIN_MAP[domain.trim()];
  return normalized || 'TMT'; // Fallback to TMT
}

/**
 * Map Excel status to trial_status
 */
function mapTrialStatus(currentStatus: string | null): string {
  if (!currentStatus) return 'requested';

  const statusLower = currentStatus.toLowerCase();

  if (statusLower.includes('pending') || statusLower.includes('not shared')) {
    return 'requested';
  }
  if (statusLower.includes('inactive') || statusLower.includes('not logged in')) {
    return 'in_progress';
  }
  if (statusLower.includes('active') || statusLower.includes('logged in')) {
    return 'active';
  }
  if (statusLower.includes('follow')) {
    return 'active';  // Still active, just needs follow-up
  }

  return 'requested';  // Default
}

/**
 * Map Excel status to org_lifecycle_stage
 */
function mapLifecycleStage(currentStatus: string | null): string {
  if (!currentStatus) return 'trial_pending';

  const statusLower = currentStatus.toLowerCase();

  if (statusLower.includes('pending') || statusLower.includes('not shared')) {
    return 'trial_pending';
  }

  // Any other status means trial is active
  return 'trial_active';
}

/**
 * Map Excel status to current_stage
 * New taxonomy: invited | low_activity | active | power_user | dormant
 */
function mapUserStatus(currentStatus: string | null): string {
  if (!currentStatus) return 'invited';

  const statusLower = currentStatus.toLowerCase();

  if (statusLower.includes('pending') || statusLower.includes('not shared')) {
    return 'invited';
  }
  if (statusLower.includes('inactive') || statusLower.includes('not logged in')) {
    return 'low_activity';  // Access given but minimal usage
  }
  if (statusLower.includes('active') || statusLower.includes('logged in')) {
    return 'active';
  }
  if (statusLower.includes('follow') || statusLower.includes('not responding')) {
    return 'dormant';
  }

  return 'invited';  // Default
}

/**
 * Calculate trial expiry date (14 days from access date)
 */
function calculateExpiryDate(accessDate: Date | null): Date | null {
  if (!accessDate) return null;

  const expiry = new Date(accessDate);
  expiry.setDate(expiry.getDate() + 14);
  return expiry;
}

/**
 * Fuzzy match Sales POC name to account managers
 */
async function findAccountManagerBySalesPOC(salesPOCName: string | null): Promise<string | null> {
  if (!salesPOCName) return null;

  try {
    // Get all users with Admin or Manager role
    const { data: managers, error } = await supabase
      .from('users')
      .select('id, full_name, email')
      .or('role.eq.Admin,role.eq.Manager');

    if (error || !managers || managers.length === 0) {
      return null;
    }

    const searchName = salesPOCName.toLowerCase().trim();

    // Try exact match first
    let match = managers.find(m =>
      m.full_name?.toLowerCase().includes(searchName) ||
      m.email?.toLowerCase().includes(searchName)
    );

    if (match) return match.id;

    // Try partial match (first name) - handles "Rupak/Paras" format
    const firstWord = searchName.split(/[\/\s]/)[0];
    match = managers.find(m =>
      m.full_name?.toLowerCase().includes(firstWord) ||
      m.email?.toLowerCase().startsWith(firstWord)
    );

    return match?.id || null;
  } catch (error) {
    console.error('Error finding account manager:', error);
    return null;
  }
}

/**
 * Find existing organization and user by email and company name
 */
async function findExisting(email: string, companyName: string): Promise<{
  org: any | null;
  user: any | null;
  isExactMatch: boolean;
}> {
  // Check if this exact user email exists
  const { data: existingUser } = await supabase
    .from('trial_users')
    .select('user_id, org_id, email, name, role')
    .eq('email', email)
    .maybeSingle();

  if (existingUser) {
    // User exists - fetch the org too
    const { data: org } = await supabase
      .from('trial_organizations')
      .select('*')
      .eq('org_id', existingUser.org_id)
      .single();

    return { org, user: existingUser, isExactMatch: true };
  }

  // Check if org name exists (might be different contact)
  const { data: existingOrg } = await supabase
    .from('trial_organizations')
    .select('*')
    .ilike('org_name', companyName)  // Case-insensitive match
    .maybeSingle();

  return {
    org: existingOrg,
    user: null,
    isExactMatch: false
  };
}

/**
 * Create new trial organization
 */
async function createTrialOrg(data: {
  orgName: string;
  domain: string;
  trialRequestDate: Date | null;
  trialAccessDate: Date | null;
  trialStatus: string;
  lifecycleStage: string;
  description: string;
  logoUrl: string;
  orgUrl: string;
  accountManagerId: string | null;
  customFields: any;
}): Promise<string | null> {
  try {
    const { data: org, error } = await supabase
      .from('trial_organizations')
      .insert({
        org_name: data.orgName,
        domain: data.domain,
        trial_request_date: data.trialRequestDate?.toISOString() || null,
        trial_access_provided_date: data.trialAccessDate?.toISOString() || null,
        trial_expiry_date: calculateExpiryDate(data.trialAccessDate)?.toISOString() || null,
        trial_status: data.trialStatus,
        org_lifecycle_stage: data.lifecycleStage,
        description: data.description,
        logo_url: data.logoUrl,
        org_url: data.orgUrl,
        account_manager_id: data.accountManagerId,
        custom_fields: data.customFields,
      })
      .select('org_id')
      .single();

    if (error) {
      console.error('Error creating org:', error);
      return null;
    }

    return org.org_id;
  } catch (error) {
    console.error('Exception creating org:', error);
    return null;
  }
}

/**
 * Update existing trial organization
 */
async function updateTrialOrg(orgId: string, updates: any): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('trial_organizations')
      .update(updates)
      .eq('org_id', orgId);

    if (error) {
      console.error('Error updating org:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Exception updating org:', error);
    return false;
  }
}

/**
 * Create trial user
 */
async function createTrialUser(data: {
  orgId: string;
  email: string;
  name: string;
  role: string | null;
  currentStage: string;
  salesPOC: string | null;
  accountManager: string;
}): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('trial_users')
      .insert({
        org_id: data.orgId,
        email: data.email,
        name: data.name,
        role: data.role || null,
        current_stage: data.currentStage,
        sales_poc: data.salesPOC,
        account_manager: data.accountManager,
        invited_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Error creating user:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Exception creating user:', error);
    return false;
  }
}

/**
 * Update existing trial user
 */
async function updateTrialUser(userId: string, updates: any): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('trial_users')
      .update(updates)
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating user:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Exception updating user:', error);
    return false;
  }
}

/**
 * Process a single row from Excel
 */
async function processRow(row: ExcelRow, dryRun: boolean): Promise<void> {
  const { email, companyName } = row;

  if (!email || !companyName) {
    console.warn(`⚠️  Skipping row: missing email or company name`);
    stats.skipped++;
    return;
  }

  try {
    // Find existing org/user
    const { org: existingOrg, user: existingUser, isExactMatch } = await findExisting(email, companyName);

    if (isExactMatch && existingUser && existingOrg) {
      // User already exists - update org/user status if needed
      console.log(`  📝 User exists: ${email} → ${existingOrg.org_name}`);

      if (!dryRun) {
        // Update org status/custom_fields
        const orgUpdates: any = {
          trial_status: mapTrialStatus(row.currentStatus),
          org_lifecycle_stage: mapLifecycleStage(row.currentStatus),
          custom_fields: {
            ...existingOrg.custom_fields,
            comments: row.comments || existingOrg.custom_fields?.comments,
            notes: row.notes || existingOrg.custom_fields?.notes,
            license_needed_on: row.licenseNeededOn || existingOrg.custom_fields?.license_needed_on,
            last_excel_import: new Date().toISOString(),
          },
        };

        // Update access date if it was null and we have it
        if (!existingOrg.trial_access_provided_date && row.licenseGivenOn) {
          orgUpdates.trial_access_provided_date = row.licenseGivenOn.toISOString();
          orgUpdates.trial_expiry_date = calculateExpiryDate(row.licenseGivenOn)?.toISOString();
        }

        await updateTrialOrg(existingOrg.org_id, orgUpdates);

        // Update user status
        await updateTrialUser(existingUser.user_id, {
          current_stage: mapUserStatus(row.currentStatus),
        });

        stats.existingOrgsUpdated++;
        stats.existingUsersUpdated++;
      } else {
        console.log(`    [DRY RUN] Would update org and user status`);
        stats.existingOrgsUpdated++;
        stats.existingUsersUpdated++;
      }

      return;
    }

    if (existingOrg && !existingUser) {
      // Org exists but this is a new contact
      console.log(`  ➕ Adding user to existing org: ${email} → ${existingOrg.org_name}`);

      if (!dryRun) {
        const userName = extractNameFromEmail(email);
        const accountManagerId = await findAccountManagerBySalesPOC(row.salesPOC);

        const success = await createTrialUser({
          orgId: existingOrg.org_id,
          email: email,
          name: userName,
          role: row.titleRole || null,
          currentStage: mapUserStatus(row.currentStatus),
          salesPOC: row.salesPOC || null,
          accountManager: accountManagerId || row.salesPOC || 'Unassigned',
        });

        if (success) {
          stats.newUsersCreated++;

          // Also update org's custom_fields to merge comments/notes
          await updateTrialOrg(existingOrg.org_id, {
            custom_fields: {
              ...existingOrg.custom_fields,
              [`comments_${email}`]: row.comments,
              [`notes_${email}`]: row.notes,
              last_excel_import: new Date().toISOString(),
            },
          });
        } else {
          stats.errors++;
          stats.errorDetails.push(`Failed to create user: ${email}`);
        }
      } else {
        console.log(`    [DRY RUN] Would create additional user`);
        stats.newUsersCreated++;
      }

      return;
    }

    // New org + primary contact
    console.log(`  ✨ Creating new org: ${companyName} (${email})`);

    if (!dryRun) {
      const normalizedDomain = normalizeDomain(row.domain);
      const websiteUrl = extractWebsiteFromEmail(email);
      const logoUrl = generateLogoUrl(websiteUrl, companyName);
      const description = generateDescription(companyName, normalizedDomain);
      const accountManagerId = await findAccountManagerBySalesPOC(row.salesPOC);

      const orgId = await createTrialOrg({
        orgName: companyName,
        domain: normalizedDomain,
        trialRequestDate: row.dateOfRequest || null,
        trialAccessDate: row.licenseGivenOn || null,
        trialStatus: mapTrialStatus(row.currentStatus),
        lifecycleStage: mapLifecycleStage(row.currentStatus),
        description: description,
        logoUrl: logoUrl,
        orgUrl: websiteUrl,
        accountManagerId: accountManagerId,
        customFields: {
          comments: row.comments,
          notes: row.notes,
          license_needed_on: row.licenseNeededOn,
          import_source: 'excel',
          import_date: new Date().toISOString(),
        },
      });

      if (orgId) {
        stats.newOrgsCreated++;

        // Create primary contact user
        const userName = extractNameFromEmail(email);

        const userSuccess = await createTrialUser({
          orgId: orgId,
          email: email,
          name: userName,
          role: row.titleRole || null,
          currentStage: mapUserStatus(row.currentStatus),
          salesPOC: row.salesPOC || null,
          accountManager: accountManagerId || row.salesPOC || 'Unassigned',
        });

        if (userSuccess) {
          stats.newUsersCreated++;
        } else {
          stats.errors++;
          stats.errorDetails.push(`Created org but failed to create user: ${email}`);
        }
      } else {
        stats.errors++;
        stats.errorDetails.push(`Failed to create org: ${companyName}`);
      }
    } else {
      console.log(`    [DRY RUN] Would create new org + user`);
      stats.newOrgsCreated++;
      stats.newUsersCreated++;
    }

  } catch (error: any) {
    console.error(`❌ Error processing ${email}:`, error.message);
    stats.errors++;
    stats.errorDetails.push(`${email}: ${error.message}`);
  }
}

/**
 * Read and parse Excel file
 */
function readExcelFile(filePath: string): ExcelRow[] {
  console.log(`\n📖 Reading Excel file: ${filePath}\n`);

  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // Convert to JSON
  const rawData: any[] = XLSX.utils.sheet_to_json(worksheet);

  console.log(`✅ Found ${rawData.length} rows in sheet "${sheetName}"\n`);

  // Map to our interface
  const rows: ExcelRow[] = rawData.map(row => ({
    dateOfRequest: row['Date of Request'] ? excelDateToJSDate(row['Date of Request']) : null,
    salesPOC: row['Sales POC'] || null,
    companyName: row['Company Name'] || '',
    titleRole: row['Title/Role (Primary Contact)'] || null,
    email: row['Email (Primary Contact)'] || '',
    domain: row['Domain'] || null,
    licenseNeededOn: row['License Needed on'] || null,
    licenseGivenOn: row['License given on / to be given on (Date)'] ? excelDateToJSDate(row['License given on / to be given on (Date)']) : null,
    comments: row['Comments/ Observation from users'] || null,
    currentStatus: row['Current Status (As of 22/10/2025)'] || null,
    notes: row['Notes (to expand on Column J)'] || null,
  }));

  return rows.filter(row => row.email && row.companyName); // Filter out invalid rows
}

/**
 * Convert Excel serial date to JavaScript Date
 */
function excelDateToJSDate(serial: any): Date | null {
  if (!serial) return null;
  if (serial instanceof Date) return serial;
  if (typeof serial === 'number') {
    const utc_days = Math.floor(serial - 25569);
    const utc_value = utc_days * 86400;
    const date_info = new Date(utc_value * 1000);
    return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate());
  }
  return null;
}

/**
 * Print summary statistics
 */
function printSummary(dryRun: boolean) {
  console.log('\n' + '='.repeat(60));
  console.log(`${dryRun ? '📋 DRY RUN' : '✅ IMPORT'} SUMMARY`);
  console.log('='.repeat(60));
  console.log(`Total rows processed:       ${stats.totalRows}`);
  console.log(`New organizations created:  ${stats.newOrgsCreated}`);
  console.log(`Existing orgs updated:      ${stats.existingOrgsUpdated}`);
  console.log(`New users created:          ${stats.newUsersCreated}`);
  console.log(`Existing users updated:     ${stats.existingUsersUpdated}`);
  console.log(`Rows skipped:               ${stats.skipped}`);
  console.log(`Errors:                     ${stats.errors}`);
  console.log('='.repeat(60));

  if (stats.errorDetails.length > 0) {
    console.log('\n❌ Error Details:');
    stats.errorDetails.forEach(err => console.log(`  - ${err}`));
  }

  if (dryRun) {
    console.log('\n💡 This was a dry run. No changes were made.');
    console.log('   Run with --confirm to actually import the data.\n');
  } else {
    console.log('\n✅ Import complete!\n');
  }
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    console.log(`
Excel Trial Organizations Import Tool

Usage:
  npm run excel-import -- <file-path> [--dry-run | --confirm]

Examples:
  npm run excel-import -- /path/to/Final\\ List.xlsx --dry-run
  npm run excel-import -- /path/to/Final\\ List.xlsx --confirm

Options:
  --dry-run    Preview changes without committing to database
  --confirm    Actually import the data

Default mode is --dry-run for safety.
    `);
    process.exit(0);
  }

  const filePath = args[0];
  const isDryRun = !args.includes('--confirm');

  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 EXCEL TRIAL ORGANIZATIONS IMPORT TOOL');
  console.log('='.repeat(60));
  console.log(`Mode:  ${isDryRun ? '📋 DRY RUN (preview only)' : '✅ CONFIRM (will import)'}`);
  console.log(`File:  ${filePath}`);
  console.log('='.repeat(60) + '\n');

  if (isDryRun) {
    console.log('💡 Running in DRY RUN mode. No changes will be made to the database.\n');
  } else {
    console.log('⚠️  CONFIRM mode: Changes will be written to the database!\n');
  }

  try {
    // Read Excel file
    const rows = readExcelFile(filePath);
    stats.totalRows = rows.length;

    // Group rows by company name to handle within-file duplicates
    const orgGroups = new Map<string, ExcelRow[]>();
    for (const row of rows) {
      const normalizedOrgName = row.companyName.trim().toLowerCase();
      if (!orgGroups.has(normalizedOrgName)) {
        orgGroups.set(normalizedOrgName, []);
      }
      orgGroups.get(normalizedOrgName)!.push(row);
    }

    console.log(`📊 Found ${orgGroups.size} unique organizations with ${rows.length} total users\n`);
    console.log('🔄 Processing organizations...\n');

    let processedCount = 0;

    // Process each organization group
    for (const [orgName, orgRows] of orgGroups.entries()) {
      const primaryRow = orgRows[0]; // Use first row as primary data source

      console.log(`\n[${++processedCount}/${orgGroups.size}] Processing org: ${primaryRow.companyName}`);
      console.log(`  👥 ${orgRows.length} user(s) to process`);

      // Check if org exists in database
      const { org: existingOrg } = await findExisting('', primaryRow.companyName);

      let orgId: string | null = null;

      if (existingOrg) {
        // Org exists - update it
        console.log(`  📝 Organization already exists in database`);

        if (!isDryRun) {
          const orgUpdates: any = {
            trial_status: mapTrialStatus(primaryRow.currentStatus),
            org_lifecycle_stage: mapLifecycleStage(primaryRow.currentStatus),
            custom_fields: {
              ...existingOrg.custom_fields,
              last_excel_import: new Date().toISOString(),
            },
          };

          // Update access date if it was null and we have it
          if (!existingOrg.trial_access_provided_date && primaryRow.licenseGivenOn) {
            orgUpdates.trial_access_provided_date = primaryRow.licenseGivenOn.toISOString();
            orgUpdates.trial_expiry_date = calculateExpiryDate(primaryRow.licenseGivenOn)?.toISOString();
          }

          await updateTrialOrg(existingOrg.org_id, orgUpdates);
          stats.existingOrgsUpdated++;
        } else {
          console.log(`    [DRY RUN] Would update org status`);
          stats.existingOrgsUpdated++;
        }

        orgId = existingOrg.org_id;

      } else {
        // Create new org
        console.log(`  ✨ Creating new organization`);

        if (!isDryRun) {
          const normalizedDomain = normalizeDomain(primaryRow.domain);
          const websiteUrl = extractWebsiteFromEmail(primaryRow.email);
          const logoUrl = generateLogoUrl(websiteUrl, primaryRow.companyName);
          const description = generateDescription(primaryRow.companyName, normalizedDomain);
          const accountManagerId = await findAccountManagerBySalesPOC(primaryRow.salesPOC);

          orgId = await createTrialOrg({
            orgName: primaryRow.companyName,
            domain: normalizedDomain,
            trialRequestDate: primaryRow.dateOfRequest || null,
            trialAccessDate: primaryRow.licenseGivenOn || null,
            trialStatus: mapTrialStatus(primaryRow.currentStatus),
            lifecycleStage: mapLifecycleStage(primaryRow.currentStatus),
            description: description,
            logoUrl: logoUrl,
            orgUrl: websiteUrl,
            accountManagerId: accountManagerId,
            customFields: {
              comments: primaryRow.comments,
              notes: primaryRow.notes,
              license_needed_on: primaryRow.licenseNeededOn,
              import_source: 'excel',
              import_date: new Date().toISOString(),
            },
          });

          if (orgId) {
            stats.newOrgsCreated++;
          } else {
            stats.errors++;
            stats.errorDetails.push(`Failed to create org: ${primaryRow.companyName}`);
            continue;
          }
        } else {
          console.log(`    [DRY RUN] Would create new org`);
          stats.newOrgsCreated++;
          orgId = 'dry-run-org-id'; // Fake ID for dry run
        }
      }

      // Process all users for this org
      for (let i = 0; i < orgRows.length; i++) {
        const userRow = orgRows[i];
        const isPrimary = i === 0; // First user is primary contact

        console.log(`  👤 [${i + 1}/${orgRows.length}] ${userRow.email}${isPrimary ? ' (primary)' : ''}`);

        // Check if this specific user already exists
        const { user: existingUser } = await findExisting(userRow.email, primaryRow.companyName);

        if (existingUser) {
          // User exists - update status
          console.log(`      ✓ User already exists, updating status`);

          if (!isDryRun) {
            await updateTrialUser(existingUser.user_id, {
              current_stage: mapUserStatus(userRow.currentStatus),
            });
            stats.existingUsersUpdated++;
          } else {
            console.log(`      [DRY RUN] Would update user status`);
            stats.existingUsersUpdated++;
          }

        } else {
          // Create new user
          console.log(`      ➕ Creating new user`);

          if (!isDryRun && orgId) {
            const userName = extractNameFromEmail(userRow.email);
            const accountManagerId = await findAccountManagerBySalesPOC(userRow.salesPOC);

            const success = await createTrialUser({
              orgId: orgId,
              email: userRow.email,
              name: userName,
              role: userRow.titleRole || null,
              currentStage: mapUserStatus(userRow.currentStatus),
              salesPOC: userRow.salesPOC || null,
              accountManager: accountManagerId || userRow.salesPOC || 'Unassigned',
            });

            if (success) {
              stats.newUsersCreated++;
            } else {
              stats.errors++;
              stats.errorDetails.push(`Failed to create user: ${userRow.email}`);
            }
          } else {
            console.log(`      [DRY RUN] Would create new user`);
            stats.newUsersCreated++;
          }
        }
      }
    }

    // Print summary
    printSummary(isDryRun);

  } catch (error: any) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run
main().catch(console.error);
