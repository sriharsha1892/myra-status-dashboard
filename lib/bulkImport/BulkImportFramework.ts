/**
 * Generic Bulk Import Framework
 *
 * Provides a unified interface for all bulk import operations:
 * - File parsing (CSV, Excel, Text, AI-powered)
 * - Data validation
 * - Transformation
 * - Batch processing
 * - Duplicate detection
 * - Progress tracking
 * - Result reporting
 *
 * Used by all 7 import tools:
 * 1. Timeline Events Import (AI)
 * 2. Timeline Events Import (Legacy)
 * 3. Feature Requests Import
 * 4. Trial Users Import
 * 5. Smart Import
 * 6. Excel Organizations Import
 * 7. Interactive CLI Import
 */

import { createClient } from '@supabase/supabase-js';
import { processBatches, BatchConfig, ProcessingResult } from '@/lib/utils/batchProcessor';
import { validateBatch, ValidationResult } from '@/lib/validation/bulkImport';
import { ImportResult } from '@/components/shared/ImportResultsModal';
import { parseWithAI, AIParsingConfig, AIParsingResult } from '@/lib/ai/bulkParsingService';

// =====================================================
// CORE TYPES
// =====================================================

export interface BulkImportConfig<TInput, TOutput> {
  /** Entity information */
  entityType: string;
  entityPlural: string;

  /** Parser configuration */
  parser: ImportParser<TInput>;

  /** Validator function */
  validator: (item: TInput, index: number) => ValidationResult;

  /** Transformer to convert validated input to database format */
  transformer: (item: TInput) => TOutput;

  /** Database configuration */
  database: {
    tableName: string;
    batchSize?: number;
    delayBetweenBatches?: number;
  };

  /** Duplicate detection (optional) */
  duplicateDetector?: DuplicateDetector<TOutput>;

  /** Preview configuration for UI */
  preview?: {
    maxRows?: number;
    columns: ColumnConfig[];
  };

  /** Custom success message builder */
  successMessageBuilder?: (item: TOutput) => {
    title: string;
    details?: string;
  };

  /**
   * Custom importer function for multi-entity or complex imports
   * If provided, this will be used instead of the default single-table insertion
   */
  customImporter?: (
    items: TOutput[],
    onProgress?: (progress: ImportProgress) => void
  ) => Promise<{
    successful: number;
    failed: number;
    skipped: number;
    errors: Array<{ item: TOutput; error: string }>;
    results?: TOutput[];
  }>;
}

export interface ImportParser<T> {
  /** Parse input file/text into structured data */
  parse(input: File | string): Promise<ParseResult<T>>;

  /** Parser type identifier */
  type: 'csv' | 'excel' | 'text' | 'ai';
}

export interface ParseResult<T> {
  /** Successfully parsed items */
  items: T[];

  /** Parse errors */
  errors: Array<{
    row?: number;
    message: string;
  }>;

  /** Metadata from parsing */
  metadata?: {
    rowCount?: number;
    columnCount?: number;
    parsingDuration?: number;
  };
}

export interface ColumnConfig {
  key: string;
  label: string;
  width?: string;
  formatter?: (value: any) => string;
}

export interface DuplicateDetector<T> {
  /** Check if item is duplicate */
  isDuplicate(item: T, existing: T[]): boolean;

  /** Get unique identifier for deduplication */
  getKey(item: T): string;

  /** How to handle duplicates */
  strategy: 'skip' | 'update' | 'error';
}

// =====================================================
// PROGRESS TRACKING
// =====================================================

export interface ImportProgress {
  stage: 'parsing' | 'validating' | 'transforming' | 'importing' | 'complete';
  currentItem?: number;
  totalItems?: number;
  percentComplete: number;
  message: string;
}

export type ProgressCallback = (progress: ImportProgress) => void;

// =====================================================
// BULK IMPORTER CLASS
// =====================================================

export class BulkImporter<TInput, TOutput> {
  readonly config: BulkImportConfig<TInput, TOutput>;
  private _supabase?: ReturnType<typeof createClient>;

  /**
   * Lazy-initialized Supabase client
   * Only created when first accessed, allowing tests to work without environment variables
   */
  private get supabase() {
    if (!this._supabase) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!url || !key) {
        throw new Error(
          'Supabase credentials required for database operations. ' +
          'Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) are set.'
        );
      }

