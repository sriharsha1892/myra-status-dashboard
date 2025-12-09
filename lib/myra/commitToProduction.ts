// Commit to Production - Gracefully moves approved data from staging to platform_queries
// Handles errors, creates users if needed, maintains audit trail

import { createClient } from '@supabase/supabase-js';
import type { StagingRecord } from './types';

export interface CommitResult {
  success: boolean;
  statistics: {
    attempted: number;
    successful: number;
    failed: number;
    users_created: number;
  };
  errors: Array<{
    staging_id: string;
    error: string;
    raw_data?: any;
  }>;
}

/**
 * Gracefully commit approved staging records to production
 * Handles user creation, error recovery, and maintains full audit trail
 */
export async function commitBatchToProduction(
  batchId: string,
  supabase: ReturnType<typeof createClient>
): Promise<CommitResult> {
  const result: CommitResult = {
    success: false,
    statistics: {
      attempted: 0,
      successful: 0,
      failed: 0,
      users_created: 0,
    },
    errors: [],
  };

  try {
    // Get all approved/reviewed records from staging
    const { data: stagingRecords, error: fetchError } = await supabase
      .from('myra_activity_staging')
      .select('*')
      .eq('import_batch_id', batchId)
      .in('mapping_status', ['approved', 'reviewed'])
      .is('committed_at', null); // Not yet committed

    if (fetchError) {
      throw new Error(`Failed to fetch staging records: ${fetchError.message}`);
    }

    if (!stagingRecords || stagingRecords.length === 0) {
      return {
        ...result,
        success: true, // Not really an error, just nothing to commit
      };
    }

    result.statistics.attempted = stagingRecords.length;

    // Process each record with graceful error handling
    for (const record of stagingRecords as StagingRecord[]) {
      try {
        let finalUserId = record.mapped_user_id;

        // Handle "CREATE_NEW" user case
        if (record.mapped_user_id === 'CREATE_NEW' || !record.mapped_user_id) {
          if (record.mapped_org_id && (record.raw_user_name || record.raw_user_email)) {
            // Create new trial user
            const { data: newUser, error: userError } = await supabase
              .from('trial_users')
              .insert({
                org_id: record.mapped_org_id,
                name: record.raw_user_name,
                email: record.raw_user_email,
                source: 'myra_import',
                queries_executed: 0,
              })
              .select('user_id')
              .single();

            if (userError) {
              throw new Error(`Failed to create user: ${userError.message}`);
            }

            finalUserId = newUser.user_id;
            result.statistics.users_created++;
          } else {
            // Can't create user without org
            throw new Error('Cannot create user without organization mapping');
          }
        }

        // Validate we have required fields
        if (!record.mapped_org_id) {
          throw new Error('Organization mapping is required');
        }

        // Insert to platform_queries
        const { error: insertError } = await supabase.from('platform_queries').insert({
          org_id: record.mapped_org_id,
          user_id: finalUserId || undefined,
          query_text: record.raw_insight_title,
          insight_title: record.raw_insight_title,
          query_category: record.parsed_category || 'other',
          executed_at: record.parsed_timestamp || new Date(),
          status: 'success',
          confidence_score: record.extraction_confidence,
          cost_usd: record.parsed_cost,
          import_batch_id: batchId,
          import_source: 'screenshot_ai',
          ai_extracted_data: record.ai_extraction_data,
          response_time_ms: null,
          observations: `Imported from screenshot on ${new Date().toISOString()}`,
        });

        if (insertError) {
          throw new Error(`Failed to insert platform query: ${insertError.message}`);
        }

        // Mark staging record as committed
        await supabase
          .from('myra_activity_staging')
          .update({
            mapping_status: 'committed',
            committed_at: new Date().toISOString(),
          })
          .eq('staging_id', record.staging_id);

        result.statistics.successful++;
      } catch (error: any) {
        result.statistics.failed++;
        result.errors.push({
          staging_id: record.staging_id,
          error: error.message,
          raw_data: {
            org: record.raw_org_name,
            user: record.raw_user_name,
            title: record.raw_insight_title,
          },
        });

        // Mark staging record as failed
        await supabase
          .from('myra_activity_staging')
          .update({
            mapping_status: 'failed',
            review_notes: `Commit failed: ${error.message}`,
          })
          .eq('staging_id', record.staging_id);
      }
    }

    // Update batch status
    await supabase
      .from('myra_import_batches')
      .update({
        committed: result.statistics.successful,
        failed: result.statistics.failed,
        status: result.statistics.failed === 0 ? 'committed' : 'committed',
        committed_at: new Date().toISOString(),
      })
      .eq('batch_id', batchId);

    result.success = true;
    return result;
  } catch (error: any) {
    result.errors.push({
      staging_id: 'BATCH',
      error: `Batch commit failed: ${error.message}`,
    });
    return result;
  }
}

/**
 * Rollback a committed batch (mark as uncommitted, optionally delete platform_queries)
 */
export async function rollbackBatch(
  batchId: string,
  deleteFromProduction: boolean,
  supabase: ReturnType<typeof createClient>
): Promise<{ success: boolean; error?: string }> {
  try {
    if (deleteFromProduction) {
      // Delete from platform_queries
      const { error: deleteError } = await supabase
        .from('platform_queries')
        .delete()
        .eq('import_batch_id', batchId);

      if (deleteError) {
        throw new Error(`Failed to delete platform queries: ${deleteError.message}`);
      }
    }

    // Mark staging records as uncommitted
    await supabase
      .from('myra_activity_staging')
      .update({
        mapping_status: 'approved', // Reset to approved
        committed_at: null,
      })
      .eq('import_batch_id', batchId)
      .eq('mapping_status', 'committed');

    // Update batch status
    await supabase
      .from('myra_import_batches')
      .update({
        status: 'extracted',
        committed: 0,
        committed_at: null,
      })
      .eq('batch_id', batchId);

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
