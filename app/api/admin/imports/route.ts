/**
 * Admin Imports API
 *
 * Handles bulk import operations via the reliable import pipeline
 */

import { NextRequest, NextResponse } from 'next/server';
import * as Papa from 'papaparse';
import { createClient } from '@supabase/supabase-js';
import { StagingManager } from '@/lib/reliableImport/StagingManager';
import { OrganizationHandler } from '@/lib/reliableImport/handlers/OrganizationHandler';
import { StatusUpdateHandler } from '@/lib/reliableImport/handlers/StatusUpdateHandler';
import { ActivityHandler } from '@/lib/reliableImport/handlers/ActivityHandler';
import { MyRAUsageHandler } from '@/lib/reliableImport/handlers/MyRAUsageHandler';
import { ProspectHandler } from '@/lib/reliableImport/handlers/ProspectHandler';
import { EntityType, EntityHandler } from '@/lib/reliableImport/types';
import {
  getFieldsForEntity,
  autoDetectColumnMapping,
  validateColumnMapping,
  applyColumnMapping,
} from '@/lib/reliableImport/fieldDefinitions';
import {
  parseWithAI,
  buildExtractionPrompt,
  buildInputPrompt,
} from '@/lib/ai/bulkParsingService';

// ============================================================================
// Helpers
// ============================================================================

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function getHandler(entityType: EntityType): EntityHandler {
  const supabase = getSupabase();
  switch (entityType) {
    case 'organization':
      return new OrganizationHandler(supabase);
    case 'status_update':
      return new StatusUpdateHandler(supabase);
    case 'activity':
      return new ActivityHandler(supabase);
    case 'myra_usage':
      return new MyRAUsageHandler(supabase);
    case 'prospect':
      return new ProspectHandler(supabase);
    default:
      return new OrganizationHandler(supabase);
  }
}

