/**
 * ActivityHandler
 *
 * Handles bulk import of user activities and interactions
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

export interface ParsedActivity {
  org_name: string;
  org_id?: string;
  user_email?: string;
  user_name?: string;
  activity_type: string;
  direction?: string;
  subject?: string;
  content?: string;
  activity_date?: string;
  logged_by?: string;
}

// ============================================================================
// Constants
// ============================================================================

const VALID_ACTIVITY_TYPES = [
  'email_sent', 'email_received', 'call', 'linkedin',
  'meeting', 'note', 'screening', 'demo',
  'login', 'feature_usage', 'support_ticket'
];

const COLUMN_MAPPINGS: Record<string, string[]> = {
  org_name: ['org_name', 'organization', 'company', 'Company', 'Organization'],
  org_id: ['org_id', 'organization_id'],
  user_email: ['user_email', 'email', 'Email', 'User Email'],
  user_name: ['user_name', 'user', 'name', 'User', 'Name'],
  activity_type: ['activity_type', 'type', 'interaction_type', 'Type', 'Activity Type'],
  direction: ['direction', 'Direction'],
  subject: ['subject', 'title', 'Subject', 'Title'],
  content: ['content', 'description', 'notes', 'body', 'Content', 'Notes', 'Description'],
  activity_date: ['activity_date', 'date', 'timestamp', 'Date', 'Activity Date', 'Timestamp'],
  logged_by: ['logged_by', 'rep', 'agent', 'Logged By', 'Rep'],
};

const ACTIVITY_TYPE_ALIASES: Record<string, string> = {
  email: 'email_sent',
  sent: 'email_sent',
  received: 'email_received',
  reply: 'email_received',
  phone: 'call',
  called: 'call',
  meet: 'meeting',
  met: 'meeting',
  demo: 'demo',
  screened: 'screening',
  screen: 'screening',
  note: 'note',
  notes: 'note',
  linkedin: 'linkedin',
  li: 'linkedin',
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
    const value = raw[key] ?? raw[key.toLowerCase()];
    if (value !== undefined && value !== null && value !== '') {
      return String(value).trim();
    }
  }
  return '';
}

function normalizeActivityType(type: string): string {
  const lower = type.toLowerCase().trim();
  return ACTIVITY_TYPE_ALIASES[lower] || lower;
}

function parseDate(dateStr: string): string | null {
  if (!dateStr) return null;

  // Try ISO format first
  const isoDate = new Date(dateStr);
  if (!isNaN(isoDate.getTime())) {
    return isoDate.toISOString();
  }

  // Try common formats
  const formats = [
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})/, // MM/DD/YYYY
    /^(\d{4})-(\d{1,2})-(\d{1,2})/, // YYYY-MM-DD
  ];

  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      try {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          return date.toISOString();
        }
      } catch {
        continue;
      }
    }
  }

  return null;
}

// ============================================================================
// ActivityHandler Class
// ============================================================================

export class ActivityHandler implements EntityHandler<ParsedActivity> {
  entityType = 'activity' as const;
  private supabase: SupabaseClient;
  private orgCache: Map<string, string | null> = new Map();
  private userCache: Map<string, string | null> = new Map();

  constructor(supabase?: SupabaseClient) {
    this.supabase = supabase || getSupabase();
  }

  async parse(raw: Record<string, unknown>): Promise<ParseResult<ParsedActivity>> {
    try {
      const orgName = getField(raw, COLUMN_MAPPINGS.org_name);
      const orgId = getField(raw, COLUMN_MAPPINGS.org_id);
      const userEmail = getField(raw, COLUMN_MAPPINGS.user_email);
      const userName = getField(raw, COLUMN_MAPPINGS.user_name);
      const activityType = normalizeActivityType(getField(raw, COLUMN_MAPPINGS.activity_type));
      const direction = getField(raw, COLUMN_MAPPINGS.direction);
      const subject = getField(raw, COLUMN_MAPPINGS.subject);
      const content = getField(raw, COLUMN_MAPPINGS.content);
      const activityDateRaw = getField(raw, COLUMN_MAPPINGS.activity_date);
      const loggedBy = getField(raw, COLUMN_MAPPINGS.logged_by);

      if (!orgName && !orgId) {
        return { data: null, error: 'Missing organization name or ID' };
      }

      if (!activityType) {
        return { data: null, error: 'Missing activity type' };
      }

      const activityDate = parseDate(activityDateRaw);

      return {
        data: {
          org_name: orgName,
          org_id: orgId || undefined,
          user_email: userEmail ? userEmail.toLowerCase() : undefined,
          user_name: userName || undefined,
          activity_type: activityType,
          direction: direction || undefined,
          subject: subject || undefined,
          content: content || undefined,
          activity_date: activityDate || new Date().toISOString(),
          logged_by: loggedBy || undefined,
        },
      };
    } catch (error) {
      return { data: null, error: `Parse error: ${(error as Error).message}` };
    }
  }

  async validate(data: ParsedActivity): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!data.org_name && !data.org_id) {
      errors.push('Either org_name or org_id is required');
    }

    if (!VALID_ACTIVITY_TYPES.includes(data.activity_type)) {
      errors.push(`Invalid activity type: ${data.activity_type}. Valid types: ${VALID_ACTIVITY_TYPES.join(', ')}`);
    }

    // Verify org exists
    const orgId = await this.resolveOrgId(data);
    if (!orgId) {
      errors.push(`Organization not found: ${data.org_name || data.org_id}`);
    }

    // Warn if user not found but don't fail
    if (data.user_email) {
      const userId = await this.resolveUserId(data.user_email, orgId || '');
      if (!userId) {
        warnings.push(`User not found: ${data.user_email} - activity will be logged without user link`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  async checkDuplicate(data: ParsedActivity): Promise<DuplicateCheckResult> {
    // Check for duplicate activity by org + type + date + subject
    if (!data.org_id && !data.org_name) {
      return { isDuplicate: false };
    }

    const orgId = await this.resolveOrgId(data);
    if (!orgId) {
      return { isDuplicate: false };
    }

    // Check prospect_activities table
    const { data: existing } = await this.supabase
      .from('prospect_activities')
      .select('id')
      .eq('org_id', orgId)
      .eq('activity_type', data.activity_type)
      .eq('subject', data.subject || '')
      .gte('activity_date', new Date(new Date(data.activity_date || '').getTime() - 60000).toISOString())
      .lte('activity_date', new Date(new Date(data.activity_date || '').getTime() + 60000).toISOString())
      .limit(1)
      .single();

    if (existing) {
      return {
        isDuplicate: true,
        existingId: existing.id,
        reason: 'Similar activity already exists within 1 minute',
      };
    }

    return { isDuplicate: false };
  }

  async import(data: ParsedActivity): Promise<ImportResult> {
    const orgId = await this.resolveOrgId(data);

    if (!orgId) {
      return { id: null, error: `Organization not found: ${data.org_name || data.org_id}` };
    }

    // Resolve user if email provided
    let prospectId: string | null = null;
    if (data.user_email) {
      // Try to find in prospects table
      const { data: prospect } = await this.supabase
        .from('prospects')
        .select('id')
        .eq('org_id', orgId)
        .ilike('email', data.user_email)
        .limit(1)
        .single();

      prospectId = prospect?.id || null;
    }

    // Resolve logged_by to user ID
    let loggedById: string | null = null;
    if (data.logged_by) {
      const { data: user } = await this.supabase
        .from('users')
        .select('id')
        .ilike('full_name', `%${data.logged_by}%`)
        .limit(1)
        .single();

      loggedById = user?.id || null;
    }

    const activityId = crypto.randomUUID();

    const activityRecord = {
      id: activityId,
      org_id: orgId,
      prospect_id: prospectId,
      activity_type: data.activity_type,
      direction: data.direction || null,
      subject: data.subject || null,
      content: data.content || null,
      activity_date: data.activity_date || new Date().toISOString(),
      logged_by: loggedById,
      created_at: new Date().toISOString(),
    };

    const { error } = await this.supabase
      .from('prospect_activities')
      .insert(activityRecord);

    if (error) {
      return { id: null, error: `Insert failed: ${error.message}` };
    }

    return { id: activityId };
  }

  private async resolveOrgId(data: ParsedActivity): Promise<string | null> {
    if (data.org_id) return data.org_id;

    const key = data.org_name.toLowerCase();
    if (this.orgCache.has(key)) {
      return this.orgCache.get(key) || null;
    }

    const { data: org } = await this.supabase
      .from('trial_organizations')
      .select('org_id')
      .ilike('org_name', data.org_name)
      .limit(1)
      .single();

    const result = org?.org_id || null;
    this.orgCache.set(key, result);
    return result;
  }

  private async resolveUserId(email: string, orgId: string): Promise<string | null> {
    const key = `${email}:${orgId}`;
    if (this.userCache.has(key)) {
      return this.userCache.get(key) || null;
    }

    const { data: user } = await this.supabase
      .from('trial_users')
      .select('user_id')
      .eq('org_id', orgId)
      .ilike('email', email)
      .limit(1)
      .single();

    const result = user?.user_id || null;
    this.userCache.set(key, result);
    return result;
  }
}

export function createActivityHandler(supabase?: SupabaseClient): ActivityHandler {
  return new ActivityHandler(supabase);
}
