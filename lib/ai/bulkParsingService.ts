/**
 * AI-Powered Bulk Parsing Service
 *
 * Consolidates AI parsing logic used across:
 * - Timeline Events Import (llmParser.ts)
 * - Trial Users Import (userParser.ts)
 * - Smart Import (orgs + users + activities)
 * - Auto-Tag Organizations
 *
 * Benefits:
 * - Single Gro

q client with retry logic
 * - Centralized rate limiting
 * - Consistent prompt engineering
 * - Standardized confidence scoring
 * - Better error handling
 * - Performance monitoring
 */

import Groq from 'groq-sdk';

// Initialize Groq client
// Allow browser-like environments for development and testing
// Note: In production, this should only run server-side (API routes)
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || '',
  dangerouslyAllowBrowser: process.env.NODE_ENV !== 'production',
});

// =====================================================
// TYPES & INTERFACES
// =====================================================

export interface AIParsingConfig {
  /** Model to use (default: llama-3.3-70b-versatile) */
  model?: string;

  /** Temperature (0-2, lower = more deterministic) */
  temperature?: number;

  /** Max tokens in response */
  maxTokens?: number;

  /** System prompt / role definition */
  systemPrompt: string;

  /** User prompt with input data */
  userPrompt: string;

  /** Maximum retries on failure (default: 3) */
  maxRetries?: number;

  /** Delay between retries in ms (default: 1000) */
  retryDelay?: number;

  /** Whether to use exponential backoff (default: true) */
  exponentialBackoff?: boolean;

  /** Timeout in ms (default: 30000) */
  timeout?: number;
}

export interface AIParsingResult<T> {
  /** Successfully parsed data */
  data: T | null;

  /** Raw LLM response text */
  rawResponse: string;

  /** Whether parsing was successful */
  success: boolean;

  /** Error message if failed */
  error?: string;

  /** Number of retries attempted */
  retriesAttempted: number;

  /** Time taken in ms */
  duration: number;

  /** Tokens used */
  tokensUsed?: {
    prompt: number;
    completion: number;
    total: number;
  };
}

export interface ConfidenceScore {
  /** Confidence value 0-1 */
  value: number;

  /** Tier: high (0.8+), medium (0.5-0.8), low (<0.5) */
  tier: 'high' | 'medium' | 'low';

  /** Optional reasoning */
  reasoning?: string;
}

// =====================================================
// GROQ CLIENT UTILITIES
// =====================================================

/**
 * Checks if Groq API is available
 */
export function isGroqAvailable(): boolean {
  return !!process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.length > 0;
}

/**
 * Gets available Groq models
 */
export const GROQ_MODELS = {
  LLAMA_70B: 'llama-3.3-70b-versatile',
  LLAMA_8B: 'llama-3.1-8b-instant',
  MIXTRAL: 'mixtral-8x7b-32768',
} as const;

// =====================================================
// CORE PARSING FUNCTION
// =====================================================

/**
 * Parses input using Groq LLM with retry logic and error handling
 *
 * @example
 * ```typescript
 * const result = await parseWithAI<User[]>({
 *   systemPrompt: 'You are an expert at extracting user data...',
 *   userPrompt: `Extract users from: ${text}`,
 *   temperature: 0.1,
 *   maxRetries: 3
 * });
 *
 * if (result.success && result.data) {
 *   console.log('Parsed users:', result.data);
 * }
 * ```
 */
