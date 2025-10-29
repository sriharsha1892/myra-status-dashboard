/**
 * Runtime Sanitization Middleware
 *
 * This middleware ensures that no vendor names or identifying information
 * leak through API responses, logs, or error messages.
 */

/**
 * Vendor name patterns to sanitize
 * These are the terms we need to remove from all outputs
 */
const VENDOR_PATTERNS = [
  // AI Providers
  { pattern: /openai/gi, replacement: 'AI Provider' },
  { pattern: /anthropic/gi, replacement: 'AI Provider' },
  { pattern: /claude/gi, replacement: 'AI Assistant' },
  { pattern: /gpt-?4/gi, replacement: 'Advanced AI' },
  { pattern: /gpt-?3\.?5/gi, replacement: 'General AI' },
  { pattern: /chatgpt/gi, replacement: 'Chat AI' },
  { pattern: /dall-?e/gi, replacement: 'Image AI' },

  // Search Providers
  { pattern: /exa\.ai/gi, replacement: 'search-service.internal' },
  { pattern: /exa/gi, replacement: 'Search Service' },
  { pattern: /brave/gi, replacement: 'Search Service' },

  // Cloud Providers
  { pattern: /google\s+cloud/gi, replacement: 'Cloud Provider' },
  { pattern: /gemini/gi, replacement: 'Multimodal AI' },
  { pattern: /vertex\s+ai/gi, replacement: 'ML Platform' },
  { pattern: /aws/gi, replacement: 'Cloud Infrastructure' },
  { pattern: /amazon\s+web\s+services/gi, replacement: 'Cloud Infrastructure' },
  { pattern: /bedrock/gi, replacement: 'AI Platform' },

  // Specific API endpoints
  { pattern: /api\.openai\.com/gi, replacement: 'ai-api.internal' },
  { pattern: /api\.anthropic\.com/gi, replacement: 'ai-api.internal' },
  { pattern: /status\.openai\.com/gi, replacement: 'status-api.internal' },
  { pattern: /status\.anthropic\.com/gi, replacement: 'status-api.internal' },
  { pattern: /status\.exa\.ai/gi, replacement: 'status-api.internal' },
];

/**
 * Sanitize a string by removing all vendor references
 */
export function sanitizeString(input: string): string {
  if (!input || typeof input !== 'string') return input;

  let sanitized = input;

  for (const { pattern, replacement } of VENDOR_PATTERNS) {
    sanitized = sanitized.replace(pattern, replacement);
  }

  return sanitized;
}

/**
 * Recursively sanitize an object
 */
export function sanitizeObject<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    return sanitizeString(obj) as T;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item)) as T;
  }

  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Sanitize both keys and values
      const sanitizedKey = sanitizeString(key);
      sanitized[sanitizedKey] = sanitizeObject(value);
    }
    return sanitized as T;
  }

  return obj;
}

/**
 * Sanitize error messages
 */
export function sanitizeError(error: Error | unknown): Error {
  if (error instanceof Error) {
    const sanitizedMessage = sanitizeString(error.message);
    const sanitizedStack = error.stack ? sanitizeString(error.stack) : undefined;

    const sanitizedError = new Error(sanitizedMessage);
    sanitizedError.stack = sanitizedStack;
    sanitizedError.name = error.name;

    return sanitizedError;
  }

  return error as Error;
}

/**
 * Override console methods to auto-sanitize
 */
export function setupConsoleSanitization() {
  if (typeof window === 'undefined') {
    // Server-side console sanitization
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalInfo = console.info;

    console.log = (...args: any[]) => {
      originalLog(...args.map(arg => sanitizeObject(arg)));
    };

    console.error = (...args: any[]) => {
      originalError(...args.map(arg => sanitizeObject(arg)));
    };

    console.warn = (...args: any[]) => {
      originalWarn(...args.map(arg => sanitizeObject(arg)));
    };

    console.info = (...args: any[]) => {
      originalInfo(...args.map(arg => sanitizeObject(arg)));
    };
  }
}

/**
 * Middleware wrapper for Next.js API routes
 */
export function withSanitization<T extends (...args: any[]) => Promise<Response>>(
  handler: T
): T {
  return (async (...args: any[]) => {
    try {
      const response = await handler(...args);

      // Clone the response to modify it
      const clonedResponse = response.clone();
      const body = await clonedResponse.json().catch(() => null);

      if (body) {
        // Sanitize the response body
        const sanitizedBody = sanitizeObject(body);

        return new Response(JSON.stringify(sanitizedBody), {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        });
      }

      return response;
    } catch (error) {
      // Sanitize errors before they're returned
      const sanitizedError = sanitizeError(error);
      throw sanitizedError;
    }
  }) as T;
}

/**
 * Sanitize Next.js API response
 */
export function sanitizeApiResponse<T>(data: T): T {
  return sanitizeObject(data);
}

/**
 * Check if a string contains vendor references
 */
export function containsVendorReferences(input: string): boolean {
  if (!input || typeof input !== 'string') return false;

  return VENDOR_PATTERNS.some(({ pattern }) => pattern.test(input));
}

/**
 * Get list of vendor references found in a string
 */
export function findVendorReferences(input: string): string[] {
  if (!input || typeof input !== 'string') return [];

  const found: string[] = [];

  for (const { pattern } of VENDOR_PATTERNS) {
    const matches = input.match(pattern);
    if (matches) {
      found.push(...matches);
    }
  }

  return [...new Set(found)]; // Remove duplicates
}

/**
 * Safe JSON stringify with sanitization
 */
export function safeStringify(obj: any, space?: number): string {
  const sanitized = sanitizeObject(obj);
  return JSON.stringify(sanitized, null, space);
}

/**
 * Create a sanitization report for debugging
 */
export function createSanitizationReport(input: string): {
  original: string;
  sanitized: string;
  referencesFound: string[];
  wasModified: boolean;
} {
  const sanitized = sanitizeString(input);
  const referencesFound = findVendorReferences(input);

  return {
    original: input,
    sanitized,
    referencesFound,
    wasModified: input !== sanitized,
  };
}
