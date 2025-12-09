/**
 * ProspectHandler
 *
 * Handles parsing, validation, and import of prospects (people/contacts).
 * Prospects are PEOPLE who belong to organizations.
 *
 * Key behaviors:
 * - Duplicate detection by email (globally unique)
 * - Org resolution by name - if not found, status = 'needs_org' for manual assignment
 * - Import inserts into `prospects` table (not trial_organizations)
 */

import { SupabaseClient } from '@supabase/supabase-js';
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

export interface ParsedProspect {
  // Person fields (PRIMARY)
  name: string;
  email?: string;
  title?: string;
  phone?: string;
  linkedin_url?: string;

  // Org linkage
  org_name: string;        // Raw org name from CSV
  org_id?: string;         // Resolved org ID (null if not found)
  org_resolved: boolean;   // Whether org was found

  // Sales fields
  source?: string;
  assigned_to_id?: string;
  is_primary_contact: boolean;
  notes?: string;
}

// ============================================================================
// Constants
// ============================================================================

const VALID_SOURCES = ['cold_outreach', 'linkedin', 'referral', 'inbound', 'event', 'other'];

const COLUMN_MAPPINGS: Record<string, string[]> = {
  name: ['name', 'contact_name', 'full_name', 'person', 'contact', 'Name', 'Contact Name', 'Full Name'],
  org_name: ['org_name', 'organization', 'company', 'company_name', 'org', 'Company', 'Organization', 'Company Name'],
  email: ['email', 'contact_email', 'email_address', 'Email', 'Contact Email', 'E-mail'],
  title: ['title', 'role', 'position', 'designation', 'job_title', 'Title', 'Role', 'Position'],
  phone: ['phone', 'phone_number', 'mobile', 'cell', 'Phone', 'Mobile', 'Phone Number'],
  linkedin_url: ['linkedin_url', 'linkedin', 'linkedin_profile', 'LinkedIn', 'LinkedIn URL', 'Li'],
  source: ['source', 'lead_source', 'prospect_source', 'Source', 'Lead Source', 'Origin'],
  assigned_to_email: ['assigned_to_email', 'assigned_to', 'sales_poc', 'account_manager', 'Assigned To', 'AM', 'POC'],
  is_primary_contact: ['is_primary_contact', 'primary', 'is_primary', 'Primary', 'Primary Contact', 'Main Contact'],
  notes: ['notes', 'description', 'comments', 'Notes', 'Description', 'Comments'],
};

// ============================================================================
// Helper Functions
// ============================================================================

function getField(raw: Record<string, unknown>, variations: string[]): string {
  for (const key of variations) {
    const value = raw[key] ?? raw[key.toLowerCase()] ?? raw[key.replace(/_/g, ' ')];
    if (value !== undefined && value !== null && value !== '') {
      return String(value).trim();
    }
  }
  return '';
}

function normalizeSource(source: string): string {
  const normalized = source.toLowerCase().trim().replace(/[\s-]+/g, '_');
  if (VALID_SOURCES.includes(normalized)) {
    return normalized;
  }
  // Try to match common variations
  if (normalized.includes('linkedin')) return 'linkedin';
  if (normalized.includes('cold') || normalized.includes('outreach') || normalized.includes('outbound')) return 'cold_outreach';
  if (normalized.includes('referral') || normalized.includes('referred')) return 'referral';
  if (normalized.includes('inbound') || normalized.includes('inquiry')) return 'inbound';
  if (normalized.includes('event') || normalized.includes('conference') || normalized.includes('webinar')) return 'event';
  return 'other';
}

function parseBooleanField(value: string): boolean {
  const normalized = value.toLowerCase().trim();
  return ['true', 'yes', '1', 'y', 'primary', 'main'].includes(normalized);
}

// ============================================================================
// ProspectHandler Class
// ============================================================================

export class ProspectHandler implements EntityHandler<ParsedProspect> {
  entityType = 'prospect' as const;
  private supabase: SupabaseClient;
  private orgCache: Map<string, string | null> = new Map();
  private userCache: Map<string, string | null> = new Map();

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  // ============================================================================
  // Parse
  // ============================================================================

  async parse(raw: Record<string, unknown>): Promise<ParseResult<ParsedProspect>> {
    try {
      const name = getField(raw, COLUMN_MAPPINGS.name);
      const orgName = getField(raw, COLUMN_MAPPINGS.org_name);

      if (!name) {
        return { data: null, error: 'Missing required field: name (contact name)' };
      }

      if (!orgName) {
        return { data: null, error: 'Missing required field: org_name (organization)' };
      }

      const email = getField(raw, COLUMN_MAPPINGS.email);
      const title = getField(raw, COLUMN_MAPPINGS.title);
      const phone = getField(raw, COLUMN_MAPPINGS.phone);
      const linkedinUrl = getField(raw, COLUMN_MAPPINGS.linkedin_url);
      const sourceRaw = getField(raw, COLUMN_MAPPINGS.source);
      const assignedToEmail = getField(raw, COLUMN_MAPPINGS.assigned_to_email);
      const isPrimaryRaw = getField(raw, COLUMN_MAPPINGS.is_primary_contact);
      const notes = getField(raw, COLUMN_MAPPINGS.notes);

      // Resolve org by name
      const orgId = await this.resolveOrg(orgName);

      // Resolve assigned user by email
      let assignedToId: string | undefined;
      if (assignedToEmail) {
        assignedToId = await this.resolveUser(assignedToEmail) || undefined;
      }

      const data: ParsedProspect = {
        name,
        org_name: orgName,
        org_id: orgId || undefined,
        org_resolved: !!orgId,
        email: email || undefined,
        title: title || undefined,
        phone: phone || undefined,
        linkedin_url: linkedinUrl || undefined,
        source: sourceRaw ? normalizeSource(sourceRaw) : 'cold_outreach',
        assigned_to_id: assignedToId,
        is_primary_contact: isPrimaryRaw ? parseBooleanField(isPrimaryRaw) : false,
        notes: notes || undefined,
      };

      return { data };
    } catch (error) {
      return { data: null, error: `Parse error: ${(error as Error).message}` };
    }
  }