export async function parseWithAI<T>(
  config: AIParsingConfig
): Promise<AIParsingResult<T>> {
  const {
    model = GROQ_MODELS.LLAMA_70B,
    temperature = 0.2,
    maxTokens = 4000,
    systemPrompt,
    userPrompt,
    maxRetries = 3,
    retryDelay = 1000,
    exponentialBackoff = true,
    timeout = 30000,
  } = config;

  const startTime = Date.now();
  let retriesAttempted = 0;
  let lastError: Error | null = null;

  // Validate Groq availability
  if (!isGroqAvailable()) {
    return {
      data: null,
      rawResponse: '',
      success: false,
      error: 'Groq API key not configured',
      retriesAttempted: 0,
      duration: Date.now() - startTime,
    };
  }

  // Retry loop
  while (retriesAttempted <= maxRetries) {
    try {
      // Call Groq API with timeout
      const response = await Promise.race([
        groq.chat.completions.create({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature,
          max_tokens: maxTokens,
          response_format: { type: 'json_object' },
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), timeout)
        ),
      ]);

      // Extract content
      const content = response.choices[0]?.message?.content || '';

      // Parse JSON
      const parsed = parseJSON<T>(content);

      if (!parsed.success) {
        throw new Error(`JSON parsing failed: ${parsed.error}`);
      }

      // Success!
      return {
        data: parsed.data,
        rawResponse: content,
        success: true,
        retriesAttempted,
        duration: Date.now() - startTime,
        tokensUsed: response.usage
          ? {
              prompt: response.usage.prompt_tokens,
              completion: response.usage.completion_tokens,
              total: response.usage.total_tokens,
            }
          : undefined,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      retriesAttempted++;

      // Check if we should retry
      if (retriesAttempted > maxRetries) {
        break;
      }

      // Calculate delay with exponential backoff
      const delay = exponentialBackoff
        ? retryDelay * Math.pow(2, retriesAttempted - 1)
        : retryDelay;

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // All retries exhausted
  return {
    data: null,
    rawResponse: '',
    success: false,
    error: lastError?.message || 'Unknown error',
    retriesAttempted,
    duration: Date.now() - startTime,
  };
}

// =====================================================
// JSON PARSING UTILITIES
// =====================================================

/**
 * Safely parses JSON from LLM response
 * Handles common edge cases and formatting issues
 */
export function parseJSON<T>(content: string): {
  success: boolean;
  data: T | null;
  error?: string;
} {
  if (!content || content.trim().length === 0) {
    return {
      success: false,
      data: null,
      error: 'Empty response',
    };
  }

  try {
    // Try direct parse first
    const parsed = JSON.parse(content) as T;
    return {
      success: true,
      data: parsed,
    };
  } catch (directError) {
    // Try extracting JSON from markdown code blocks
    const codeBlockMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\}|\[[\s\S]*\])\s*```/);
    if (codeBlockMatch) {
      try {
        const parsed = JSON.parse(codeBlockMatch[1]) as T;
        return {
          success: true,
          data: parsed,
        };
      } catch (codeBlockError) {
        // Continue to next attempt
      }
    }

    // Try finding first { or [ and parsing from there
    const jsonStart = content.search(/[\{\[]/);
    if (jsonStart !== -1) {
      try {
        const parsed = JSON.parse(content.slice(jsonStart)) as T;
        return {
          success: true,
          data: parsed,
        };
      } catch (sliceError) {
        // Continue to next attempt
      }
    }

    // All attempts failed
    return {
      success: false,
      data: null,
      error: 'Failed to parse JSON from response',
    };
  }
}

// =====================================================
// CONFIDENCE SCORING
// =====================================================

/**
 * Standardized confidence scoring across all AI parsers
 */
export function calculateConfidence(
  value: number,
  reasoning?: string
): ConfidenceScore {
  // Clamp to 0-1
  const clamped = Math.max(0, Math.min(1, value));

  // Determine tier
  let tier: 'high' | 'medium' | 'low';
  if (clamped >= 0.8) {
    tier = 'high';
  } else if (clamped >= 0.5) {
    tier = 'medium';
  } else {
    tier = 'low';
  }

  return {
    value: clamped,
    tier,
    reasoning,
  };
}

/**
 * Adjusts confidence based on various factors
 */
export function adjustConfidence(
  baseConfidence: number,
  factors: {
    hasRequiredFields?: boolean;
    hasValidEmail?: boolean;
    hasValidDate?: boolean;
    matchesExpectedFormat?: boolean;
    hasAmbiguousData?: boolean;
  }
): number {
  let adjusted = baseConfidence;

  // Boost confidence for good signals
  if (factors.hasRequiredFields) adjusted += 0.1;
  if (factors.hasValidEmail) adjusted += 0.05;
  if (factors.hasValidDate) adjusted += 0.05;
  if (factors.matchesExpectedFormat) adjusted += 0.1;

  // Reduce confidence for bad signals
  if (factors.hasAmbiguousData) adjusted -= 0.15;

  // Clamp to 0-1
  return Math.max(0, Math.min(1, adjusted));
}

// =====================================================
// PROMPT ENGINEERING UTILITIES
// =====================================================

/**
 * Builds a standardized system prompt for extraction tasks
 */
export function buildExtractionPrompt(config: {
  entityType: string;
  entityPlural: string;
  fields: Array<{ name: string; type: string; required: boolean; description?: string }>;
  examples?: string[];
  specialInstructions?: string[];
}): string {
  const { entityType, entityPlural, fields, examples, specialInstructions } = config;

  let prompt = `You are an expert at extracting ${entityType} data from unstructured text.\n\n`;

  prompt += `Your task is to extract ${entityPlural} from the provided text and return them in JSON format.\n\n`;

  // Fields section
  prompt += `Each ${entityType} should have the following fields:\n`;
  fields.forEach(field => {
    const required = field.required ? '(required)' : '(optional)';
    const desc = field.description ? ` - ${field.description}` : '';
    prompt += `  - ${field.name}: ${field.type} ${required}${desc}\n`;
  });
  prompt += '\n';

  // Special instructions
  if (specialInstructions && specialInstructions.length > 0) {
    prompt += 'Important rules:\n';
    specialInstructions.forEach((instruction, index) => {
      prompt += `${index + 1}. ${instruction}\n`;
    });
    prompt += '\n';
  }

  // Output format
  prompt += 'Return your response as a JSON object with this structure:\n';
  prompt += `{\n  "${entityPlural}": [...],\n  "metadata": { "count": number, "confidence": number }\n}\n\n`;

  // Examples
  if (examples && examples.length > 0) {
    prompt += 'Examples:\n';
    examples.forEach((example, index) => {
      prompt += `${index + 1}. ${example}\n`;
    });
    prompt += '\n';
  }

  prompt += 'If no valid entities are found, return an empty array.\n';
  prompt += 'Always provide a confidence score (0-1) indicating how certain you are about the extraction.';

  return prompt;
}

/**
 * Builds user prompt with input data
 */
export function buildInputPrompt(text: string, context?: Record<string, any>): string {
  let prompt = `Extract the data from the following text:\n\n${text}`;

  if (context && Object.keys(context).length > 0) {
    prompt += '\n\nAdditional context:\n';
    Object.entries(context).forEach(([key, value]) => {
      prompt += `  ${key}: ${JSON.stringify(value)}\n`;
    });
  }

  return prompt;
}

// =====================================================
// RATE LIMITING
// =====================================================

interface RateLimitConfig {
  requestsPerMinute: number;
  lastRequestTime: number;
  requestCount: number;
}

const rateLimiters = new Map<string, RateLimitConfig>();

/**
 * Rate limiting to prevent 429 errors from Groq
 * Call before making AI requests
 */
export async function rateLimitWait(
  key: string = 'default',
  maxRequestsPerMinute: number = 30
): Promise<void> {
  const now = Date.now();
  const limiter = rateLimiters.get(key) || {
    requestsPerMinute: maxRequestsPerMinute,
    lastRequestTime: 0,
    requestCount: 0,
  };

  // Reset counter if more than 1 minute has passed
  if (now - limiter.lastRequestTime > 60000) {
    limiter.requestCount = 0;
    limiter.lastRequestTime = now;
  }

  // Check if we need to wait
  if (limiter.requestCount >= maxRequestsPerMinute) {
    const timeToWait = 60000 - (now - limiter.lastRequestTime);
    if (timeToWait > 0) {
      await new Promise(resolve => setTimeout(resolve, timeToWait));
      limiter.requestCount = 0;
      limiter.lastRequestTime = Date.now();
    }
  }

  // Increment counter
  limiter.requestCount++;
  limiter.lastRequestTime = now;

  // Save back to map
  rateLimiters.set(key, limiter);
}

/**
 * Clears rate limit counters (useful for testing)
 */
export function clearRateLimits(): void {
  rateLimiters.clear();
}

// =====================================================
// BATCH AI PARSING
// =====================================================

/**
 * Parses multiple texts in sequence with rate limiting
 * Useful for processing large datasets
 */
export async function parseBatchWithAI<T>(
  texts: string[],
  config: Omit<AIParsingConfig, 'userPrompt'>,
  buildUserPrompt: (text: string, index: number) => string,
  onProgress?: (current: number, total: number) => void
): Promise<Array<AIParsingResult<T>>> {
  const results: Array<AIParsingResult<T>> = [];

  for (let i = 0; i < texts.length; i++) {
    // Rate limiting
    await rateLimitWait('batch-parsing', 20); // Conservative rate limit

    // Parse individual text
    const result = await parseWithAI<T>({
      ...config,
      userPrompt: buildUserPrompt(texts[i], i),
    });

    results.push(result);

    // Progress callback
    onProgress?.(i + 1, texts.length);

    // Small delay between requests
    if (i < texts.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return results;
}

// =====================================================
// ERROR HANDLING
// =====================================================

/**
 * Categorizes AI parsing errors for better handling
 */
export function categorizeAIError(error: string): {
  category: 'rate_limit' | 'timeout' | 'parsing' | 'api' | 'unknown';
  userMessage: string;
  retryable: boolean;
} {
  const lower = error.toLowerCase();

  if (lower.includes('rate limit') || lower.includes('429')) {
    return {
      category: 'rate_limit',
      userMessage: 'Rate limit exceeded. Please try again in a few moments.',
      retryable: true,
    };
  }

  if (lower.includes('timeout')) {
    return {
      category: 'timeout',
      userMessage: 'Request timed out. Please try again.',
      retryable: true,
    };
  }

  if (lower.includes('json') || lower.includes('parse')) {
    return {
      category: 'parsing',
      userMessage: 'Failed to parse AI response. Please try again.',
      retryable: true,
    };
  }

  if (lower.includes('api') || lower.includes('groq')) {
    return {
      category: 'api',
      userMessage: 'AI service temporarily unavailable. Please try again later.',
      retryable: true,
    };
  }

  return {
    category: 'unknown',
    userMessage: 'An unexpected error occurred. Please try again.',
    retryable: false,
  };
}

// =====================================================
// VALIDATION HELPERS
// =====================================================

/**
 * Validates AI parsing result against expected schema
 */
export function validateAIResult<T>(
  result: AIParsingResult<T>,
  validator: (data: T) => boolean,
  errorMessage?: string
): AIParsingResult<T> {
  if (!result.success || !result.data) {
    return result;
  }

  const isValid = validator(result.data);

  if (!isValid) {
    return {
      ...result,
      success: false,
      error: errorMessage || 'Validation failed',
      data: null,
    };
  }

  return result;
}
