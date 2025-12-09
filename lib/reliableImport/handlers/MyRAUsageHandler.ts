/**
 * MyRAUsageHandler
 *
 * Handles parsing, validation, and import of myRA AI usage/conversation data.
 * Data flows: CSV → import_staging → myra_activity_staging → platform_queries
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

export interface ParsedMyRAUsage {
  org_name: string;
  user_name: string;
  title: string;
  timestamp: string;
  parsed_timestamp?: Date;
  cost?: number;
  raw_cost?: string;
}

// ============================================================================
// Constants
// ============================================================================

// Default system user for automated imports (admin@myra.ai)
const SYSTEM_USER_ID = '84796ddb-6458-4eea-9a67-cfcf73a31f7d';

const COLUMN_MAPPINGS: Record<string, string[]> = {
  org_name: ['org_name', 'organization', 'company', 'org', 'Company', 'Organization'],
  user_name: ['user_name', 'user', 'name', 'username', 'User', 'User Name'],
  title: ['title', 'insight_title', 'topic', 'query', 'conversation', 'Title', 'Insight'],
  timestamp: ['timestamp', 'date', 'time', 'datetime', 'created_at', 'Date', 'Timestamp'],
  cost: ['cost', 'cost_usd', 'price', 'amount', 'Cost', '$'],
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

/**
 * Parse flexible timestamp formats like "Dec 05, Fri, 02:11 PM"
 */
function parseTimestamp(timestampStr: string): Date | null {
  if (!timestampStr) return null;

  // Try standard Date parsing first
  const standard = new Date(timestampStr);
  if (!isNaN(standard.getTime())) {
    return standard;
  }

  // Try parsing "Dec 05, Fri, 02:11 PM" format
  const customMatch = timestampStr.match(
    /(\w+)\s+(\d+),?\s*\w*,?\s*(\d{1,2}):(\d{2})\s*(AM|PM)?/i
  );

  if (customMatch) {
    const [, month, day, hour, minute, ampm] = customMatch;
    const monthMap: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
    };

    const monthNum = monthMap[month.toLowerCase().slice(0, 3)];
    if (monthNum === undefined) return null;

    let hourNum = parseInt(hour, 10);
    if (ampm?.toUpperCase() === 'PM' && hourNum !== 12) hourNum += 12;
    if (ampm?.toUpperCase() === 'AM' && hourNum === 12) hourNum = 0;

    const date = new Date();
    date.setMonth(monthNum);
    date.setDate(parseInt(day, 10));
    date.setHours(hourNum);
    date.setMinutes(parseInt(minute, 10));
    date.setSeconds(0);
    date.setMilliseconds(0);

    return date;
  }

  return null;
}

/**
 * Parse cost strings like "$16.49" or "16.49"
 */
function parseCost(costStr: string): number | null {
  if (!costStr) return null;

  // Remove $ and other currency symbols, commas
  const cleaned = costStr.replace(/[$,\s]/g, '');
  const num = parseFloat(cleaned);

  return isNaN(num) ? null : num;
}

// ============================================================================
// Handler Class
// ============================================================================

export class MyRAUsageHandler implements EntityHandler<ParsedMyRAUsage> {
  entityType = 'myra_usage' as const;
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  // ============================================================================
  // Parse
  // ============================================================================

  async parse(raw: Record<string, unknown>): Promise<ParseResult<ParsedMyRAUsage>> {
    try {
      const org_name = getField(raw, COLUMN_MAPPINGS.org_name);
      const user_name = getField(raw, COLUMN_MAPPINGS.user_name);
      const title = getField(raw, COLUMN_MAPPINGS.title);
      const timestamp = getField(raw, COLUMN_MAPPINGS.timestamp);
      const raw_cost = getField(raw, COLUMN_MAPPINGS.cost);

      if (!org_name) {
        return { data: null, error: 'Missing required field: org_name' };
      }

      if (!user_name) {
        return { data: null, error: 'Missing required field: user_name' };
      }

      if (!title) {
        return { data: null, error: 'Missing required field: title' };
      }

      const parsed_timestamp = parseTimestamp(timestamp);
      const cost = parseCost(raw_cost);

      return {
        data: {
          org_name,
          user_name,
          title,
          timestamp,
          parsed_timestamp: parsed_timestamp || undefined,
          cost: cost || undefined,
          raw_cost: raw_cost || undefined,
        },
      };
    } catch (error) {
      return { data: null, error: `Parse error: ${(error as Error).message}` };
    }
  }