  // ============================================================================
  // Validate
  // ============================================================================

  async validate(data: ParsedProspect): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!data.name || data.name.length < 2) {
      errors.push('Contact name must be at least 2 characters');
    }

    if (!data.org_name) {
      errors.push('Organization name is required');
    }

    // Org resolution check - this is a WARNING, not an error
    // The row will get 'needs_org' status instead of 'validated'
    if (!data.org_resolved) {
      warnings.push(`Organization "${data.org_name}" not found - needs manual assignment`);
    }

    // Email format validation
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.push(`Invalid email format: ${data.email}`);
    }

    // LinkedIn URL validation
    if (data.linkedin_url && !data.linkedin_url.includes('linkedin.com')) {
      warnings.push('LinkedIn URL may be invalid - does not contain linkedin.com');
    }

    // Source validation
    if (data.source && !VALID_SOURCES.includes(data.source)) {
      warnings.push(`Source "${data.source}" not recognized - will use "other"`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  // ============================================================================
  // Duplicate Check
  // ============================================================================

  async checkDuplicate(data: ParsedProspect): Promise<DuplicateCheckResult> {
    // Check by email globally - same email = duplicate regardless of org
    if (data.email) {
      const { data: existing, error } = await this.supabase
        .from('prospects')
        .select('id, name, org_id')
        .ilike('email', data.email)
        .limit(1);

      if (error) {
        console.error('Duplicate check error:', error);
        return { isDuplicate: false };
      }

      if (existing && existing.length > 0) {
        // Get org name for better error message
        let orgName = 'unknown org';
        if (existing[0].org_id) {
          const { data: org } = await this.supabase
            .from('trial_organizations')
            .select('org_name')
            .eq('org_id', existing[0].org_id)
            .single();
          if (org) orgName = org.org_name;
        }

        return {
          isDuplicate: true,
          existingId: existing[0].id,
          reason: `Prospect with email "${data.email}" already exists (${existing[0].name} at ${orgName})`,
        };
      }
    }

    return { isDuplicate: false };
  }

  // ============================================================================
  // Import
  // ============================================================================

  async import(data: ParsedProspect): Promise<ImportResult> {
    // Cannot import without org_id - this should be resolved before import
    if (!data.org_id) {
      return {
        id: null,
        error: `Cannot import: Organization "${data.org_name}" not resolved. Please assign an organization first.`
      };
    }

    try {
      const prospectRecord = {
        org_id: data.org_id,
        name: data.name,
        email: data.email || null,
        title: data.title || null,
        phone: data.phone || null,
        linkedin_url: data.linkedin_url || null,
        source: data.source || 'cold_outreach',
        assigned_to: data.assigned_to_id || null,
        is_primary_contact: data.is_primary_contact,
        status: 'active',
        notes: data.notes || null,
      };

      const { data: inserted, error } = await this.supabase
        .from('prospects')
        .insert(prospectRecord)
        .select('id')
        .single();

      if (error) {
        // Check for specific errors
        if (error.code === '23505') {
          return { id: null, error: `Duplicate: ${error.message}` };
        }
        if (error.code === '23503') {
          return { id: null, error: `Invalid reference: ${error.message}` };
        }
        return { id: null, error: `Failed to insert prospect: ${error.message}` };
      }

      return {
        id: inserted.id,
        secondaryId: data.org_id, // Return org_id as secondary for reference
      };
    } catch (error) {
      return { id: null, error: `Import error: ${(error as Error).message}` };
    }
  }

  // ============================================================================
  // Helper: Resolve Org by Name
  // ============================================================================

  private async resolveOrg(orgName: string): Promise<string | null> {
    const key = orgName.toLowerCase().trim();

    if (this.orgCache.has(key)) {
      return this.orgCache.get(key) || null;
    }

    // Try exact match first
    const { data: exact } = await this.supabase
      .from('trial_organizations')
      .select('org_id, org_name')
      .ilike('org_name', orgName)
      .limit(1);

    if (exact && exact.length > 0) {
      this.orgCache.set(key, exact[0].org_id);
      return exact[0].org_id;
    }

    // Try fuzzy match with LIKE
    const { data: fuzzy } = await this.supabase
      .from('trial_organizations')
      .select('org_id, org_name')
      .ilike('org_name', `%${key}%`)
      .limit(1);

    if (fuzzy && fuzzy.length > 0) {
      this.orgCache.set(key, fuzzy[0].org_id);
      return fuzzy[0].org_id;
    }

    // Not found
    this.orgCache.set(key, null);
    return null;
  }

  // ============================================================================
  // Helper: Resolve User by Email
  // ============================================================================

  private async resolveUser(email: string): Promise<string | null> {
    const key = email.toLowerCase().trim();

    if (this.userCache.has(key)) {
      return this.userCache.get(key) || null;
    }

    const { data } = await this.supabase
      .from('users')
      .select('id')
      .ilike('email', key)
      .limit(1);

    const result = data?.[0]?.id || null;
    this.userCache.set(key, result);
    return result;
  }

  // ============================================================================
  // Helper: Check if Org Resolved
  // ============================================================================

  needsOrgResolution(data: ParsedProspect): boolean {
    return !data.org_resolved;
  }
}

// Export factory function
export function createProspectHandler(supabase: SupabaseClient): ProspectHandler {
  return new ProspectHandler(supabase);
}
