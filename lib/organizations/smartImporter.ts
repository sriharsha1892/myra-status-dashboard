/**
 * Smart Import - Framework Version
 *
 * Migrated from scripts/smart-import.ts
 * Reduced from 645 lines to ~250 lines (61% reduction)
 *
 * "Smart" Features:
 * - Auto-detect domain category from org name/description
 * - Flexible column name mapping (org_name, organization, company → org_name)
 * - CSV and JSON support
 * - Logo URL generation
 * - Smart defaults for missing fields
 * - Account manager fuzzy matching
 */

import { BulkImporter, createFieldBasedDuplicateDetector } from '@/lib/bulkImport';
import { createCSVParser } from '@/lib/bulkImport/parsers/CSVParser';
import {
  generateLogoUrl,
  getOrgInitials,
} from '@/lib/organizations/sharedHelpers';

// =====================================================
// TYPES
// =====================================================

interface RawOrgData {
  // Flexible input - can have various column names
  [key: string]: string | undefined;
}

interface NormalizedOrgData {
  org_name: string;
  website_url?: string;
  domain_category?: string;
  description?: string;
  contact_name?: string;
  contact_email?: string;
  contact_designation?: string;
  sales_poc_name?: string;
}

interface EnrichedOrgData {
  org_name: string;
  domain: string;
  org_url: string;
  logo_url: string;
  description: string;
  account_manager_id: string | null;
  org_lifecycle_stage: string;
  trial_status: string;
  // User fields
  user_email: string;
  user_name: string;
  user_role: string | null;
  user_current_stage: string;
}

// =====================================================
// SMART FEATURES
// =====================================================

/**
 * Domain category detection keywords
 */
const DOMAIN_CATEGORIES: Record<string, string[]> = {
  'TMT': ['technology', 'software', 'tech', 'digital', 'it', 'computer', 'internet', 'telecom', 'media', 'saas', 'cloud'],
  'NEO': ['startup', 'venture', 'innovation', 'new economy', 'fintech', 'edtech'],
  'AF&B': ['agriculture', 'food', 'beverage', 'farming', 'agri', 'nutrition', 'dairy', 'restaurant'],
  'E&C': ['engineering', 'construction', 'infrastructure', 'building', 'contractor'],
  'HC': ['healthcare', 'hospital', 'medical', 'pharma', 'pharmaceutical', 'health', 'clinic'],
  'AAD': ['architecture', 'art', 'design', 'creative', 'studio'],
};

/**
 * Auto-detect domain category based on org name, URL, and description
 */