  // ============================================================================
  // Validate
  // ============================================================================

  async validate(data: ParsedMyRAUsage): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!data.org_name) errors.push('org_name is required');
    if (!data.user_name) errors.push('user_name is required');
    if (!data.title) errors.push('title is required');

    // Timestamp parsing
    if (data.timestamp && !data.parsed_timestamp) {
      warnings.push(`Could not parse timestamp: "${data.timestamp}"`);
    }

    // Cost validation
    if (data.raw_cost && data.cost === undefined) {
      warnings.push(`Could not parse cost: "${data.raw_cost}"`);
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

  async checkDuplicate(data: ParsedMyRAUsage): Promise<DuplicateCheckResult> {
    // Check for existing record with same title, user, and approximate timestamp
    const { data: existing, error } = await this.supabase
      .from('myra_activity_staging')
      .select('staging_id')
      .eq('raw_insight_title', data.title)
      .eq('raw_user_name', data.user_name)
      .limit(1);

    if (error) {
      console.error('Duplicate check error:', error);
      return { isDuplicate: false };
    }

    if (existing && existing.length > 0) {
      return {
        isDuplicate: true,
        existingId: existing[0].staging_id,
        reason: `Duplicate: "${data.title}" by ${data.user_name}`,
      };
    }

    return { isDuplicate: false };
  }

  // ============================================================================
  // Import
  // ============================================================================

  async import(data: ParsedMyRAUsage): Promise<ImportResult> {
    try {
      // First, get or create a batch for this import session
      let batchId: string;

      // Check for recent batch
      const { data: existingBatch } = await this.supabase
        .from('myra_import_batches')
        .select('batch_id')
        .eq('status', 'in_progress')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (existingBatch) {
        batchId = existingBatch.batch_id;
      } else {
        // Create new batch
        const { data: newBatch, error: batchError } = await this.supabase
          .from('myra_import_batches')
          .insert({
            batch_name: `Import ${new Date().toISOString().slice(0, 16)}`,
            description: 'Bulk import via admin UI',
            status: 'in_progress',
            imported_by: SYSTEM_USER_ID,
          })
          .select('batch_id')
          .single();

        if (batchError) {
          return { id: null, error: `Failed to create batch: ${batchError.message}` };
        }
        batchId = newBatch.batch_id;
      }

      // Insert into myra_activity_staging
      // Handle parsed_timestamp - it may be a Date object or an ISO string (from JSON)
      let parsedTimestampStr: string | undefined;
      if (data.parsed_timestamp) {
        parsedTimestampStr = data.parsed_timestamp instanceof Date
          ? data.parsed_timestamp.toISOString()
          : String(data.parsed_timestamp);
      }

      const { data: inserted, error } = await this.supabase
        .from('myra_activity_staging')
        .insert({
          import_batch_id: batchId,
          raw_org_name: data.org_name,
          raw_user_name: data.user_name,
          raw_insight_title: data.title,
          raw_timestamp: data.timestamp,
          raw_cost: data.raw_cost,
          parsed_timestamp: parsedTimestampStr,
          parsed_cost: data.cost,
          mapping_status: 'pending',
          extraction_confidence: 100, // Manual import is high confidence
        })
        .select('staging_id')
        .single();

      if (error) {
        return { id: null, error: `Failed to insert: ${error.message}` };
      }

      return {
        id: inserted.staging_id,
        secondaryId: batchId,
      };
    } catch (error) {
      return { id: null, error: `Import error: ${(error as Error).message}` };
    }
  }
}
