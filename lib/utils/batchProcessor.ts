/**
 * Generic Batch Processor for Bulk Imports
 *
 * Consolidates batch processing logic used across:
 * - Timeline Events Import (50/batch)
 * - Feature Requests Import (100/batch)
 * - Trial Users Import (sequential)
 * - Excel Organizations Import (sequential)
 *
 * Benefits:
 * - DRY - Write batch logic once
 * - Consistent error handling
 * - Progress tracking
 * - Retry support
 * - Performance optimization
 */

export interface BatchConfig<T> {
  /** Items to process */
  items: T[];

  /** Number of items per batch (default: 50) */
  batchSize?: number;

  /** Delay between batches in ms (default: 0) */
  delayBetweenBatches?: number;

  /** Maximum retries per batch on failure (default: 0) */
  maxRetries?: number;

  /** Whether to stop on first batch failure (default: false) */
  stopOnError?: boolean;
}

export interface BatchProcessor<T, R> {
  /** Function to process a single batch */
  processBatch: (batch: T[], batchIndex: number) => Promise<R[]>;

  /** Optional progress callback */
  onProgress?: (progress: BatchProgress) => void;

  /** Optional batch success callback */
  onBatchSuccess?: (result: BatchResult<T, R>, batchIndex: number) => void;

  /** Optional batch error callback */
  onBatchError?: (error: Error, batch: T[], batchIndex: number) => void;
}

export interface BatchProgress {
  /** Current batch number (1-indexed) */
  currentBatch: number;

  /** Total number of batches */
  totalBatches: number;

  /** Items processed so far */
  processedCount: number;

  /** Total items */
  totalCount: number;

  /** Percentage complete (0-100) */
  percentComplete: number;

  /** Current status message */
  status: string;
}

export interface BatchResult<T, R> {
  /** Original items in this batch */
  items: T[];

  /** Successfully processed results */
  results: R[];

  /** Items that failed */
  failed: T[];

  /** Errors encountered */
  errors: Error[];

  /** Batch index (0-indexed) */
  batchIndex: number;

  /** Number of retries attempted */
  retriesAttempted: number;
}

export interface ProcessingResult<T, R> {
  /** All successful results */
  success: R[];

  /** All failed items */
  failed: Array<{ item: T; error: Error; batchIndex: number }>;

  /** Summary statistics */
  summary: {
    total: number;
    successful: number;
    failed: number;
    batches: number;
    retriedBatches: number;
  };

  /** Individual batch results */
  batchResults: BatchResult<T, R>[];
}

/**
 * Processes items in batches with error handling and progress tracking
 *
 * @example
 * ```typescript
 * const result = await processBatches(
 *   {
 *     items: featureRequests,
 *     batchSize: 100,
 *     delayBetweenBatches: 500
 *   },
 *   {
 *     processBatch: async (batch) => {
 *       const { data, error } = await supabase
 *         .from('feature_requests')
 *         .insert(batch);
 *       if (error) throw error;
 *       return data;
 *     },
 *     onProgress: (progress) => {
 *       console.log(`${progress.percentComplete}% complete`);
 *     }
 *   }
 * );
 * ```
 */
export async function processBatches<T, R>(
  config: BatchConfig<T>,
  processor: BatchProcessor<T, R>
): Promise<ProcessingResult<T, R>> {
  const {
    items,
    batchSize = 50,
    delayBetweenBatches = 0,
    maxRetries = 0,
    stopOnError = false
  } = config;

  // Calculate batches
  const totalBatches = Math.ceil(items.length / batchSize);
  const batches: T[][] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }

  // Results tracking
  const allSuccessful: R[] = [];
  const allFailed: Array<{ item: T; error: Error; batchIndex: number }> = [];
  const batchResults: BatchResult<T, R>[] = [];
  let retriedBatchesCount = 0;

  // Process each batch
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];

    // Report progress
    const progress: BatchProgress = {
      currentBatch: batchIndex + 1,
      totalBatches,
      processedCount: batchIndex * batchSize + Math.min(batch.length, batchSize),
      totalCount: items.length,
      percentComplete: Math.round(((batchIndex + 1) / totalBatches) * 100),
      status: `Processing batch ${batchIndex + 1}/${totalBatches}...`
    };

    processor.onProgress?.(progress);

    // Process batch with retry logic
    let retriesLeft = maxRetries;
    let success = false;
    let batchResult: BatchResult<T, R> | null = null;

    while (!success && retriesLeft >= 0) {
      try {
        const results = await processor.processBatch(batch, batchIndex);

        batchResult = {
          items: batch,
          results,
          failed: [],
          errors: [],
          batchIndex,
          retriesAttempted: maxRetries - retriesLeft
        };

        allSuccessful.push(...results);
        success = true;

        // Call success callback
        processor.onBatchSuccess?.(batchResult, batchIndex);

      } catch (error) {
        retriesLeft--;

        if (retriesLeft < 0) {
          // All retries exhausted
          const err = error instanceof Error ? error : new Error(String(error));

          batchResult = {
            items: batch,
            results: [],
            failed: batch,
            errors: [err],
            batchIndex,
            retriesAttempted: maxRetries - retriesLeft - 1
          };

          // Track each failed item
          batch.forEach(item => {
            allFailed.push({ item, error: err, batchIndex });
          });

          // Call error callback
          processor.onBatchError?.(err, batch, batchIndex);

          // Stop processing if configured
          if (stopOnError) {
            // Mark remaining items as failed
            for (let i = batchIndex + 1; i < batches.length; i++) {
              batches[i].forEach(item => {
                allFailed.push({
                  item,
                  error: new Error('Stopped due to previous batch failure'),
                  batchIndex: i
                });
              });
            }
            break;
          }
        } else {
          // Retry after a short delay
          if (retriesLeft > 0) {
            retriedBatchesCount++;
            await delay(1000 * (maxRetries - retriesLeft)); // Exponential backoff
          }
        }
      }
    }

    if (batchResult) {
      batchResults.push(batchResult);
    }

    // Stop if configured and batch failed
    if (stopOnError && !success) {
      break;
    }

    // Delay before next batch
    if (delayBetweenBatches > 0 && batchIndex < batches.length - 1) {
      await delay(delayBetweenBatches);
    }
  }

  // Final progress update
  processor.onProgress?.({
    currentBatch: totalBatches,
    totalBatches,
    processedCount: items.length,
    totalCount: items.length,
    percentComplete: 100,
    status: 'Processing complete'
  });

  return {
    success: allSuccessful,
    failed: allFailed,
    summary: {
      total: items.length,
      successful: allSuccessful.length,
      failed: allFailed.length,
      batches: batches.length,
      retriedBatches: retriedBatchesCount
    },
    batchResults
  };
}

