/**
 * Simple in-memory cache for tag suggestions
 * Reduces redundant API calls during typing
 */

interface CacheEntry {
  tags: string[];
  timestamp: number;
}

// Cache configuration
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 100; // Maximum number of cached entries

// The cache store
const cache = new Map<string, CacheEntry>();

/**
 * Generate cache key from input parameters
 */
export function getCacheKey(
  title: string,
  eventType: string | undefined,
  eventCategory: string | undefined
): string {
  // Create a stable key from the inputs
  const parts = [
    title.toLowerCase().trim(),
    eventType || 'none',
    eventCategory || 'none'
  ];
  return parts.join('|');
}

/**
 * Get cached tags if available and not expired
 */
export function getCachedTags(key: string): string[] | null {
  const entry = cache.get(key);

  if (!entry) {
    return null;
  }

  // Check if cache entry has expired
  const now = Date.now();
  if (now - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }

  return entry.tags;
}

/**
 * Store tags in cache
 */
export function setCachedTags(key: string, tags: string[]): void {
  // Enforce cache size limit (LRU-ish behavior)
  if (cache.size >= MAX_CACHE_SIZE) {
    // Remove oldest entry
    const firstKey = cache.keys().next().value;
    if (firstKey) {
      cache.delete(firstKey);
    }
  }

  cache.set(key, {
    tags,
    timestamp: Date.now()
  });
}

/**
 * Clear all cached entries
 */
export function clearCache(): void {
  cache.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  size: number;
  maxSize: number;
  ttlMinutes: number;
} {
  return {
    size: cache.size,
    maxSize: MAX_CACHE_SIZE,
    ttlMinutes: CACHE_TTL_MS / (60 * 1000)
  };
}