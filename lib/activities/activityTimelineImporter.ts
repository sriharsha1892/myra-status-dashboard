/**
 * Activity Timeline Bulk Import - Framework Version
 *
 * Migrated from app/support/admin/bulk-activity-import/page.tsx
 * Reduced from 546 lines (page + logic) to ~150 lines (core logic)
 *
 * Features:
 * - CSV file parsing
 * - Flexible column mapping
 * - Organization name lookup
 * - Multiple event types (meeting, call, demo, email, milestone, note, other)
 * - Metadata support for unmapped columns
 */

import { BulkImporter } from '@/lib/bulkImport';
import { createCSVParser } from '@/lib/bulkImport/parsers/CSVParser';
import { createClient } from '@supabase/supabase-js';

// =====================================================
// TYPES
// =====================================================

export interface ActivityEvent {
  org_name: string;
  event_date: string;
  event_type: string;
  title: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface ActivityEventRecord {
  org_id: string;
  user_id: string;
  event_type: string;
  event_date: string;
  title: string;
  description: string;
  metadata: Record<string, any>;
  created_at: string;
}

// =====================================================
// CONSTANTS
// =====================================================

export const VALID_EVENT_TYPES = [
  'meeting',
  'call',
  'demo',
  'email',
  'milestone',
  'note',
  'other',
] as const;

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Lookup organization ID by name
 */
export async function lookupOrgId(orgName: string): Promise<string | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );

  const { data } = await supabase
    .from('trial_organizations')
    .select('org_id')
    .ilike('org_name', orgName)
    .maybeSingle();

  return data?.org_id || null;
}

// =====================================================
// IMPORTER CONFIGURATION
// =====================================================

export function createActivityTimelineImporter(userId: string) {
  return new BulkImporter<ActivityEvent, ActivityEventRecord>({
    // Entity information
    entityType: 'activity event',
    entityPlural: 'trial_engagement_log',

    // Parser: CSV (flexible headers - user will map them)
    parser: createCSVParser<any>({
      delimiter: ',',
      hasHeader: true,
      trimValues: true,
      skipEmptyRows: true,
    }),

    // Validator: Ensure required fields
    validator: (item) => {
      const errors: string[] = [];

      if (!item.org_name || !item.org_name.trim()) {
        errors.push('org_name is required');
      }

      if (!item.event_date || !item.event_date.trim()) {
        errors.push('event_date is required');
      }

      if (!item.title || !item.title.trim()) {
        errors.push('title is required');
      }

      if (item.event_type && !VALID_EVENT_TYPES.includes(item.event_type)) {
        errors.push(`invalid event_type: ${item.event_type}. Must be one of: ${VALID_EVENT_TYPES.join(', ')}`);
      }

      return {
        isValid: errors.length === 0,
        errors,
      };
    },

    // Transformer: Convert to database format
    // Note: org_name will be resolved to org_id during custom insertion
    transformer: (item) => {
      return {
        org_id: '', // Will be resolved during insertion
        user_id: userId,
        event_type: item.event_type || 'note',
        event_date: item.event_date,
        title: item.title,
        description: item.description || '',
        metadata: item.metadata || {},
        created_at: new Date().toISOString(),
        _org_name: item.org_name, // Temporary field for lookup
      } as any;
    },

    // Database configuration
    database: {
      tableName: 'trial_engagement_log',
      batchSize: 50,
      delayBetweenBatches: 300,
    },

    // Preview columns
    preview: {
      maxRows: 20,
      columns: [
        {
          key: 'org_name',
          label: 'Organization',
          width: '25%',
        },
        {
          key: 'event_date',
          label: 'Date',
          width: '15%',
        },
        {
          key: 'event_type',
          label: 'Type',
          width: '15%',
        },
        {
          key: 'title',
          label: 'Title',
          width: '35%',
        },
        {
          key: 'description',
          label: 'Description',
          width: '10%',
          formatter: (value) => value ? '✓' : '',
        },
      ],
    },

    // Success message builder
    successMessageBuilder: (item) => ({
      title: item.title,
      details: `${(item as any)._org_name} • ${item.event_type} • ${item.event_date}`,
    }),

    // Custom importer for org name → org ID resolution
    customImporter: async (items, onProgress) => {
      return insertActivityEvents(items, onProgress);
    },
  });
}