// ============================================================================
// GET - List batches or get batch details
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');
    const action = searchParams.get('action');

    const staging = new StagingManager(getSupabase());

    if (batchId) {
      if (action === 'failed') {
        // Get failed rows for export
        const failed = await staging.getRowsByStatus(batchId, [
          'parse_failed',
          'validation_failed',
          'import_failed',
        ]);
        return NextResponse.json({ rows: failed });
      }

      if (action === 'rows') {
        // Get paginated rows with optional status filter
        const status = searchParams.get('status') as string | null;
        const limit = parseInt(searchParams.get('limit') || '50', 10);
        const offset = parseInt(searchParams.get('offset') || '0', 10);

        const result = await staging.getRows(batchId, {
          status: status === 'all' || !status ? 'all' : status as any,
          limit,
          offset,
        });

        return NextResponse.json({
          rows: result.rows,
          total: result.total,
          hasMore: offset + result.rows.length < result.total,
        });
      }

      // Get batch summary
      const summary = await staging.getBatchSummary(batchId);
      const errors = await staging.getRecentErrors(batchId, 10);
      return NextResponse.json({ summary, errors });
    }

    // List all batches
    const batches = await staging.listBatches({ limit: 50 });
    return NextResponse.json({ batches });
  } catch (error) {
    console.error('Import API error:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST - Create batch, validate, or import
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, batchId, entityType, name, data, columnMapping } = body;

    const staging = new StagingManager(getSupabase());

    switch (action) {
      case 'prepare': {
        // Parse CSV/JSON data and stage rows
        if (!data || !entityType) {
          return NextResponse.json(
            { error: 'Missing data or entityType' },
            { status: 400 }
          );
        }

        let rows: Record<string, unknown>[];

        // Try to parse as JSON first
        try {
          const parsed = JSON.parse(data);
          rows = Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          // Parse as CSV
          const result = Papa.parse(data, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (h: string) => h.trim(),
            transform: (v: string) => v.trim(),
          });
          rows = result.data as Record<string, unknown>[];
        }

        if (rows.length === 0) {
          return NextResponse.json(
            { error: 'No data rows found' },
            { status: 400 }
          );
        }

        // Apply column mapping if provided
        if (columnMapping && Object.keys(columnMapping).length > 0) {
          rows = applyColumnMapping(rows, columnMapping);
        }

        // Create batch
        const batchName = name || `${entityType}-import-${new Date().toISOString().slice(0, 16)}`;
        const newBatchId = await staging.createBatch({
          name: batchName,
          entityType,
          sourceType: 'csv',
        });

        // Stage rows
        const stagedRows = rows.map((raw) => ({ raw_data: raw, entity_type: entityType }));
        const count = await staging.stageRows(newBatchId, stagedRows);

        return NextResponse.json({
          batchId: newBatchId,
          staged: count,
          message: `Staged ${count} rows for import`,
        });
      }

      case 'validate': {
        if (!batchId) {
          return NextResponse.json({ error: 'Missing batchId' }, { status: 400 });
        }

        const batch = await staging.getBatch(batchId);
        if (!batch) {
          return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
        }

        const handler = getHandler(batch.entity_type as EntityType);
        await staging.updateBatchStatus(batchId, 'validating');

        const pendingRows = await staging.getRowsByStatus(batchId, 'pending');
        let validated = 0;
        let failed = 0;

        for (const row of pendingRows) {
          const parseResult = await handler.parse(row.raw_data);

          if (!parseResult.data) {
            await staging.updateRowStatus(row.staging_id, 'parse_failed', {
              error_message: parseResult.error || 'Parse failed',
            });
            failed++;
            continue;
          }

          await staging.updateRowStatus(row.staging_id, 'parsed', {
            parsed_data: parseResult.data as Record<string, unknown>,
          });

          const validationResult = await handler.validate(parseResult.data);

          if (!validationResult.valid) {
            await staging.updateRowStatus(row.staging_id, 'validation_failed', {
              error_message: validationResult.errors.join('; '),
            });
            failed++;
          } else {
            // For prospects, check if org needs resolution
            const parsedData = parseResult.data as { org_resolved?: boolean };
            if (batch.entity_type === 'prospect' && parsedData.org_resolved === false) {
              await staging.updateRowStatus(row.staging_id, 'needs_org', {
                error_message: validationResult.warnings?.join('; ') || 'Organization not found - needs manual assignment',
              });
              validated++; // Count as validated but needs org
            } else {
              await staging.updateRowStatus(row.staging_id, 'validated');
              validated++;
            }
          }
        }

        await staging.updateBatchStatus(batchId, 'validated');
        await staging.updateBatchStats(batchId);

        return NextResponse.json({
          validated,
          failed,
          message: `Validated ${validated} rows, ${failed} failed`,
        });
      }

      case 'import': {
        if (!batchId) {
          return NextResponse.json({ error: 'Missing batchId' }, { status: 400 });
        }

        const batch = await staging.getBatch(batchId);
        if (!batch) {
          return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
        }

        const handler = getHandler(batch.entity_type as EntityType);

        // Reset stuck rows
        await staging.resetStuckRows(batchId);
        await staging.updateBatchStatus(batchId, 'importing');

        const validatedRows = await staging.getRowsByStatus(batchId, 'validated');
        let imported = 0;
        let failed = 0;
        let skipped = 0;

        for (const row of validatedRows) {
          await staging.updateRowStatus(row.staging_id, 'importing');

          try {
            const data = row.parsed_data;
            if (!data) {
              await staging.updateRowStatus(row.staging_id, 'import_failed', {
                error_message: 'No parsed data',
              });
              failed++;
              continue;
            }

            const dupCheck = await handler.checkDuplicate(data);
            if (dupCheck.isDuplicate) {
              await staging.updateRowStatus(row.staging_id, 'skipped', {
                imported_id: dupCheck.existingId || undefined,
                error_message: dupCheck.reason || 'Duplicate',
              });
              skipped++;
              continue;
            }

            const result = await handler.import(data);

            if (result.error) {
              await staging.updateRowStatus(row.staging_id, 'import_failed', {
                error_message: result.error,
              });
              failed++;
            } else {
              await staging.updateRowStatus(row.staging_id, 'imported', {
                imported_id: result.id || undefined,
                imported_id_secondary: result.secondaryId || undefined,
              });
              imported++;
            }
          } catch (error) {
            await staging.updateRowStatus(row.staging_id, 'import_failed', {
              error_message: (error as Error).message,
            });
            failed++;
          }

          // Small delay to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, 50));
        }

        await staging.updateBatchStatus(batchId, 'completed');
        await staging.updateBatchStats(batchId);

        return NextResponse.json({
          imported,
          failed,
          skipped,
          message: `Imported ${imported}, failed ${failed}, skipped ${skipped}`,
        });
      }

      case 'retry': {
        if (!batchId) {
          return NextResponse.json({ error: 'Missing batchId' }, { status: 400 });
        }

        const failedRows = await staging.getFailedRows(batchId, 3);

        if (failedRows.length === 0) {
          return NextResponse.json({ message: 'No failed rows to retry' });
        }

        await staging.batchUpdateStatus(
          failedRows.map((r) => r.staging_id),
          'validated'
        );

        return NextResponse.json({
          reset: failedRows.length,
          message: `Reset ${failedRows.length} failed rows for retry`,
        });
      }

      case 'delete': {
        if (!batchId) {
          return NextResponse.json({ error: 'Missing batchId' }, { status: 400 });
        }

        await staging.deleteBatch(batchId);
        return NextResponse.json({ message: 'Batch deleted' });
      }

      case 'update_row': {
        // Update a single row's data
        const { stagingId, updates } = body;
        if (!stagingId) {
          return NextResponse.json({ error: 'Missing stagingId' }, { status: 400 });
        }

        const updatedRow = await staging.updateRowData(stagingId, updates || {});

        if (!updatedRow) {
          return NextResponse.json({ error: 'Row not found' }, { status: 404 });
        }

        return NextResponse.json({
          success: true,
          row: updatedRow,
          message: 'Row updated and reset to pending',
        });
      }

      case 'delete_rows': {
        // Delete multiple rows by IDs
        const { stagingIds } = body;
        if (!stagingIds || !Array.isArray(stagingIds) || stagingIds.length === 0) {
          return NextResponse.json({ error: 'Missing or invalid stagingIds' }, { status: 400 });
        }

        const deleted = await staging.deleteRows(stagingIds);

        // Update batch stats after deletion
        if (batchId) {
          await staging.updateBatchStats(batchId);
        }

        return NextResponse.json({
          deleted,
          message: `Deleted ${deleted} rows`,
        });
      }

      case 'assign_org': {
        // Assign an organization to a prospect with 'needs_org' status
        const { stagingId, orgId, orgName } = body;
        if (!stagingId || !orgId) {
          return NextResponse.json({ error: 'Missing stagingId or orgId' }, { status: 400 });
        }

        // Get the current row
        const supabase = getSupabase();
        const { data: row, error: fetchError } = await supabase
          .from('import_staging')
          .select('*')
          .eq('staging_id', stagingId)
          .single();

        if (fetchError || !row) {
          return NextResponse.json({ error: 'Row not found' }, { status: 404 });
        }

        if (row.status !== 'needs_org') {
          return NextResponse.json({ error: 'Row does not need org assignment' }, { status: 400 });
        }

        // Update parsed_data with org_id and org_resolved
        const updatedParsedData = {
          ...row.parsed_data,
          org_id: orgId,
          org_name: orgName || row.parsed_data?.org_name,
          org_resolved: true,
        };

        // Update the row to 'validated' status
        const { error: updateError } = await supabase
          .from('import_staging')
          .update({
            parsed_data: updatedParsedData,
            status: 'validated',
            error_message: null,
            updated_at: new Date().toISOString(),
          })
          .eq('staging_id', stagingId);

        if (updateError) {
          return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        // Update batch stats
        if (row.batch_id) {
          await staging.updateBatchStats(row.batch_id);
        }

        return NextResponse.json({
          success: true,
          message: `Organization assigned successfully`,
        });
      }

      case 'ai_parse': {
        // AI-powered text extraction
        if (!data || !entityType) {
          return NextResponse.json(
            { error: 'Missing text or entityType' },
            { status: 400 }
          );
        }

        const entityConfigs: Record<string, {
          entityPlural: string;
          fields: Array<{ name: string; type: string; required: boolean; description?: string }>;
          specialInstructions: string[];
        }> = {
          organization: {
            entityPlural: 'organizations',
            fields: [
              { name: 'org_name', type: 'string', required: true, description: 'Company name' },
              { name: 'website_url', type: 'string', required: false, description: 'Website URL' },
              { name: 'contact_email', type: 'string', required: false, description: 'Contact email' },
              { name: 'contact_name', type: 'string', required: false, description: 'Contact person name' },
              { name: 'contact_role', type: 'string', required: false, description: 'Contact role/title' },
              { name: 'domain_category', type: 'string', required: false, description: 'Industry (TMT, NEO, AF&B, E&C, HC, AAD)' },
              { name: 'prospect_source', type: 'string', required: false, description: 'Lead source' },
              { name: 'description', type: 'string', required: false, description: 'Notes about the organization' },
            ],
            specialInstructions: [
              'Look for company names, websites, emails, and contact information',
              'Domain categories: TMT (Tech/Media/Telecom), NEO (Natural Energy/Oil), AF&B (Agriculture/Food), E&C (Engineering/Construction), HC (Healthcare), AAD (Auto/Aerospace/Defense)',
              'Infer domain_category from company description if not explicitly stated',
            ],
          },
          activity: {
            entityPlural: 'activities',
            fields: [
              { name: 'org_name', type: 'string', required: true, description: 'Organization name' },
              { name: 'activity_type', type: 'string', required: true, description: 'email_sent, call, meeting, demo, note' },
              { name: 'subject', type: 'string', required: false, description: 'Activity subject/title' },
              { name: 'content', type: 'string', required: false, description: 'Activity details/notes' },
              { name: 'activity_date', type: 'string', required: false, description: 'Date (ISO format)' },
            ],
            specialInstructions: [
              'Extract meetings, calls, emails, demos mentioned in text',
              'Activity types: email_sent, call, meeting, demo, note',
              'Parse any dates mentioned into ISO format',
            ],
          },
          status_update: {
            entityPlural: 'status_updates',
            fields: [
              { name: 'org_name', type: 'string', required: true, description: 'Organization name' },
              { name: 'new_status', type: 'string', required: true, description: 'New status (expired, churned, converted, active)' },
              { name: 'reason', type: 'string', required: false, description: 'Reason for status change' },
            ],
            specialInstructions: [
              'Look for trial status changes, conversions, churn mentions',
              'Valid statuses: active, expired, churned, converted',
              'Include any reason or context for the status change',
            ],
          },
          myra_usage: {
            entityPlural: 'usage_records',
            fields: [
              { name: 'org_name', type: 'string', required: true, description: 'Organization name' },
              { name: 'user_name', type: 'string', required: true, description: 'User who made query' },
              { name: 'title', type: 'string', required: true, description: 'Query/conversation title' },
              { name: 'timestamp', type: 'string', required: false, description: 'When query was made' },
              { name: 'cost', type: 'number', required: false, description: 'Cost in USD' },
            ],
            specialInstructions: [
              'Extract AI query/conversation records',
              'Look for user names, query topics, timestamps, and costs',
            ],
          },
          prospect: {
            entityPlural: 'prospects',
            fields: [
              { name: 'name', type: 'string', required: true, description: 'Contact person full name' },
              { name: 'org_name', type: 'string', required: true, description: 'Company/organization name they belong to' },
              { name: 'email', type: 'string', required: false, description: 'Contact email address' },
              { name: 'title', type: 'string', required: false, description: 'Job title or role' },
              { name: 'phone', type: 'string', required: false, description: 'Phone number' },
              { name: 'linkedin_url', type: 'string', required: false, description: 'LinkedIn profile URL' },
              { name: 'source', type: 'string', required: false, description: 'Lead source (cold_outreach, linkedin, referral, inbound, event)' },
              { name: 'is_primary_contact', type: 'boolean', required: false, description: 'Whether this is the main contact' },
              { name: 'notes', type: 'string', required: false, description: 'Additional notes' },
            ],
            specialInstructions: [
              'Extract PEOPLE/CONTACTS, not companies - each prospect is a person',
              'Every prospect must have a name and the organization they belong to',
              'Look for job titles, email addresses, phone numbers, and LinkedIn profiles',
              'Lead sources: cold_outreach, linkedin, referral, inbound, event',
              'If multiple contacts are from the same company, create separate prospect entries for each',
            ],
          },
        };

        const config = entityConfigs[entityType];
        if (!config) {
          return NextResponse.json({ error: 'Invalid entity type' }, { status: 400 });
        }

        const systemPrompt = buildExtractionPrompt({
          entityType,
          entityPlural: config.entityPlural,
          fields: config.fields,
          specialInstructions: config.specialInstructions,
        });

        const userPrompt = buildInputPrompt(data);

        interface AIParseResponse {
          [key: string]: unknown[] | { count: number; confidence: number } | undefined;
        }

        const result = await parseWithAI<AIParseResponse>({
          systemPrompt,
          userPrompt,
          temperature: 0.1,
          maxRetries: 2,
        });

        if (!result.success || !result.data) {
          return NextResponse.json(
            { error: result.error || 'AI parsing failed' },
            { status: 500 }
          );
        }

        const items = (result.data[config.entityPlural] as unknown[] | undefined) || [];
        const rawMetadata = result.data.metadata;
        const metadata = (rawMetadata && typeof rawMetadata === 'object' && 'count' in rawMetadata)
          ? rawMetadata as { count: number; confidence: number }
          : { count: items.length, confidence: 0.7 };

        return NextResponse.json({
          items,
          metadata,
          tokensUsed: result.tokensUsed,
          duration: result.duration,
        });
      }

      case 'detect_columns': {
        // Auto-detect column mapping from CSV headers
        if (!data || !entityType) {
          return NextResponse.json(
            { error: 'Missing data or entityType' },
            { status: 400 }
          );
        }

        // Parse first few rows to get headers
        let csvHeaders: string[] = [];
        try {
          const parsed = JSON.parse(data);
          const firstRow = Array.isArray(parsed) ? parsed[0] : parsed;
          csvHeaders = Object.keys(firstRow || {});
        } catch {
          // Parse as CSV
          const result = Papa.parse(data, {
            header: true,
            preview: 1, // Only need first row for headers
          });
          csvHeaders = result.meta.fields || [];
        }

        if (csvHeaders.length === 0) {
          return NextResponse.json(
            { error: 'Could not detect columns from data' },
            { status: 400 }
          );
        }

        const expectedFields = getFieldsForEntity(entityType);
        const autoMapping = autoDetectColumnMapping(csvHeaders, entityType);
        const validation = validateColumnMapping(autoMapping, entityType);

        return NextResponse.json({
          csvColumns: csvHeaders,
          expectedFields,
          autoMapping,
          needsMapping: !validation.valid,
          missingRequired: validation.missingRequired,
        });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Import API error:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
