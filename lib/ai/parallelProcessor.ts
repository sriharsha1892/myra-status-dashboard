/**
 * Parallel Processing Utility for Groq AI Operations
 * Optimizes batch operations with concurrent processing
 */

/**
 * Process items in parallel with controlled concurrency
 * @param items Array of items to process
 * @param processor Function to process each item
 * @param concurrency Max concurrent operations (default: 3)
 * @param delayMs Delay between batches in milliseconds (default: 200)
 * @returns Array of results in original order
 */
export async function processInParallel<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  concurrency: number = 3,
  delayMs: number = 200
): Promise<R[]> {
  const results: R[] = new Array(items.length);

  // Process items in chunks
  for (let i = 0; i < items.length; i += concurrency) {
    const chunk = items.slice(i, i + concurrency);
    const chunkPromises = chunk.map((item, chunkIndex) => {
      const globalIndex = i + chunkIndex;
      return processor(item, globalIndex).then((result) => {
        results[globalIndex] = result;
        return result;
      });
    });

    // Wait for all items in chunk to complete
    await Promise.all(chunkPromises);

    // Add delay between chunks (not after last chunk)
    if (i + concurrency < items.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return results;
}

/**
 * Process items with progress callback
 */
export async function processWithProgress<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  onProgress?: (completed: number, total: number, item: T) => void,
  concurrency: number = 3,
  delayMs: number = 200
): Promise<R[]> {
  let completed = 0;

  return processInParallel(
    items,
    async (item, index) => {
      const result = await processor(item, index);
      completed++;
      onProgress?.(completed, items.length, item);
      return result;
    },
    concurrency,
    delayMs
  );
}

/**
 * Chunk array into smaller arrays
 */
export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}