      this._supabase = createClient(url, key);
    }
    return this._supabase;
  }

  constructor(config: BulkImportConfig<TInput, TOutput>) {
    this.config = config;
  }

  // =====================================================
  // MAIN IMPORT FLOW
  // =====================================================

  /**
   * Complete import pipeline: parse → validate → transform → import
   */
  async import(
    input: File | string,
    onProgress?: ProgressCallback
  ): Promise<ImportResult> {
    const startTime = Date.now();

    try {
      // Stage 1: Parse
      onProgress?.({
        stage: 'parsing',
        percentComplete: 0,
        message: 'Parsing input data...',
      });

      const parseResult = await this.parse(input);

      if (parseResult.errors.length > 0 && parseResult.items.length === 0) {
        // Complete parse failure
        return this.buildErrorResult(parseResult.errors, startTime);
      }

      // Stage 2: Validate
      onProgress?.({
        stage: 'validating',
        percentComplete: 25,
        message: `Validating ${parseResult.items.length} ${this.config.entityPlural}...`,
      });

      const validationResult = await this.validate(parseResult.items);

      // Stage 3: Transform
      onProgress?.({
        stage: 'transforming',
        percentComplete: 40,
        message: `Transforming ${validationResult.validRecords.length} valid items...`,
      });

      const transformed = validationResult.validRecords.map(this.config.transformer);

      // Stage 4: Handle duplicates (if configured)
      let deduplicated = transformed;
      const duplicates: TOutput[] = [];

      if (this.config.duplicateDetector) {
        onProgress?.({
          stage: 'transforming',
          percentComplete: 50,
          message: 'Checking for duplicates...',
        });

        const dedupeResult = await this.handleDuplicates(transformed);
        deduplicated = dedupeResult.unique;
        duplicates.push(...dedupeResult.duplicates);
      }

      // Stage 5: Import to database
      onProgress?.({
        stage: 'importing',
        percentComplete: 60,
        message: `Importing ${deduplicated.length} ${this.config.entityPlural}...`,
      });

      let importResult: ProcessingResult<TOutput, TOutput>;

      if (this.config.customImporter) {
        // Use custom importer for multi-entity imports
        const customResult = await this.config.customImporter(deduplicated, (progress) => {
          onProgress?.(progress);
        });

        // Convert custom result to ProcessingResult format
        importResult = {
          summary: {
            successful: customResult.successful,
            failed: customResult.failed,
            batches: 1,
            retriedBatches: 0,
          },
          success: customResult.results || deduplicated.slice(0, customResult.successful),
          failed: customResult.errors.map((e, idx) => ({
            item: e.item,
            error: new Error(e.error),
            batchIndex: idx,
          })),
          batchResults: [{
            batchIndex: 0,
            results: customResult.results || [],
            failed: customResult.errors.map((e, idx) => ({
              item: e.item,
              error: new Error(e.error),
              batchIndex: idx,
            })),
            errors: customResult.errors.map(e => new Error(e.error)),
            duration: 0,
            retries: 0,
          }],
        };
      } else {
        // Use standard single-table insertion
        importResult = await this.importToDatabase(deduplicated, (batchProgress) => {
          const progressPercent = 60 + (batchProgress.percentComplete / 100) * 35;
          onProgress?.({
            stage: 'importing',
            currentItem: batchProgress.processedCount,
            totalItems: batchProgress.totalCount,
            percentComplete: progressPercent,
            message: batchProgress.status,
          });
        });
      }

      // Stage 6: Build result
      onProgress?.({
        stage: 'complete',
        percentComplete: 100,
        message: 'Import complete!',
      });

      return this.buildImportResult(
        importResult,
        validationResult,
        parseResult,
        duplicates,
        Date.now() - startTime
      );
    } catch (error) {
      console.error('Import failed:', error);
      return this.buildErrorResult(
        [{ message: error instanceof Error ? error.message : 'Unknown error' }],
        startTime
      );
    }
  }

  // =====================================================
  // INDIVIDUAL STAGES
  // =====================================================

  /**
   * Stage 1: Parse input data
   */
  async parse(input: File | string): Promise<ParseResult<TInput>> {
    return this.config.parser.parse(input);
  }

  /**
   * Stage 2: Validate parsed items
   */
  async validate(items: TInput[]): Promise<{
    validRecords: TInput[];
    invalidRecords: Array<{ record: TInput; index: number; errors: string[] }>;
    summary: { total: number; valid: number; invalid: number };
  }> {
    return validateBatch(items, this.config.validator);
  }

  /**
   * Stage 3: Transform validated items
   */
  transform(items: TInput[]): TOutput[] {
    return items.map(this.config.transformer);
  }

  /**
   * Stage 4: Handle duplicates
   */
  async handleDuplicates(items: TOutput[]): Promise<{
    unique: TOutput[];
    duplicates: TOutput[];
  }> {
    if (!this.config.duplicateDetector) {
      return { unique: items, duplicates: [] };
    }

    const detector = this.config.duplicateDetector;

    // Fetch existing records from database
    const { data: existing } = await this.supabase
      .from(this.config.database.tableName)
      .select('*');

    const existingRecords = (existing || []) as TOutput[];
    const unique: TOutput[] = [];
    const duplicates: TOutput[] = [];

    for (const item of items) {
      if (detector.isDuplicate(item, existingRecords)) {
        if (detector.strategy === 'skip') {
          duplicates.push(item);
        } else if (detector.strategy === 'error') {
          duplicates.push(item);
        } else {
          // 'update' strategy - include in unique (will update existing)
          unique.push(item);
        }
      } else {
        unique.push(item);
      }
    }

    return { unique, duplicates };
  }

  /**
   * Stage 5: Import to database with batch processing
   */
  async importToDatabase(
    items: TOutput[],
    onProgress?: (progress: any) => void
  ): Promise<ProcessingResult<TOutput, TOutput>> {
    const config: BatchConfig<TOutput> = {
      items,
      batchSize: this.config.database.batchSize || 50,
      delayBetweenBatches: this.config.database.delayBetweenBatches || 0,
      maxRetries: 2,
      stopOnError: false,
    };

    return processBatches<TOutput, TOutput>(config, {
      processBatch: async (batch) => {
        const { data, error } = await this.supabase
          .from(this.config.database.tableName)
          .insert(batch)
          .select();

        if (error) throw error;
        return (data || []) as TOutput[];
      },
      onProgress,
    });
  }

  // =====================================================
  // RESULT BUILDERS
  // =====================================================

  /**
   * Builds standardized ImportResult from processing results
   */
  private buildImportResult(
    importResult: ProcessingResult<TOutput, TOutput>,
    validationResult: ReturnType<typeof validateBatch<TInput>>,
    parseResult: ParseResult<TInput>,
    duplicates: TOutput[],
    duration: number
  ): ImportResult {
    const successMessageBuilder = this.config.successMessageBuilder || ((item: any) => ({
      title: JSON.stringify(item).slice(0, 100),
    }));

    return {
      entityType: this.config.entityType,
      entityPlural: this.config.entityPlural,

      summary: {
        total: parseResult.items.length,
        successful: importResult.summary.successful,
        failed: validationResult.invalidRecords.length + importResult.summary.failed + duplicates.length,
        warnings: parseResult.errors.length,
      },

      success: importResult.success.map(successMessageBuilder),

      failed: [
        // Validation failures
        ...validationResult.invalidRecords.map((invalid) => ({
          item: JSON.stringify(invalid.record).slice(0, 100),
          error: invalid.errors.join('; '),
          rowNumber: invalid.index + 1,
        })),
        // Import failures
        ...importResult.failed.map((failed) => ({
          item: JSON.stringify(failed.item).slice(0, 100),
          error: failed.error.message,
          rowNumber: failed.batchIndex,
        })),
        // Duplicates (if strategy is skip or error)
        ...duplicates.map((dup, index) => ({
          item: JSON.stringify(dup).slice(0, 100),
          error: 'Duplicate record',
          rowNumber: index,
        })),
      ],

      warnings: parseResult.errors.map((err) => ({
        item: `Row ${err.row || 'unknown'}`,
        message: err.message,
        rowNumber: err.row,
      })),

      batches: importResult.batchResults.map((batch) => ({
        batchNumber: batch.batchIndex + 1,
        successful: batch.results.length,
        failed: batch.failed.length,
        errors: batch.errors.map((e) => e.message),
      })),

      metadata: {
        duration,
        batchSize: this.config.database.batchSize || 50,
        totalBatches: importResult.summary.batches,
        retriedBatches: importResult.summary.retriedBatches,
        // Extract entity IDs from successful imports for enrichment
        importedEntityIds: this.extractEntityIds(importResult.success),
      },
    };
  }

  /**
   * Extracts entity IDs from successful import records
   * Looks for common ID field names: id, org_id, user_id, event_id, etc.
   */
  private extractEntityIds(records: TOutput[]): string[] {
    const ids: string[] = [];
    const idFields = ['id', 'org_id', 'user_id', 'event_id', 'entity_id', 'record_id'];

    for (const record of records) {
      if (!record || typeof record !== 'object') continue;

      for (const field of idFields) {
        const value = (record as any)[field];
        if (value && typeof value === 'string' && !ids.includes(value)) {
          ids.push(value);
          break; // Found ID for this record
        }
      }
    }

    return ids;
  }

  /**
   * Builds error result when import fails completely
   */
  private buildErrorResult(
    errors: Array<{ row?: number; message: string }>,
    startTime: number
  ): ImportResult {
    return {
      entityType: this.config.entityType,
      entityPlural: this.config.entityPlural,

      summary: {
        total: 0,
        successful: 0,
        failed: errors.length,
        warnings: 0,
      },

      success: [],

      failed: errors.map((err) => ({
        item: `Row ${err.row || 'N/A'}`,
        error: err.message,
        rowNumber: err.row,
      })),

      warnings: [],

      metadata: {
        duration: Date.now() - startTime,
      },
    };
  }

  // =====================================================
  // PREVIEW FUNCTIONALITY
  // =====================================================

  /**
   * Parse and preview data without importing
   */
  async preview(input: File | string): Promise<{
    items: TInput[];
    columns: ColumnConfig[];
    errors: Array<{ row?: number; message: string }>;
  }> {
    const parseResult = await this.parse(input);

    const maxRows = this.config.preview?.maxRows || 10;
    const previewItems = parseResult.items.slice(0, maxRows);

    return {
      items: previewItems,
      columns: this.config.preview?.columns || [],
      errors: parseResult.errors,
    };
  }
}

