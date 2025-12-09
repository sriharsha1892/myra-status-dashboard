// Batch Processor - Orchestrates the entire import pipeline
// Handles extraction → staging → intelligent mapping → status determination

import { createClient } from '@supabase/supabase-js';
import { extractInsightFromScreenshot, batchExtractInsights } from './screenshotExtractor';
import { mapOrganization, mapUser, determineRecordStatus, parseFlexibleDate } from './intelligentMapper';
import { callGroqBatch } from '../ai/groqClient';
import type {
  RawInsightData,
  StagingRecord,
  TrialOrg,
  TrialUser,
  ImportBatch,
  MappingConfig,
  DEFAULT_MAPPING_CONFIG
} from './types';

export interface ProcessingProgress {
  stage: 'uploading' | 'extracting' | 'mapping' | 'saving' | 'complete' | 'error';
  current: number;
  total: number;
  message: string;
}

export interface BatchProcessingResult {
  success: boolean;
  batch_id?: string;
  statistics: {
    total: number;
    extracted: number;
    auto_approved: number;
    needs_review: number;
    failed: number;
  };
  errors: Array<{ index: number; error: string }>;
}

/**
 * Process a batch of screenshots through the entire pipeline
 */
export async function processBatch(
  screenshots: Array<{ file: File; url: string }>,
  config: {
    batchName: string;
    description?: string;
    excludedUsers?: string[];
    mappingConfig?: Partial<MappingConfig>;
    userId: string;
  },
  onProgress?: (progress: ProcessingProgress) => void,
  supabase?: ReturnType<typeof createClient>
): Promise<BatchProcessingResult> {
  const result: BatchProcessingResult = {
    success: false,
    statistics: {
      total: screenshots.length,
      extracted: 0,
      auto_approved: 0,
      needs_review: 0,
      failed: 0,
    },
    errors: [],
  };

  if (!supabase) {
    return {
      ...result,
      success: false,
      errors: [{ index: -1, error: 'Supabase client not provided' }],
    };
  }

  try {
    // Step 1: Create import batch
    onProgress?.({
      stage: 'uploading',
      current: 0,
      total: screenshots.length,
      message: 'Creating import batch...',
    });

    const { data: batch, error: batchError } = await supabase
      .from('myra_import_batches')
      .insert({
        batch_name: config.batchName,
        description: config.description,
        total_screenshots: screenshots.length,
        imported_by: config.userId,
        excluded_users: config.excludedUsers || [],
        import_settings: config.mappingConfig || {},
        status: 'in_progress',
      })
      .select()
      .single();

    if (batchError || !batch) {
      throw new Error(`Failed to create batch: ${batchError?.message}`);
    }

    result.batch_id = batch.batch_id;

    // Step 2: Extract insights from screenshots
    onProgress?.({
      stage: 'extracting',
      current: 0,
      total: screenshots.length,
      message: 'Extracting data from screenshots...',
    });

    const extractions = await batchExtractInsights(screenshots, (current, total) => {
      onProgress?.({
        stage: 'extracting',
        current,
        total,
        message: `Extracting ${current}/${total} screenshots...`,
      });
    });

    // Step 3: Load all trial orgs and users for mapping
    onProgress?.({
      stage: 'mapping',
      current: 0,
      total: extractions.length,
      message: 'Loading organizations and users...',
    });

    const [orgsResult, usersResult] = await Promise.all([
      supabase.from('trial_organizations').select('org_id, org_name, domain, parent_organization'),
      supabase.from('trial_users').select('user_id, org_id, name, email'),
    ]);

    const allOrgs: TrialOrg[] = orgsResult.data || [];
    const allUsers: TrialUser[] = usersResult.data || [];

    // Step 4: Process each extraction through intelligent mapper
    const mappingConfig: MappingConfig = {
      ...DEFAULT_MAPPING_CONFIG,
      ...config.mappingConfig,
      excludedUserNames: config.excludedUsers || [],
    };

    const stagingRecords: Partial<StagingRecord>[] = [];

    for (let i = 0; i < extractions.length; i++) {
      const extraction = extractions[i];
      const screenshot = screenshots[i];

      onProgress?.({
        stage: 'mapping',
        current: i + 1,
        total: extractions.length,
        message: `Mapping entities ${i + 1}/${extractions.length}...`,
      });

      if (!extraction.success || !extraction.data) {
        // Failed extraction
        stagingRecords.push({
          import_batch_id: batch.batch_id,
          raw_insight_title: 'Extraction Failed',
          extraction_confidence: 0,
          screenshot_url: screenshot.url,
          mapping_status: 'failed',
          review_notes: extraction.error || 'Unknown extraction error',
        });
        result.statistics.failed++;
        result.errors.push({ index: i, error: extraction.error || 'Extraction failed' });
        continue;
      }

      const data = extraction.data;

      // Check if user is excluded
      if (
        data.raw_user_name &&
        config.excludedUsers?.some((excluded) =>
          data.raw_user_name!.toLowerCase().includes(excluded.toLowerCase())
        )
      ) {
        result.statistics.failed++;
        result.errors.push({ index: i, error: `User ${data.raw_user_name} is excluded` });
        continue;
      }

      try {
        // Map organization
        const orgMapping = await mapOrganization(data.raw_org_name, allOrgs, mappingConfig);

        // Map user (using org context)
        const userMapping = await mapUser(
          data.raw_user_name || null,
          data.raw_user_email || null,
          orgMapping.entity_id,
          allUsers,
          mappingConfig
        );

        // Determine status
        const status = determineRecordStatus(orgMapping, userMapping, mappingConfig);

        // Parse additional fields
        const parsedTimestamp = parseFlexibleDate(data.raw_timestamp);
        const parsedCost = data.raw_cost
          ? parseFloat(data.raw_cost.replace(/[^0-9.]/g, ''))
          : null;

        // Create staging record
        stagingRecords.push({
          import_batch_id: batch.batch_id,
          ...data,
          extraction_confidence: extraction.confidence,
          ai_extraction_data: extraction.raw_response,
          screenshot_url: screenshot.url,

          mapped_org_id: orgMapping.entity_id,
          mapped_org_confidence: orgMapping.confidence,
          mapped_org_alternatives: orgMapping.alternatives,

          mapped_user_id: userMapping.entity_id,
          mapped_user_confidence: userMapping.confidence,
          mapped_user_alternatives: userMapping.alternatives,

          parsed_timestamp: parsedTimestamp,
          parsed_cost: parsedCost,
          parsed_category: data.raw_category,

          mapping_status: status,
        });

        result.statistics.extracted++;
        if (status === 'approved') result.statistics.auto_approved++;
        else if (status === 'needs_review') result.statistics.needs_review++;
      } catch (mapError: any) {
        result.statistics.failed++;
        result.errors.push({ index: i, error: `Mapping failed: ${mapError.message}` });

        // Still save to staging for manual review
        stagingRecords.push({
          import_batch_id: batch.batch_id,
          ...data,
          extraction_confidence: extraction.confidence,
          screenshot_url: screenshot.url,
          mapping_status: 'failed',
          review_notes: `Mapping error: ${mapError.message}`,
        });
      }
    }

    // Step 5: Save all staging records
    onProgress?.({
      stage: 'saving',
      current: 0,
      total: stagingRecords.length,
      message: 'Saving mapped data...',
    });

    if (stagingRecords.length > 0) {
      const { error: stagingError } = await supabase
        .from('myra_activity_staging')
        .insert(stagingRecords);

      if (stagingError) {
        throw new Error(`Failed to save staging records: ${stagingError.message}`);
      }
    }

    // Step 6: Update batch statistics
    await supabase
      .from('myra_import_batches')
      .update({
        total_extracted: result.statistics.extracted,
        auto_approved: result.statistics.auto_approved,
        needs_review: result.statistics.needs_review,
        failed: result.statistics.failed,
        status: 'extracted',
        completed_at: new Date().toISOString(),
      })
      .eq('batch_id', batch.batch_id);

    onProgress?.({
      stage: 'complete',
      current: screenshots.length,
      total: screenshots.length,
      message: 'Import complete!',
    });

    result.success = true;
    return result;
  } catch (error: any) {
    onProgress?.({
      stage: 'error',
      current: 0,
      total: screenshots.length,
      message: `Error: ${error.message}`,
    });

    // Update batch status to failed
    if (result.batch_id && supabase) {
      await supabase
        .from('myra_import_batches')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
        })
        .eq('batch_id', result.batch_id);
    }

    result.errors.push({ index: -1, error: error.message });
    return result;
  }
}

