/**
 * Reliable Import Types
 *
 * Type definitions for the staged import pipeline
 */

// ============================================================================
// Entity Types
// ============================================================================

export type EntityType = 'organization' | 'status_update' | 'activity' | 'user' | 'myra_usage' | 'prospect';

// ============================================================================
// Status Types
// ============================================================================

export type StagingStatus =
  | 'pending'
  | 'parsed'
  | 'parse_failed'
  | 'validated'
  | 'validation_failed'
  | 'needs_org'        // Prospect validated but org not found - needs manual org assignment
  | 'importing'
  | 'imported'
  | 'import_failed'
  | 'skipped';

export type BatchStatus =
  | 'preparing'
  | 'ready'
  | 'validating'
  | 'validated'
  | 'importing'
  | 'completed'
  | 'cancelled';

export type SourceType = 'csv' | 'json' | 'text' | 'ai';

// ============================================================================
// Database Records
// ============================================================================

export interface StagingRecord {
  staging_id: string;
  batch_id: string;
  batch_name?: string;
  row_number: number;
  raw_data: Record<string, unknown>;
  parsed_data: Record<string, unknown> | null;
  entity_type: EntityType;
  status: StagingStatus;
  imported_id: string | null;
  imported_id_secondary: string | null;
  error_message: string | null;
  error_details: Record<string, unknown> | null;
  attempt_count: number;
  last_attempt_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BatchRecord {
  batch_id: string;
  batch_name: string;
  entity_type: EntityType;
  source_type: SourceType | null;
  source_filename: string | null;
  config: BatchConfig;
  status: BatchStatus;
  total_rows: number;
  parsed_count: number;
  validated_count: number;
  imported_count: number;
  failed_count: number;
  skipped_count: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Configuration
// ============================================================================

export interface BatchConfig {
  batchSize?: number;      // Records per batch (default 50)
  concurrency?: number;    // Parallel imports (default 1)
  delayMs?: number;        // Delay between batches (default 100)
  maxRetries?: number;     // Max retry attempts (default 3)
  stopOnError?: boolean;   // Stop on first error (default false)
}

export const DEFAULT_BATCH_CONFIG: Required<BatchConfig> = {
  batchSize: 50,
  concurrency: 1,
  delayMs: 100,
  maxRetries: 3,
  stopOnError: false,
};

// ============================================================================
// Handler Interface
// ============================================================================

export interface ParseResult<T> {
  data: T | null;
  error?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface ImportResult {
  id: string | null;
  secondaryId?: string | null;
  error?: string;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingId?: string;
  reason?: string;
}

export interface EntityHandler<TInput = unknown, TOutput = unknown> {
  entityType: EntityType;

  // Parse raw data into structured format
  parse(raw: Record<string, unknown>): Promise<ParseResult<TInput>>;

  // Validate parsed data
  validate(data: TInput): Promise<ValidationResult>;

  // Check for duplicates before import
  checkDuplicate(data: TInput): Promise<DuplicateCheckResult>;

  // Import to database (returns created ID)
  import(data: TInput): Promise<ImportResult>;
}

// ============================================================================
// Progress & Reporting
// ============================================================================

export interface BatchSummary {
  batch_id: string;
  batch_name: string;
  entity_type: EntityType;
  status: BatchStatus;
  total: number;
  pending: number;
  parsed: number;
  validated: number;
  imported: number;
  failed: number;
  skipped: number;
  percent_complete: number;
}

export interface ProgressReport extends BatchSummary {
  started_at: string | null;
  elapsed_seconds: number;
  estimated_remaining_seconds: number | null;
  recent_errors: Array<{
    row_number: number;
    error: string;
  }>;
}

// ============================================================================
// CLI Options
// ============================================================================

export interface PrepareOptions {
  file?: string;
  text?: string;
  type: EntityType;
  parse?: 'csv' | 'ai';
  name?: string;
}

export interface ValidateOptions {
  batch: string;
}

export interface ImportOptions {
  batch: string;
  batchSize?: number;
  concurrency?: number;
  dryRun?: boolean;
}

export interface StatusOptions {
  batch: string;
  watch?: boolean;
}

export interface RetryOptions {
  batch: string;
  maxRetries?: number;
}

export interface ExportOptions {
  batch: string;
  format?: 'csv' | 'json';
}