/**
 * Simpler batch processor for when you just need to split into batches
 * without complex error handling
 */
export async function processInBatches<T>(
  items: T[],
  batchSize: number,
  processor: (batch: T[], index: number) => Promise<void>,
  delayMs: number = 0
): Promise<void> {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await processor(batch, Math.floor(i / batchSize));

    if (delayMs > 0 && i + batchSize < items.length) {
      await delay(delayMs);
    }
  }
}

/**
 * Parallel batch processor - processes multiple batches simultaneously
 * Use with caution: can overwhelm database/API
 */
export async function processBatchesParallel<T, R>(
  items: T[],
  batchSize: number,
  concurrency: number,
  processor: (batch: T[], index: number) => Promise<R[]>
): Promise<R[]> {
  const batches: T[][] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }

  const results: R[] = [];

  // Process batches with limited concurrency
  for (let i = 0; i < batches.length; i += concurrency) {
    const batchGroup = batches.slice(i, i + concurrency);
    const batchPromises = batchGroup.map((batch, localIndex) =>
      processor(batch, i + localIndex)
    );

    const batchGroupResults = await Promise.all(batchPromises);
    results.push(...batchGroupResults.flat());
  }

  return results;
}

/**
 * Chunks an array into smaller arrays of specified size
 * Utility for manual batch creation
 */
export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];

  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }

  return chunks;
}

/**
 * Delays execution for specified milliseconds
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculates optimal batch size based on item size
 * Useful for dynamic batch sizing
 */
export function calculateOptimalBatchSize(
  itemSizeBytes: number,
  maxPayloadBytes: number = 1000000 // 1MB default
): number {
  const batchSize = Math.floor(maxPayloadBytes / itemSizeBytes);
  // Clamp between reasonable limits
  return Math.max(10, Math.min(batchSize, 1000));
}

/**
 * Estimates total processing time based on batch configuration
 */
export function estimateProcessingTime(
  totalItems: number,
  batchSize: number,
  avgBatchTimeMs: number,
  delayBetweenBatches: number = 0
): {
  totalBatches: number;
  estimatedTimeMs: number;
  estimatedTimeFormatted: string;
} {
  const totalBatches = Math.ceil(totalItems / batchSize);
  const processingTime = totalBatches * avgBatchTimeMs;
  const delayTime = (totalBatches - 1) * delayBetweenBatches;
  const totalTimeMs = processingTime + delayTime;

  return {
    totalBatches,
    estimatedTimeMs: totalTimeMs,
    estimatedTimeFormatted: formatDuration(totalTimeMs)
  };
}

/**
 * Formats milliseconds into human-readable duration
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

// =====================================================
// TYPE GUARDS
// =====================================================

/**
 * Checks if processing result has failures
 */
export function hasFailures<T, R>(result: ProcessingResult<T, R>): boolean {
  return result.failed.length > 0;
}

/**
 * Checks if processing was fully successful
 */
export function isFullySuccessful<T, R>(result: ProcessingResult<T, R>): boolean {
  return result.failed.length === 0 && result.success.length === result.summary.total;
}

/**
 * Gets failure rate as percentage
 */
export function getFailureRate<T, R>(result: ProcessingResult<T, R>): number {
  if (result.summary.total === 0) return 0;
  return Math.round((result.failed.length / result.summary.total) * 100);
}