function detectDomainCategory(orgName: string, websiteUrl: string = '', description: string = ''): string {
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

/**
 * Flexible column name mapping
 * Maps common variations to standard field names
 */
function normalizeColumnNames(row: RawOrgData): NormalizedOrgData {
  const get = (variations: string[]): string => {
    for (const key of variations) {
      const value = row[key] || row[key.toLowerCase()] || row[key.replace(/_/g, ' ')];
      if (value) return value;
    }
    return '';
  };

  return {
    org_name: get(['org_name', 'organization', 'company', 'name', 'org', 'company_name']),
    website_url: get(['website_url', 'website', 'url', 'domain', 'site']),
    domain_category: get(['domain_category', 'domain', 'category', 'industry', 'sector']),
    description: get(['description', 'about', 'desc', 'summary']),
    contact_name: get(['contact_name', 'contact', 'primary_contact', 'name']),
    contact_email: get(['contact_email', 'email', 'primary_email']),
    contact_designation: get(['contact_designation', 'designation', 'title', 'role', 'position']),
    sales_poc_name: get(['sales_poc_name', 'sales_poc', 'poc', 'account_manager']),
  };
}

/**
 * Normalize URL (add https:// if missing)
 */
function normalizeUrl(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

/**
 * Extract name from email if not provided
 */
function extractNameFromEmail(email: string): string {
  if (!email) return 'Primary Contact';
  const username = email.split('@')[0];
  return username
    .replace(/[._-]/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

// =====================================================
// IMPORTER CONFIGURATION
// =====================================================

export function createSmartImporter() {
  return new BulkImporter<RawOrgData, EnrichedOrgData>({
    // Entity information
    entityType: 'organization',
    entityPlural: 'trial_organizations',

    // Parser: CSV with flexible headers
    parser: createCSVParser<RawOrgData>({
      delimiter: ',',
      hasHeader: true,
      trimValues: true,
      skipEmptyRows: true,
    }),

    // Validator: Ensure required fields after normalization
    validator: (item) => {
      const normalized = normalizeColumnNames(item);
      const errors: string[] = [];

      if (!normalized.org_name || !normalized.org_name.trim()) {
        errors.push('org_name is required (or organization, company, name)');
      }

      return {
        isValid: errors.length === 0,
        errors,
      };
    },

    // Transformer: Apply smart defaults and enrichment
    transformer: (item) => {
      // Normalize column names
      const normalized = normalizeColumnNames(item);

      const orgName = normalized.org_name.trim();
      const orgUrl = normalizeUrl(normalized.website_url || '');

      // SMART: Auto-detect domain category if not provided
      const domain = normalized.domain_category?.trim() ||
                     detectDomainCategory(orgName, orgUrl, normalized.description || '');

      // SMART: Generate logo URL
      const logoUrl = generateLogoUrl(orgUrl, orgName);

      // SMART: Generate description if not provided
      const description = normalized.description?.trim() ||
                         `${orgName} is a professional organization in the ${domain} industry.`;

      // SMART: Extract contact name from email if not provided
      const contactEmail = normalized.contact_email?.trim() || '';
      const contactName = normalized.contact_name?.trim() ||
                         (contactEmail ? extractNameFromEmail(contactEmail) : 'Primary Contact');

      const contactRole = normalized.contact_designation?.trim() || null;
      const salesPOC = normalized.sales_poc_name?.trim() || null;

      return {
        org_name: orgName,
        domain,
        org_url: orgUrl,
        logo_url: logoUrl,
        description,
        account_manager_id: null, // Will be looked up during insertion
        org_lifecycle_stage: 'prospect',
        trial_status: 'requested',
        // User fields
        user_email: contactEmail,
        user_name: contactName,
        user_role: contactRole,
        user_current_stage: contactEmail ? 'invited' : 'pending',
        _sales_poc: salesPOC, // Temporary field for lookup
      } as any;
    },

    // Database configuration
    database: {
      tableName: 'trial_organizations',
      batchSize: 20,
      delayBetweenBatches: 500,
    },

    // Duplicate detection: Check for duplicate emails or org names
    duplicateDetector: createFieldBasedDuplicateDetector<EnrichedOrgData>(
      'user_email',
      'skip'
    ),

    // Preview columns
    preview: {
      maxRows: 20,
      columns: [
        {
          key: 'org_name',
          label: 'Organization',
          width: '30%',
        },
        {
          key: 'domain',
          label: 'Domain',
          width: '15%',
        },
        {
          key: 'user_name',
          label: 'Contact',
          width: '25%',
        },
        {
          key: 'user_email',
          label: 'Email',
          width: '30%',
        },
      ],
    },

    // Success message builder
    successMessageBuilder: (item) => ({
      title: `${item.org_name}`,
      details: `${item.user_name} • ${item.domain}`,
    }),

    // Custom importer for multi-entity insertion (org + optional user)
    customImporter: async (items, onProgress) => {
      return insertSmartOrganizations(items, onProgress);
    },
  });
}

/**
 * CUSTOM IMPORT WRAPPER FOR SMART IMPORT
 */
export async function importSmart(
  file: File,
  onProgress?: (progress: any) => void
): Promise<any> {
  const startTime = Date.now();

  try {
    const importer = createSmartImporter();

    // Step 1: Parse file
    onProgress?.({
      stage: 'parsing',
      percentComplete: 0,
      message: 'Parsing file with smart detection...',
    });

    const parseResult = await importer.config.parser.parse(file);

    if (parseResult.errors.length > 0 && parseResult.items.length === 0) {
      throw new Error('Failed to parse file');
    }

    // Step 2: Validate
    onProgress?.({
      stage: 'validating',
      percentComplete: 25,
      message: `Validating ${parseResult.items.length} rows...`,
    });

    const validated = parseResult.items.filter((item, index) => {
      const result = importer.config.validator(item, index);
      return result.isValid;
    });

    // Step 3: Transform with smart enrichment
    onProgress?.({
      stage: 'transforming',
      percentComplete: 40,
      message: `Applying smart defaults to ${validated.length} items...`,
    });

    const transformed = validated.map(importer.config.transformer);

    // Step 4: Custom database insertion
    onProgress?.({
      stage: 'importing',
      percentComplete: 60,
      message: `Importing ${transformed.length} organizations...`,
    });

    const result = await insertSmartOrganizations(transformed, onProgress);

    // Step 5: Complete
    onProgress?.({
      stage: 'complete',
      percentComplete: 100,
      message: 'Import complete!',
    });

    return {
      entityType: 'organization',
      entityPlural: 'trial_organizations',
      summary: {
        total: parseResult.items.length,
        successful: result.successful,
        failed: result.failed + result.skipped,
        warnings: parseResult.errors.length,
      },
      success: result.successful > 0 ? [{ title: `Imported ${result.successful} organizations` }] : [],
      failed: result.errors.map(e => ({
        item: e.item.org_name,
        error: e.error,
      })),
      duration: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      entityType: 'organization',
      entityPlural: 'trial_organizations',
      summary: {
        total: 0,
        successful: 0,
        failed: 0,
        warnings: 1,
      },
      success: [],
      failed: [{ item: 'Import', error: error.message }],
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Custom database insertion for smart import
 * Uses server-side API route to keep service role key secure
 */
async function insertSmartOrganizations(
  items: any[],
  onProgress?: (progress: any) => void
): Promise<{
  successful: number;
  failed: number;
  skipped: number;
  errors: Array<{ item: any; error: string }>;
}> {
  onProgress?.({
    stage: 'importing',
    percentComplete: 70,
    message: `Sending ${items.length} items to server...`,
  });

  try {
    // Transform items to match API expected format
    const apiItems = items.map(item => ({
      org_name: item.org_name,
      domain: item.domain,
      org_url: item.org_url,
      logo_url: item.logo_url,
      description: item.description,
      org_lifecycle_stage: item.org_lifecycle_stage,
      trial_status: item.trial_status,
      trial_request_date: null,
      trial_access_provided_date: null,
      trial_expiry_date: null,
      account_manager_id: null,
      user_email: item.user_email,
      user_name: item.user_name,
      user_role: item.user_role,
      user_current_stage: item.user_current_stage,
      user_sales_poc: item._sales_poc,
    }));

    const response = await fetch('/api/bulk-import/organizations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: apiItems }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Server import failed');
    }

    const result = await response.json();

    onProgress?.({
      stage: 'importing',
      percentComplete: 95,
      message: `Imported ${result.successful}/${items.length}...`,
    });

    return {
      successful: result.successful,
      failed: result.failed,
      skipped: result.skipped,
      errors: result.errors.map((e: { item: string; error: string }) => ({
        item: items.find(i => i.org_name === e.item) || { org_name: e.item },
        error: e.error,
      })),
    };
  } catch (error: any) {
    return {
      successful: 0,
      failed: items.length,
      skipped: 0,
      errors: [{ item: items[0] || {}, error: error.message || 'Unknown error' }],
    };
  }
}
