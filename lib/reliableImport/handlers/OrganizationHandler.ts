/**
 * OrganizationHandler
 *
 * Handles parsing, validation, and import of trial organizations.
 * Supports both CSV and AI-parsed data.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  EntityHandler,
  ParseResult,
  ValidationResult,
  ImportResult,
  DuplicateCheckResult,
} from '../types';

// ============================================================================
// Types
// ============================================================================

export interface ParsedOrganization {
  org_name: string;
  domain: string;
  org_url?: string;
  logo_url?: string;
  description?: string;
  account_manager_id?: string;
  org_lifecycle_stage: string;
  trial_status: string;
  is_prospect?: boolean;
  prospect_stage?: string;
  prospect_source?: string;
  icp_fit_score?: number;
  parent_company?: string;
  // Optional user to create with org
  user_email?: string;
  user_name?: string;
  user_role?: string;
}

// ============================================================================
// Constants
// ============================================================================

const VALID_DOMAINS = ['TMT', 'NEO', 'AF&B', 'E&C', 'HC', 'AAD'];

const DOMAIN_KEYWORDS: Record<string, string[]> = {
  TMT: ['technology', 'software', 'tech', 'digital', 'it', 'computer', 'internet', 'telecom', 'media', 'saas', 'cloud'],
  NEO: ['startup', 'venture', 'innovation', 'new economy', 'fintech', 'edtech'],
  'AF&B': ['agriculture', 'food', 'beverage', 'farming', 'agri', 'nutrition', 'dairy', 'restaurant'],
  'E&C': ['engineering', 'construction', 'infrastructure', 'building', 'contractor'],
  HC: ['healthcare', 'hospital', 'medical', 'pharma', 'pharmaceutical', 'health', 'clinic'],
  AAD: ['architecture', 'art', 'design', 'creative', 'studio'],
};

const COLUMN_MAPPINGS: Record<string, string[]> = {
  org_name: ['org_name', 'organization', 'company', 'name', 'org', 'company_name', 'Company Name', 'Organization'],
  website_url: ['website_url', 'website', 'url', 'domain', 'site', 'Website'],
  domain_category: ['domain_category', 'domain', 'category', 'industry', 'sector', 'Domain'],
  description: ['description', 'about', 'desc', 'summary', 'notes', 'Description', 'Notes'],
  contact_name: ['contact_name', 'contact', 'primary_contact', 'Contact Name', 'Contact'],
  contact_email: ['contact_email', 'email', 'primary_email', 'Email', 'Contact Email'],
  contact_role: ['contact_designation', 'designation', 'title', 'role', 'position', 'Title', 'Role'],
  sales_poc: ['sales_poc_name', 'sales_poc', 'poc', 'account_manager', 'Account Manager', 'AM'],
  prospect_source: ['source', 'lead_source', 'prospect_source', 'Source', 'Lead Source'],
  icp_score: ['icp_score', 'icp_fit_score', 'icp', 'fit_score', 'ICP Score', 'ICP'],
};

// ============================================================================
// Helper Functions
// ============================================================================

function getSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Missing Supabase credentials');
  return createClient(url, key);
}

function getField(raw: Record<string, unknown>, variations: string[]): string {
  for (const key of variations) {
    const value = raw[key] ?? raw[key.toLowerCase()] ?? raw[key.replace(/_/g, ' ')];
    if (value !== undefined && value !== null && value !== '') {
      return String(value).trim();
    }
  }
  return '';
}

function detectDomain(orgName: string, url: string = '', description: string = ''): string {
  const searchText = `${orgName} ${url} ${description}`.toLowerCase();
  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    for (const keyword of keywords) {
      if (searchText.includes(keyword)) {
        return domain;
      }
    }
  }
  return 'TMT'; // Default
}

function normalizeUrl(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

function generateLogoUrl(orgName: string, websiteUrl: string): string {
  // Try Clearbit first
  if (websiteUrl) {
    try {
      const domain = new URL(websiteUrl).hostname.replace('www.', '');
      return `https://logo.clearbit.com/${domain}`;
    } catch {
      // Invalid URL, fall through
    }
  }

  // Fallback to UI Avatars
  const initials = orgName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=random&size=128`;
}

function extractNameFromEmail(email: string): string {
  if (!email) return 'Primary Contact';
  const username = email.split('@')[0];
  return username
    .replace(/[._-]/g, ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

// ============================================================================
// OrganizationHandler Class
// ============================================================================

export class OrganizationHandler implements EntityHandler<ParsedOrganization> {
  entityType = 'organization' as const;
  private supabase: SupabaseClient;
  private accountManagerCache: Map<string, string | null> = new Map();

  constructor(supabase?: SupabaseClient) {
    this.supabase = supabase || getSupabase();
  }

  /**
   * Parse raw row data into structured organization
   */
  async parse(raw: Record<string, unknown>): Promise<ParseResult<ParsedOrganization>> {
    try {
      const orgName = getField(raw, COLUMN_MAPPINGS.org_name);

      if (!orgName) {
        return { data: null, error: 'Missing organization name' };
      }

      const websiteUrl = normalizeUrl(getField(raw, COLUMN_MAPPINGS.website_url));
      const description = getField(raw, COLUMN_MAPPINGS.description);
      const domainCategory = getField(raw, COLUMN_MAPPINGS.domain_category);
      const contactEmail = getField(raw, COLUMN_MAPPINGS.contact_email);
      const contactName = getField(raw, COLUMN_MAPPINGS.contact_name) || extractNameFromEmail(contactEmail);
      const contactRole = getField(raw, COLUMN_MAPPINGS.contact_role);
      const salesPoc = getField(raw, COLUMN_MAPPINGS.sales_poc);
      const prospectSource = getField(raw, COLUMN_MAPPINGS.prospect_source);
      const icpScoreRaw = getField(raw, COLUMN_MAPPINGS.icp_score);

      // Detect or validate domain
      let domain = domainCategory.toUpperCase();
      if (!VALID_DOMAINS.includes(domain)) {
        domain = detectDomain(orgName, websiteUrl, description);
      }

      // Resolve account manager
      let accountManagerId: string | undefined;
      if (salesPoc) {
        accountManagerId = await this.resolveAccountManager(salesPoc);
      }

      // Parse ICP score
      let icpFitScore: number | undefined;
      if (icpScoreRaw) {
        const parsed = parseInt(icpScoreRaw, 10);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
          icpFitScore = parsed;
        }
      }

      const data: ParsedOrganization = {
        org_name: orgName,
        domain,
        org_url: websiteUrl || undefined,
        logo_url: generateLogoUrl(orgName, websiteUrl),
        description: description || `${orgName} - imported organization`,
        account_manager_id: accountManagerId,
        org_lifecycle_stage: 'prospect',
        trial_status: 'requested',
        is_prospect: true,
        prospect_stage: 'cold_lead',
        prospect_source: prospectSource || 'cold_outreach',
        icp_fit_score: icpFitScore,
      };

      // Add user fields if contact email provided
      if (contactEmail) {
        data.user_email = contactEmail.toLowerCase();
        data.user_name = contactName;
        data.user_role = contactRole || undefined;
      }

      return { data };
    } catch (error) {
      return { data: null, error: `Parse error: ${(error as Error).message}` };
    }
  }

  /**
   * Validate parsed organization data
   */
  async validate(data: ParsedOrganization): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!data.org_name || data.org_name.length < 2) {
      errors.push('Organization name must be at least 2 characters');
    }

    if (!data.domain || !VALID_DOMAINS.includes(data.domain)) {
      errors.push(`Invalid domain: ${data.domain}. Must be one of: ${VALID_DOMAINS.join(', ')}`);
    }

    // Optional field validation
    if (data.org_url && !/^https?:\/\/.+/.test(data.org_url)) {
      warnings.push('Invalid URL format - will be skipped');
    }

    if (data.user_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.user_email)) {
      errors.push(`Invalid email format: ${data.user_email}`);
    }

    if (data.icp_fit_score !== undefined && (data.icp_fit_score < 0 || data.icp_fit_score > 100)) {
      warnings.push('ICP score out of range (0-100) - will be set to null');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Check if organization already exists
   */
  async checkDuplicate(data: ParsedOrganization): Promise<DuplicateCheckResult> {
    // Check by exact name match
    const { data: existing, error } = await this.supabase
      .from('trial_organizations')
      .select('org_id, org_name')
      .ilike('org_name', data.org_name)
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = not found, which is fine
      console.error('Duplicate check error:', error);
    }

    if (existing) {
      return {
        isDuplicate: true,
        existingId: existing.org_id,
        reason: `Organization "${existing.org_name}" already exists`,
      };
    }

    // Also check by email if provided
    if (data.user_email) {
      const { data: existingUser } = await this.supabase
        .from('trial_users')
        .select('user_id, org_id, email')
        .ilike('email', data.user_email)
        .limit(1)
        .single();

      if (existingUser) {
        return {
          isDuplicate: true,
          existingId: existingUser.org_id,
          reason: `User with email "${data.user_email}" already exists in org ${existingUser.org_id}`,
        };
      }
    }

    return { isDuplicate: false };
  }

  /**
   * Import organization (and optionally user) to database
   */
  async import(data: ParsedOrganization): Promise<ImportResult> {
    const orgId = crypto.randomUUID();

    // Prepare org data
    const orgRecord = {
      org_id: orgId,
      org_name: data.org_name,
      domain: data.domain,
      org_url: data.org_url || null,
      logo_url: data.logo_url || null,
      description: data.description || null,
      account_manager_id: data.account_manager_id || null,
      org_lifecycle_stage: data.org_lifecycle_stage,
      trial_status: data.trial_status,
      is_prospect: data.is_prospect ?? true,
      prospect_stage: data.prospect_stage || 'cold_lead',
      prospect_source: data.prospect_source || 'cold_outreach',
      icp_fit_score: data.icp_fit_score || null,
      parent_company: data.parent_company || null,
      created_at: new Date().toISOString(),
    };

    // Insert organization
    const { error: orgError } = await this.supabase
      .from('trial_organizations')
      .insert(orgRecord);

    if (orgError) {
      // Check for unique constraint
      if (orgError.code === '23505') {
        return { id: null, error: `Duplicate: ${orgError.message}` };
      }
      return { id: null, error: `Failed to insert org: ${orgError.message}` };
    }

    // Insert user if email provided
    let userId: string | null = null;
    if (data.user_email) {
      userId = crypto.randomUUID();
      const userRecord = {
        user_id: userId,
        org_id: orgId,
        email: data.user_email,
        full_name: data.user_name || null,
        designation: data.user_role || null,
        current_stage: 'invited',
        created_at: new Date().toISOString(),
      };

      const { error: userError } = await this.supabase
        .from('trial_users')
        .insert(userRecord);

      if (userError) {
        // Log but don't fail - org was created successfully
        console.warn(`User creation failed for org ${orgId}: ${userError.message}`);
      }
    }

    return {
      id: orgId,
      secondaryId: userId || undefined,
    };
  }

  /**
   * Resolve account manager by name (with caching)
   */
  private async resolveAccountManager(name: string): Promise<string | undefined> {
    const key = name.toLowerCase().trim();

    if (this.accountManagerCache.has(key)) {
      return this.accountManagerCache.get(key) || undefined;
    }

    // Try exact match first
    const { data } = await this.supabase
      .from('users')
      .select('id, full_name')
      .ilike('full_name', `%${key}%`)
      .limit(1)
      .single();

    const result = data?.id || null;
    this.accountManagerCache.set(key, result);

    return result || undefined;
  }
}

// Export factory function
export function createOrganizationHandler(supabase?: SupabaseClient): OrganizationHandler {
  return new OrganizationHandler(supabase);
}