/**
 * Get summary statistics for a batch
 */
export async function getBatchSummary(
  batchId: string,
  supabase: ReturnType<typeof createClient>
): Promise<{
  batch: ImportBatch | null;
  by_status: Record<string, number>;
  avg_confidence: { org: number; user: number };
}> {
  const [batchResult, summaryResult] = await Promise.all([
    supabase.from('myra_import_batches').select('*').eq('batch_id', batchId).single(),
    supabase.rpc('get_batch_review_summary', { p_batch_id: batchId }),
  ]);

  const stagingRecords = await supabase
    .from('myra_activity_staging')
    .select('mapped_org_confidence, mapped_user_confidence')
    .eq('import_batch_id', batchId);

  const avgOrgConfidence =
    stagingRecords.data?.reduce((sum, r) => sum + (r.mapped_org_confidence || 0), 0) /
      (stagingRecords.data?.length || 1) || 0;

  const avgUserConfidence =
    stagingRecords.data?.reduce((sum, r) => sum + (r.mapped_user_confidence || 0), 0) /
      (stagingRecords.data?.length || 1) || 0;

  return {
    batch: batchResult.data,
    by_status: summaryResult.data?.reduce((acc: any, row: any) => {
      acc[row.status_group] = row.record_count;
      return acc;
    }, {}) || {},
    avg_confidence: {
      org: Math.round(avgOrgConfidence),
      user: Math.round(avgUserConfidence),
    },
  };
}
