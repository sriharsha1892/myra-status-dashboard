/**
 * Performance Monitoring Utilities
 * Provides timing, logging, and performance threshold detection
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface PerformanceMetrics {
  operationName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  requestId: string;
  metadata?: Record<string, any>;
}

export interface TimingResult {
  duration: number;
  exceedsThreshold: boolean;
  requestId: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const PERFORMANCE_THRESHOLDS = {
  SLOW_OPERATION: 3000, // 3 seconds
  VERY_SLOW_OPERATION: 10000, // 10 seconds
  LARGE_DATASET: 50,
  VERY_LARGE_DATASET: 200,
} as const;

// ============================================================================
// REQUEST ID GENERATION
// ============================================================================

/**
 * Generate a unique request ID for tracking
 * Format: timestamp-random
 */
export function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return `${timestamp}-${random}`;
}

// ============================================================================
// PERFORMANCE TIMER
// ============================================================================

export class PerformanceTimer {
  private metrics: PerformanceMetrics;

  constructor(operationName: string, metadata?: Record<string, any>) {
    this.metrics = {
      operationName,
      startTime: performance.now(),
      requestId: generateRequestId(),
      metadata,
    };
  }

  /**
   * Stop the timer and return timing results
   */
  stop(): TimingResult {
    this.metrics.endTime = performance.now();
    this.metrics.duration = this.metrics.endTime - this.metrics.startTime;

    const exceedsThreshold = this.metrics.duration > PERFORMANCE_THRESHOLDS.SLOW_OPERATION;

    // Log if operation is slow
    if (exceedsThreshold) {
      this.logSlowOperation();
    }

    return {
      duration: this.metrics.duration,
      exceedsThreshold,
      requestId: this.metrics.requestId,
    };
  }

  /**
   * Get the current elapsed time without stopping the timer
   */
  elapsed(): number {
    return performance.now() - this.metrics.startTime;
  }

  /**
   * Log slow operation warning
   */
  private logSlowOperation(): void {
    const severity = this.metrics.duration! > PERFORMANCE_THRESHOLDS.VERY_SLOW_OPERATION
      ? 'VERY SLOW'
      : 'SLOW';

    console.warn(`[Performance Warning] ${severity} OPERATION`, {
      operation: this.metrics.operationName,
      duration: `${(this.metrics.duration! / 1000).toFixed(2)}s`,
      requestId: this.metrics.requestId,
      threshold: `${PERFORMANCE_THRESHOLDS.SLOW_OPERATION / 1000}s`,
      metadata: this.metrics.metadata,
    });
  }

  /**
   * Get the request ID for this timer
   */
  getRequestId(): string {
    return this.metrics.requestId;
  }

  /**
   * Get all metrics
   */
  getMetrics(): PerformanceMetrics {
    return {
      ...this.metrics,
      duration: this.metrics.endTime
        ? this.metrics.endTime - this.metrics.startTime
        : this.elapsed(),
    };
  }
}

// ============================================================================
// TIMING UTILITIES
// ============================================================================

/**
 * Measure the execution time of an async function
 *
 * @example
 * const result = await measureAsync('User Creation', async () => {
 *   return await createUser(data);
 * });
 */
export async function measureAsync<T>(
  operationName: string,
  fn: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  const timer = new PerformanceTimer(operationName, metadata);

  try {
    const result = await fn();
    const timing = timer.stop();

    return result;
  } catch (error) {
    const timing = timer.stop();

    // Log error with timing info
    console.error(`[Performance] Operation failed after ${timing.duration.toFixed(2)}ms`, {
      operation: operationName,
      requestId: timing.requestId,
      error,
    });

    throw error;
  }
}

/**
 * Measure the execution time of a synchronous function
 */
export function measureSync<T>(
  operationName: string,
  fn: () => T,
  metadata?: Record<string, any>
): T {
  const timer = new PerformanceTimer(operationName, metadata);

  try {
    const result = fn();
    timer.stop();
    return result;
  } catch (error) {
    const timing = timer.stop();

    console.error(`[Performance] Operation failed after ${timing.duration.toFixed(2)}ms`, {
      operation: operationName,
      requestId: timing.requestId,
      error,
    });

    throw error;
  }
}

// ============================================================================
// DATASET SIZE WARNINGS
// ============================================================================

/**
 * Check dataset size and log warning if too large
 */
export function checkDatasetSize(
  datasetName: string,
  size: number,
  requestId?: string
): void {
  if (size > PERFORMANCE_THRESHOLDS.VERY_LARGE_DATASET) {
    console.warn('[Performance Warning] VERY LARGE DATASET', {
      dataset: datasetName,
      size,
      threshold: PERFORMANCE_THRESHOLDS.VERY_LARGE_DATASET,
      recommendation: 'Consider implementing pagination or batch processing',
      requestId: requestId || generateRequestId(),
    });
  } else if (size > PERFORMANCE_THRESHOLDS.LARGE_DATASET) {
    console.warn('[Performance Warning] LARGE DATASET', {
      dataset: datasetName,
      size,
      threshold: PERFORMANCE_THRESHOLDS.LARGE_DATASET,
      recommendation: 'Monitor performance carefully',
      requestId: requestId || generateRequestId(),
    });
  }
}

// ============================================================================
// API LOGGING HELPERS
// ============================================================================

/**
 * Log API request start
 */
export function logAPIStart(
  method: string,
  path: string,
  requestId: string,
  metadata?: Record<string, any>
): void {
  console.log(`[API Request] ${method} ${path}`, {
    requestId,
    timestamp: new Date().toISOString(),
    ...metadata,
  });
}

/**
 * Log API request completion
 */
export function logAPIComplete(
  method: string,
  path: string,
  duration: number,
  requestId: string,
  success: boolean = true,
  metadata?: Record<string, any>
): void {
  const level = duration > PERFORMANCE_THRESHOLDS.SLOW_OPERATION ? 'warn' : 'log';

  console[level](`[API Complete] ${method} ${path}`, {
    requestId,
    duration: `${(duration / 1000).toFixed(2)}s`,
    success,
    timestamp: new Date().toISOString(),
    ...metadata,
  });
}

// ============================================================================
// BATCH OPERATION HELPERS
// ============================================================================

/**
 * Log batch operation progress
 */
export function logBatchProgress(
  operationName: string,
  current: number,
  total: number,
  requestId: string
): void {
  const percentage = Math.round((current / total) * 100);

  console.log(`[Batch Progress] ${operationName}`, {
    requestId,
    progress: `${current}/${total} (${percentage}%)`,
    remaining: total - current,
  });
}

/**
 * Log batch operation completion
 */
export function logBatchComplete(
  operationName: string,
  totalProcessed: number,
  successCount: number,
  failureCount: number,
  duration: number,
  requestId: string
): void {
  const successRate = Math.round((successCount / totalProcessed) * 100);

  console.log(`[Batch Complete] ${operationName}`, {
    requestId,
    total: totalProcessed,
    succeeded: successCount,
    failed: failureCount,
    successRate: `${successRate}%`,
    duration: `${(duration / 1000).toFixed(2)}s`,
    throughput: `${(totalProcessed / (duration / 1000)).toFixed(2)} items/sec`,
  });
}

// ============================================================================
// EXPORTS
// ============================================================================

export const PerformanceMonitor = {
  generateRequestId,
  PerformanceTimer,
  measureAsync,
  measureSync,
  checkDatasetSize,
  logAPIStart,
  logAPIComplete,
  logBatchProgress,
  logBatchComplete,
  THRESHOLDS: PERFORMANCE_THRESHOLDS,
};

export default PerformanceMonitor;
