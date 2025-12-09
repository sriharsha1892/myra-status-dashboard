/**
 * StagingManager
 *
 * Manages all database operations for the import staging tables.
 * Provides CRUD operations, batch management, and progress tracking.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  StagingRecord,
  BatchRecord,
  StagingStatus,
  BatchStatus,
  EntityType,
  SourceType,
  BatchConfig,
  BatchSummary,
  DEFAULT_BATCH_CONFIG,
} from './types';

// ============================================================================
// Initialization
// ============================================================================

function getSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }

  return createClient(url, key);
}

// ============================================================================
// StagingManager Class
// ============================================================================

export class StagingManager {
  private supabase: SupabaseClient;

  constructor(supabase?: SupabaseClient) {
    this.supabase = supabase || getSupabase();
  }

  // ==========================================================================
  // Batch Management
  // ==========================================================================

  /**
   * Create a new import batch
   */
  async createBatch(options: {
    name: string;
    entityType: EntityType;
    sourceType?: SourceType;
    sourceFilename?: string;
    config?: BatchConfig;
  }): Promise<string> {
    const { data, error } = await this.supabase
      .from('import_batches')
      .insert({
        batch_name: options.name,
        entity_type: options.entityType,
        source_type: options.sourceType || null,
        source_filename: options.sourceFilename || null,
        config: { ...DEFAULT_BATCH_CONFIG, ...options.config },
        status: 'preparing',
      })
      .select('batch_id')
      .single();

    if (error) {
      throw new Error(`Failed to create batch: ${error.message}`);
    }

    return data.batch_id;
  }

  /**
   * Get batch by ID
   */
  async getBatch(batchId: string): Promise<BatchRecord | null> {
    const { data, error } = await this.supabase
      .from('import_batches')
      .select('*')
      .eq('batch_id', batchId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(`Failed to get batch: ${error.message}`);
    }

    return data;
  }

  /**
   * Update batch status
   */
  async updateBatchStatus(batchId: string, status: BatchStatus): Promise<void> {
    const updates: Partial<BatchRecord> = { status };

    if (status === 'importing' || status === 'validating') {
      updates.started_at = new Date().toISOString();
    } else if (status === 'completed' || status === 'cancelled') {
      updates.completed_at = new Date().toISOString();
    }

    const { error } = await this.supabase
      .from('import_batches')
      .update(updates)
      .eq('batch_id', batchId);

    if (error) {
      throw new Error(`Failed to update batch status: ${error.message}`);
    }
  }

  /**
   * Update batch stats (call periodically during processing)
   */
  async updateBatchStats(batchId: string): Promise<void> {
    // Count rows by status
    const { data, error } = await this.supabase
      .from('import_staging')
      .select('status')
      .eq('batch_id', batchId);

    if (error) {
      throw new Error(`Failed to count rows: ${error.message}`);
    }

    const counts = {
      total_rows: data.length,
      parsed_count: 0,
      validated_count: 0,
      imported_count: 0,
      failed_count: 0,
      skipped_count: 0,
    };

    for (const row of data) {
      switch (row.status) {
        case 'parsed':
          counts.parsed_count++;
          break;
        case 'validated':
          counts.validated_count++;
          break;
        case 'imported':
          counts.imported_count++;
          break;
        case 'import_failed':
        case 'validation_failed':
        case 'parse_failed':
          counts.failed_count++;
          break;
        case 'skipped':
          counts.skipped_count++;
          break;
      }
    }

    await this.supabase
      .from('import_batches')
      .update(counts)
      .eq('batch_id', batchId);
  }

  // ==========================================================================
  // Staging Row Management
  // ==========================================================================

  /**
   * Stage multiple rows for processing
   */
  async stageRows(
    batchId: string,
    rows: Array<{ raw_data: Record<string, unknown>; entity_type: EntityType }>
  ): Promise<number> {
    const records = rows.map((row, index) => ({
      batch_id: batchId,
      row_number: index + 1,
      raw_data: row.raw_data,
      entity_type: row.entity_type,
      status: 'pending' as StagingStatus,
    }));

    // Insert in batches of 100 for large datasets
    const BATCH_SIZE = 100;
    let inserted = 0;

    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);
      const { error } = await this.supabase
        .from('import_staging')
        .insert(batch);

      if (error) {
        throw new Error(`Failed to stage rows ${i + 1}-${i + batch.length}: ${error.message}`);
      }

      inserted += batch.length;
    }

    // Update total count
    await this.supabase
      .from('import_batches')
      .update({ total_rows: inserted, status: 'ready' })
      .eq('batch_id', batchId);

    return inserted;
  }

  /**
   * Get rows by status (with pagination for large batches)
   */
  async getRowsByStatus(
    batchId: string,
    status: StagingStatus | StagingStatus[],
    options?: { limit?: number; offset?: number }
  ): Promise<StagingRecord[]> {
    let query = this.supabase
      .from('import_staging')
      .select('*')
      .eq('batch_id', batchId)
      .order('row_number', { ascending: true });

    if (Array.isArray(status)) {
      query = query.in('status', status);
    } else {
      query = query.eq('status', status);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }
    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 100) - 1);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get rows: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get count of rows by status
   */
  async getRowCount(batchId: string, status?: StagingStatus | StagingStatus[]): Promise<number> {
    let query = this.supabase
      .from('import_staging')
      .select('staging_id', { count: 'exact', head: true })
      .eq('batch_id', batchId);

    if (status) {
      if (Array.isArray(status)) {
        query = query.in('status', status);
      } else {
        query = query.eq('status', status);
      }
    }

    const { count, error } = await query;

    if (error) {
      throw new Error(`Failed to count rows: ${error.message}`);
    }

    return count || 0;
  }

  /**
   * Update single row status
   */
  async updateRowStatus(
    stagingId: string,
    status: StagingStatus,
    details?: {
      parsed_data?: Record<string, unknown>;
      imported_id?: string;
      imported_id_secondary?: string;
      error_message?: string;
      error_details?: Record<string, unknown>;
    }
  ): Promise<void> {
    const updates: Partial<StagingRecord> = {
      status,
      last_attempt_at: new Date().toISOString(),
    };

    if (details?.parsed_data !== undefined) updates.parsed_data = details.parsed_data;
    if (details?.imported_id !== undefined) updates.imported_id = details.imported_id;
    if (details?.imported_id_secondary !== undefined) updates.imported_id_secondary = details.imported_id_secondary;
    if (details?.error_message !== undefined) updates.error_message = details.error_message;
    if (details?.error_details !== undefined) updates.error_details = details.error_details;

    // Increment attempt count for import attempts
    if (status === 'importing' || status === 'import_failed') {
      const { data: current } = await this.supabase
        .from('import_staging')
        .select('attempt_count')
        .eq('staging_id', stagingId)
        .single();

      updates.attempt_count = (current?.attempt_count || 0) + (status === 'importing' ? 1 : 0);
    }

    const { error } = await this.supabase
      .from('import_staging')
      .update(updates)
      .eq('staging_id', stagingId);

    if (error) {
      throw new Error(`Failed to update row status: ${error.message}`);
    }
  }

  /**
   * Batch update status (for bulk operations)
   */
  async batchUpdateStatus(
    stagingIds: string[],
    status: StagingStatus,
    errorMessage?: string
  ): Promise<void> {
    const updates: Partial<StagingRecord> = {
      status,
      last_attempt_at: new Date().toISOString(),
    };

    if (errorMessage) {
      updates.error_message = errorMessage;
    }

    const { error } = await this.supabase
      .from('import_staging')
      .update(updates)
      .in('staging_id', stagingIds);

    if (error) {
      throw new Error(`Failed to batch update status: ${error.message}`);
    }
  }

  // ==========================================================================
  // Recovery & Resume
  // ==========================================================================

  /**
   * Get rows that were "importing" when process crashed (for resume)
   */
  async getStuckRows(batchId: string): Promise<StagingRecord[]> {
    return this.getRowsByStatus(batchId, 'importing');
  }

  /**
   * Reset stuck rows to validated (for retry)
   */
  async resetStuckRows(batchId: string): Promise<number> {
    const stuck = await this.getStuckRows(batchId);

    if (stuck.length > 0) {
      await this.batchUpdateStatus(
        stuck.map((r) => r.staging_id),
        'validated'
      );
    }

    return stuck.length;
  }

  /**
   * Get failed rows for retry
   */
  async getFailedRows(
    batchId: string,
    maxAttempts?: number
  ): Promise<StagingRecord[]> {
    let query = this.supabase
      .from('import_staging')
      .select('*')
      .eq('batch_id', batchId)
      .in('status', ['import_failed', 'validation_failed', 'parse_failed'])
      .order('row_number', { ascending: true });

    if (maxAttempts) {
      query = query.lt('attempt_count', maxAttempts);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get failed rows: ${error.message}`);
    }

    return data || [];
  }

  // ==========================================================================
  // Reporting
  // ==========================================================================

  /**
   * Get batch summary with counts
   */
  async getBatchSummary(batchId: string): Promise<BatchSummary | null> {
    const batch = await this.getBatch(batchId);
    if (!batch) return null;

    // Get live counts
    const counts = await this.getCounts(batchId);

    const total = counts.total || 1;
    const completed = counts.imported + counts.failed + counts.skipped;

    return {
      batch_id: batch.batch_id,
      batch_name: batch.batch_name,
      entity_type: batch.entity_type as EntityType,
      status: batch.status as BatchStatus,
      total: counts.total,
      pending: counts.pending,
      parsed: counts.parsed,
      validated: counts.validated,
      imported: counts.imported,
      failed: counts.failed,
      skipped: counts.skipped,
      percent_complete: Math.round((completed / total) * 100),
    };
  }

  /**
   * Get counts by status
   */
  private async getCounts(batchId: string): Promise<Record<string, number>> {
    const { data, error } = await this.supabase
      .from('import_staging')
      .select('status')
      .eq('batch_id', batchId);

    if (error) {
      throw new Error(`Failed to get counts: ${error.message}`);
    }

    const counts: Record<string, number> = {
      total: data.length,
      pending: 0,
      parsed: 0,
      validated: 0,
      importing: 0,
      imported: 0,
      failed: 0,
      skipped: 0,
    };

    for (const row of data) {
      switch (row.status) {
        case 'pending':
          counts.pending++;
          break;
        case 'parsed':
          counts.parsed++;
          break;
        case 'validated':
          counts.validated++;
          break;
        case 'importing':
          counts.importing++;
          break;
        case 'imported':
          counts.imported++;
          break;
        case 'import_failed':
        case 'validation_failed':
        case 'parse_failed':
          counts.failed++;
          break;
        case 'skipped':
          counts.skipped++;
          break;
      }
    }

    return counts;
  }

  /**
   * Get recent errors for display
   */
  async getRecentErrors(batchId: string, limit = 5): Promise<Array<{ row_number: number; error: string }>> {
    const { data, error } = await this.supabase
      .from('import_staging')
      .select('row_number, error_message')
      .eq('batch_id', batchId)
      .in('status', ['import_failed', 'validation_failed', 'parse_failed'])
      .not('error_message', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) {
      return [];
    }

    return (data || []).map((row) => ({
      row_number: row.row_number,
      error: row.error_message || 'Unknown error',
    }));
  }

  // ==========================================================================
  // Row Editing (for Admin UI)
  // ==========================================================================

  /**
   * Get rows with pagination and optional status filter
   * Returns both rows and total count for pagination
   */
  async getRows(
    batchId: string,
    options?: {
      status?: StagingStatus | StagingStatus[] | 'all';
      limit?: number;
      offset?: number;
    }
  ): Promise<{ rows: StagingRecord[]; total: number }> {
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    let query = this.supabase
      .from('import_staging')
      .select('*', { count: 'exact' })
      .eq('batch_id', batchId)
      .order('row_number', { ascending: true })
      .range(offset, offset + limit - 1);

    if (options?.status && options.status !== 'all') {
      if (Array.isArray(options.status)) {
        query = query.in('status', options.status);
      } else {
        query = query.eq('status', options.status);
      }
    }

    const { data, count, error } = await query;

    if (error) {
      throw new Error(`Failed to get rows: ${error.message}`);
    }

    return { rows: data || [], total: count || 0 };
  }

  /**
   * Update row data (raw_data and/or parsed_data)
   * Resets status to 'pending' when edited
   */
  async updateRowData(
    stagingId: string,
    updates: {
      raw_data?: Record<string, unknown>;
      parsed_data?: Record<string, unknown>;
    }
  ): Promise<StagingRecord | null> {
    const updatePayload: Partial<StagingRecord> = {
      status: 'pending', // Reset to pending when edited
      error_message: null, // Clear previous errors
    };

    if (updates.raw_data !== undefined) {
      updatePayload.raw_data = updates.raw_data;
    }
    if (updates.parsed_data !== undefined) {
      updatePayload.parsed_data = updates.parsed_data;
    }

    const { data, error } = await this.supabase
      .from('import_staging')
      .update(updatePayload)
      .eq('staging_id', stagingId)
      .select();

    if (error) {
      throw new Error(`Failed to update row: ${error.message}`);
    }

    // Return null if no row was updated (row doesn't exist)
    if (!data || data.length === 0) {
      return null;
    }

    return data[0];
  }

  /**
   * Delete multiple rows by staging IDs
   */
  async deleteRows(stagingIds: string[]): Promise<number> {
    if (stagingIds.length === 0) return 0;

    const { error, count } = await this.supabase
      .from('import_staging')
      .delete({ count: 'exact' })
      .in('staging_id', stagingIds);

    if (error) {
      throw new Error(`Failed to delete rows: ${error.message}`);
    }

    return count || 0;
  }

  // ==========================================================================
  // Cleanup
  // ==========================================================================

  /**
   * Delete a batch and all its rows
   */
  async deleteBatch(batchId: string): Promise<void> {
    const { error } = await this.supabase
      .from('import_batches')
      .delete()
      .eq('batch_id', batchId);

    if (error) {
      throw new Error(`Failed to delete batch: ${error.message}`);
    }
  }

  /**
   * List all batches (for status command)
   */
  async listBatches(options?: { status?: BatchStatus; limit?: number }): Promise<BatchRecord[]> {
    let query = this.supabase
      .from('import_batches')
      .select('*')
      .order('created_at', { ascending: false });

    if (options?.status) {
      query = query.eq('status', options.status);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to list batches: ${error.message}`);
    }

    return data || [];
  }
}

// Export singleton for convenience
export const stagingManager = new StagingManager();