// =====================================================
// FACTORY HELPERS
// =====================================================

/**
 * Creates a simple importer for CSV-based imports
 */
export function createCSVImporter<TInput, TOutput>(
  config: Omit<BulkImportConfig<TInput, TOutput>, 'parser'> & {
    csvParser: ImportParser<TInput>;
  }
): BulkImporter<TInput, TOutput> {
  return new BulkImporter({
    ...config,
    parser: config.csvParser,
  });
}

/**
 * Creates an AI-powered importer
 */
export function createAIImporter<TInput, TOutput>(
  config: Omit<BulkImportConfig<TInput, TOutput>, 'parser'> & {
    aiConfig: Omit<AIParsingConfig, 'userPrompt'>;
    buildPrompt: (text: string) => string;
  }
): BulkImporter<TInput, TOutput> {
  const aiParser: ImportParser<TInput> = {
    type: 'ai',
    parse: async (input: File | string) => {
      const text = typeof input === 'string' ? input : await input.text();

      const result: AIParsingResult<{ items: TInput[] }> = await parseWithAI({
        ...config.aiConfig,
        userPrompt: config.buildPrompt(text),
      });

      if (!result.success || !result.data) {
        return {
          items: [],
          errors: [{ message: result.error || 'AI parsing failed' }],
        };
      }

      return {
        items: result.data.items,
        errors: [],
        metadata: {
          parsingDuration: result.duration,
        },
      };
    },
  };

  return new BulkImporter({
    ...config,
    parser: aiParser,
  });
}

/**
 * Helper to create duplicate detector based on unique field
 */
export function createFieldBasedDuplicateDetector<T>(
  field: keyof T,
  strategy: 'skip' | 'update' | 'error' = 'skip'
): DuplicateDetector<T> {
  return {
    isDuplicate: (item: T, existing: T[]) => {
      const itemValue = item[field];
      return existing.some((ex) => ex[field] === itemValue);
    },
    getKey: (item: T) => String(item[field]),
    strategy,
  };
}

/**
 * Helper to create duplicate detector based on multiple fields
 */
export function createCompositeKeyDuplicateDetector<T>(
  fields: Array<keyof T>,
  strategy: 'skip' | 'update' | 'error' = 'skip'
): DuplicateDetector<T> {
  return {
    isDuplicate: (item: T, existing: T[]) => {
      return existing.some((ex) => {
        return fields.every((field) => ex[field] === item[field]);
      });
    },
    getKey: (item: T) => fields.map((f) => String(item[f])).join('|'),
    strategy,
  };
}