/**
 * CUSTOM IMPORT WRAPPER
 *
 * Handles org name → org ID lookup before insertion
 */
export async function importActivityTimeline(
  file: File,
  userId: string,
  onProgress?: (progress: any) => void
): Promise<any> {
  const startTime = Date.now();

  try {
    const importer = createActivityTimelineImporter(userId);

    // Step 1: Parse CSV file
    onProgress?.({
      stage: 'parsing',
      percentComplete: 0,
      message: 'Parsing CSV file...',
    });

    const parseResult = await importer.config.parser.parse(file);

    if (parseResult.errors.length > 0 && parseResult.items.length === 0) {
      throw new Error('Failed to parse CSV file');
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

    // Step 3: Transform
    onProgress?.({
      stage: 'transforming',
      percentComplete: 40,
      message: `Transforming ${validated.length} valid items...`,
    });

    const transformed = validated.map(importer.config.transformer);

    // Step 4: Resolve org names to org IDs
    onProgress?.({
      stage: 'importing',
      percentComplete: 50,
      message: 'Resolving organization names...',
    });

    const result = await insertActivityEvents(transformed, onProgress);

    // Step 5: Complete
    onProgress?.({
      stage: 'complete',
      percentComplete: 100,
      message: 'Import complete!',
    });

    return {
      entityType: 'activity event',
      entityPlural: 'trial_engagement_log',
      summary: {
        total: parseResult.items.length,
        successful: result.successful,
        failed: result.failed + result.skipped,
        warnings: parseResult.errors.length,
      },
      success: result.successful > 0 ? [{ title: `Imported ${result.successful} activity events` }] : [],
      failed: result.errors.map(e => ({
        item: e.item.title || 'Unknown',
        error: e.error,
      })),
      duration: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      entityType: 'activity event',
      entityPlural: 'trial_engagement_log',
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
 * Custom database insertion for activity events
 * Resolves org names to org IDs
 */
async function insertActivityEvents(
  items: any[],
  onProgress?: (progress: any) => void
): Promise<{
  successful: number;
  failed: number;
  skipped: number;
  errors: Array<{ item: any; error: string }>;
}> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );

  let successful = 0;
  let failed = 0;
  let skipped = 0;
  const errors: Array<{ item: any; error: string }> = [];

  // Pre-fetch all orgs for faster lookup
  const { data: orgs } = await supabase
    .from('trial_organizations')
    .select('org_id, org_name');

  const orgNameToId = new Map(
    (orgs || []).map(org => [org.org_name.toLowerCase(), org.org_id])
  );

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    try {
      // Progress update
      if (i % 10 === 0) {
        onProgress?.({
          stage: 'importing',
          percentComplete: 60 + ((i / items.length) * 35),
          message: `Importing ${i + 1}/${items.length}...`,
        });
      }

      // Resolve org name to org ID
      const orgId = orgNameToId.get(item._org_name.toLowerCase());
      if (!orgId) {
        errors.push({ item, error: `Organization not found: ${item._org_name}` });
        failed++;
        continue;
      }

      // Insert activity event
      const { error } = await supabase
        .from('trial_engagement_log')
        .insert({
          org_id: orgId,
          user_id: item.user_id,
          event_type: item.event_type,
          event_date: item.event_date,
          title: item.title,
          description: item.description,
          metadata: item.metadata,
          created_at: item.created_at,
        });

      if (error) {
        errors.push({ item, error: error.message });
        failed++;
      } else {
        successful++;
      }
    } catch (error: any) {
      errors.push({ item, error: error.message || 'Unknown error' });
      failed++;
    }
  }

  return { successful, failed, skipped, errors };
}
