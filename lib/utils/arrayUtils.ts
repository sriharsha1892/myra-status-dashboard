/**
 * Array Utilities
 * Helper functions for array operations including batching
 */

// ============================================================================
// BATCH PROCESSING
// ============================================================================

/**
 * Split an array into smaller chunks of specified size
 *
 * @param array - The array to split into chunks
 * @param chunkSize - The size of each chunk
 * @returns Array of chunks
 *
 * @example
 * const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
 * const batches = chunkArray(items, 3);
 * // Returns: [[1, 2, 3], [4, 5, 6], [7, 8, 9], [10]]
 */
export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  if (chunkSize <= 0) {
    throw new Error('Chunk size must be greater than 0');
  }

  if (!array || array.length === 0) {
    return [];
  }

  const chunks: T[][] = [];

  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }

  return chunks;
}

/**
 * Process an array in batches with a callback function
 *
 * @param array - The array to process
 * @param chunkSize - The size of each batch
 * @param callback - Function to call for each batch
 * @param onProgress - Optional progress callback
 * @returns Promise that resolves when all batches are processed
 *
 * @example
 * await processBatches(
 *   items,
 *   50,
 *   async (batch) => await insertItems(batch),
 *   (current, total) => console.log(`Progress: ${current}/${total}`)
 * );
 */
export async function processBatches<T, R>(
  array: T[],
  chunkSize: number,
  callback: (batch: T[], batchIndex: number) => Promise<R>,
  onProgress?: (current: number, total: number) => void
): Promise<R[]> {
  const batches = chunkArray(array, chunkSize);
  const results: R[] = [];

  for (let i = 0; i < batches.length; i++) {
    const result = await callback(batches[i], i);
    results.push(result);

    if (onProgress) {
      const processedCount = Math.min((i + 1) * chunkSize, array.length);
      onProgress(processedCount, array.length);
    }
  }

  return results;
}

// ============================================================================
// ARRAY HELPERS
// ============================================================================

/**
 * Remove duplicate items from an array
 *
 * @param array - The array to deduplicate
 * @param keyFn - Optional function to extract unique key from items
 * @returns Array with duplicates removed
 *
 * @example
 * const unique = uniqueArray([1, 2, 2, 3, 3, 4]);
 * // Returns: [1, 2, 3, 4]
 *
 * const uniqueUsers = uniqueArray(users, user => user.id);
 */
export function uniqueArray<T>(
  array: T[],
  keyFn?: (item: T) => string | number
): T[] {
  if (!keyFn) {
    return Array.from(new Set(array));
  }

  const seen = new Set<string | number>();
  return array.filter(item => {
    const key = keyFn(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

/**
 * Group array items by a key
 *
 * @param array - The array to group
 * @param keyFn - Function to extract grouping key
 * @returns Object with grouped items
 *
 * @example
 * const grouped = groupBy(users, user => user.role);
 * // Returns: { admin: [...], user: [...] }
 */
export function groupBy<T>(
  array: T[],
  keyFn: (item: T) => string
): Record<string, T[]> {
  return array.reduce((groups, item) => {
    const key = keyFn(item);
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
    return groups;
  }, {} as Record<string, T[]>);
}

/**
 * Calculate sum of numeric values in array
 *
 * @param array - The array to sum
 * @param valueFn - Optional function to extract numeric value
 * @returns Sum of all values
 */
export function sum<T>(
  array: T[],
  valueFn?: (item: T) => number
): number {
  if (!valueFn) {
    return (array as number[]).reduce((total, num) => total + num, 0);
  }

  return array.reduce((total, item) => total + valueFn(item), 0);
}

// ============================================================================
// EXPORTS
// ============================================================================

export const ArrayUtils = {
  chunkArray,
  processBatches,
  uniqueArray,
  groupBy,
  sum,
};

export default ArrayUtils;
