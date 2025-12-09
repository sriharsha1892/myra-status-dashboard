/**
 * StatusUpdateHandler
 *
 * Handles bulk updates to trial organization statuses (expired, churned, etc.)
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

export interface ParsedStatusUpdate {
  org_name: string;
  org_id?: string;
  new_status: string;
  new_lifecycle_stage?: string;
  reason?: string;
  notes?: string;
}

// ============================================================================
// Constants
// ============================================================================

const VALID_STATUSES = [
  'requested', 'approved', 'active', 'extended',
  'completed', 'cancelled', 'expired', 'churned'
];

const VALID_LIFECYCLE_STAGES = [
  'prospect', 'trial_pending', 'trial_active',
  'trial_expired', 'customer', 'lost'
];

const COLUMN_MAPPINGS: Record<string, string[]> = {
  org_name: ['org_name', 'organization', 'company', 'name', 'Company', 'Organization'],
  org_id: ['org_id', 'id', 'organization_id'],
  new_status: ['new_status', 'status', 'trial_status', 'Status', 'Trial Status'],
  new_lifecycle_stage: ['lifecycle_stage', 'stage', 'lifecycle', 'Lifecycle Stage'],
  reason: ['reason', 'outcome_reason', 'Reason'],
  notes: ['notes', 'note', 'comment', 'Notes'],
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

// ============================================================================
// StatusUpdateHandler Class
// ============================================================================

export class StatusUpdateHandler implements EntityHandler<ParsedStatusUpdate> {
  entityType = 'status_update' as const;
  private supabase: SupabaseClient;
  private orgCache: Map<string, string | null> = new Map();

  constructor(supabase?: SupabaseClient) {
    this.supabase = supabase || getSupabase();
  }

  async parse(raw: Record<string, unknown>): Promise<ParseResult<ParsedStatusUpdate>> {
    try {
      const orgName = getField(raw, COLUMN_MAPPINGS.org_name);
      const orgId = getField(raw, COLUMN_MAPPINGS.org_id);
      const newStatus = getField(raw, COLUMN_MAPPINGS.new_status).toLowerCase();
      const newLifecycleStage = getField(raw, COLUMN_MAPPINGS.new_lifecycle_stage).toLowerCase();
      const reason = getField(raw, COLUMN_MAPPINGS.reason);
      const notes = getField(raw, COLUMN_MAPPINGS.notes);

      if (!orgName && !orgId) {
        return { data: null, error: 'Missing organization name or ID' };
      }

      if (!newStatus && !newLifecycleStage) {
        return { data: null, error: 'Missing new status or lifecycle stage' };
      }

      return {
        data: {
          org_name: orgName,
          org_id: orgId || undefined,
          new_status: newStatus,
          new_lifecycle_stage: newLifecycleStage || undefined,
          reason: reason || undefined,
          notes: notes || undefined,
        },
      };
    } catch (error) {
      return { data: null, error: `Parse error: ${(error as Error).message}` };
    }
  }

  async validate(data: ParsedStatusUpdate): Promise<ValidationResult> {
    const errors: string[] = [];

    if (!data.org_name && !data.org_id) {
      errors.push('Either org_name or org_id is required');
    }

    if (data.new_status && !VALID_STATUSES.includes(data.new_status)) {
      errors.push(`Invalid status: ${data.new_status}. Must be one of: ${VALID_STATUSES.join(', ')}`);
    }

    if (data.new_lifecycle_stage && !VALID_LIFECYCLE_STAGES.includes(data.new_lifecycle_stage)) {
      errors.push(`Invalid lifecycle stage: ${data.new_lifecycle_stage}`);
    }

    // Verify org exists
    const orgId = await this.resolveOrgId(data);
    if (!orgId) {
      errors.push(`Organization not found: ${data.org_name || data.org_id}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  async checkDuplicate(_data: ParsedStatusUpdate): Promise<DuplicateCheckResult> {
    // Status updates are idempotent - no duplicate check needed
    return { isDuplicate: false };
  }

  async import(data: ParsedStatusUpdate): Promise<ImportResult> {
    const orgId = await this.resolveOrgId(data);

    if (!orgId) {
      return { id: null, error: `Organization not found: ${data.org_name || data.org_id}` };
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (data.new_status) {
      updates.trial_status = data.new_status;
    }

    if (data.new_lifecycle_stage) {
      updates.org_lifecycle_stage = data.new_lifecycle_stage;
    }

    if (data.reason) {
      updates.deal_outcome_reason = data.reason;
    }

    const { error } = await this.supabase
      .from('trial_organizations')
      .update(updates)
      .eq('org_id', orgId);

    if (error) {
      return { id: null, error: `Update failed: ${error.message}` };
    }

    return { id: orgId };
  }

  private async resolveOrgId(data: ParsedStatusUpdate): Promise<string | null> {
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
}

export function createStatusUpdateHandler(supabase?: SupabaseClient): StatusUpdateHandler {
  return new StatusUpdateHandler(supabase);
}
