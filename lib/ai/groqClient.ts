/**
 * Groq AI Client
 * Reusable, safe client for Groq API interactions
 * Features: Error handling, retries, graceful degradation, timeout management
 */

import Groq from 'groq-sdk';

// Types
export interface GroqResponse<T = any> {
  success: boolean;
  data: T | null;
  error?: string;
  duration_ms?: number;
}

export interface GroqOptions {
  temperature?: number;
  max_tokens?: number;
  max_retries?: number;
  timeout_ms?: number;
}

// Constants
const DEFAULT_OPTIONS: GroqOptions = {
  temperature: 0.3, // Consistent, focused responses
  max_tokens: 4000,
  max_retries: 3,
  timeout_ms: 30000, // 30 seconds
};

const GROQ_MODEL = 'llama-3.3-70b-versatile';

/**
 * Get Groq client instance
 * Returns null if API key not configured (graceful degradation)
 */
export function getGroqClient(): Groq | null {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey || apiKey.trim() === '') {
    console.warn('⚠️  GROQ_API_KEY not configured - AI features will be disabled');
    return null;
  }

  return new Groq({ apiKey });
}

/**
 * Check if Groq is available
 */
export function isGroqAvailable(): boolean {
  return getGroqClient() !== null;
}

/**
 * Call Groq API with retry logic and error handling
 * SAFE: Returns error object instead of throwing, existing code continues
 */
export async function callGroq(
  prompt: string,
  options: GroqOptions = {}
): Promise<GroqResponse<string>> {
  const startTime = Date.now();
  const groq = getGroqClient();

  // Graceful degradation if Groq not available
  if (!groq) {
    return {
      success: false,
      data: null,
      error: 'Groq API not configured',
    };
  }

  const {
    temperature = DEFAULT_OPTIONS.temperature,
    max_tokens = DEFAULT_OPTIONS.max_tokens,
    max_retries = DEFAULT_OPTIONS.max_retries,
    timeout_ms = DEFAULT_OPTIONS.timeout_ms,
  } = options;

  // Validate prompt
  if (!prompt || prompt.trim() === '') {
    return {
      success: false,
      data: null,
      error: 'Empty prompt provided',
    };
  }

  // Retry logic with exponential backoff
  for (let attempt = 1; attempt <= max_retries!; attempt++) {
    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), timeout_ms);
      });

      // Create API call promise
      const apiPromise = groq.chat.completions.create({
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        model: GROQ_MODEL,
        temperature,
        max_tokens,
      });

      // Race between timeout and API call
      const completion = await Promise.race([apiPromise, timeoutPromise]);

      const content = completion.choices[0]?.message?.content || '';

      if (!content) {
        return {
          success: false,
          data: null,
          error: 'Empty response from Groq',
        };
      }

      const duration = Date.now() - startTime;

      return {
        success: true,
        data: content,
        duration_ms: duration,
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;

      // Rate limit error - retry with backoff
      if (error.status === 429 && attempt < max_retries!) {
        const backoffMs = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
        console.warn(
          `⚠️  Groq rate limit hit (attempt ${attempt}/${max_retries}), retrying in ${backoffMs}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        continue; // Retry
      }

      // Timeout error
      if (error.message === 'Request timeout') {
        console.error(`❌ Groq request timeout after ${timeout_ms}ms`);
        return {
          success: false,
          data: null,
          error: `Request timeout after ${timeout_ms}ms`,
          duration_ms: duration,
        };
      }

      // API error
      if (error.status) {
        console.error(`❌ Groq API error (${error.status}):`, error.message);
        return {
          success: false,
          data: null,
          error: `API error (${error.status}): ${error.message}`,
          duration_ms: duration,
        };
      }

      // Unknown error
      console.error('❌ Unexpected Groq error:', error);
      return {
        success: false,
        data: null,
        error: error.message || 'Unknown error occurred',
        duration_ms: duration,
      };
    }
  }

  // Max retries exceeded
  return {
    success: false,
    data: null,
    error: `Max retries (${max_retries}) exceeded`,
    duration_ms: Date.now() - startTime,
  };
}

/**
 * Call Groq and parse JSON response
 * SAFE: Validates JSON, returns structured error if parsing fails
 */
export async function callGroqJSON<T = any>(
  prompt: string,
  options: GroqOptions = {}
): Promise<GroqResponse<T>> {
  const result = await callGroq(prompt, options);

  if (!result.success || !result.data) {
    return {
      success: false,
      data: null,
      error: result.error,
      duration_ms: result.duration_ms,
    };
  }

  try {
    // Extract JSON from markdown code blocks if present
    let jsonString = result.data;

    // Remove markdown code blocks
    const codeBlockMatch = jsonString.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (codeBlockMatch) {
      jsonString = codeBlockMatch[1];
    }

    // Parse JSON
    const parsed = JSON.parse(jsonString.trim());

    return {
      success: true,
      data: parsed,
      duration_ms: result.duration_ms,
    };
  } catch (error: any) {
    console.error('❌ Failed to parse Groq JSON response:', error.message);
    console.error('Raw response:', result.data?.substring(0, 500));

    return {
      success: false,
      data: null,
      error: `JSON parse error: ${error.message}`,
      duration_ms: result.duration_ms,
    };
  }
}

/**
 * Batch process multiple prompts (rate-limited)
 * Processes in series to avoid rate limits
 */
export async function callGroqBatch<T = string>(
  prompts: string[],
  options: GroqOptions = {}
): Promise<GroqResponse<T>[]> {
  const results: GroqResponse<T>[] = [];

  for (const prompt of prompts) {
    const result = await callGroq(prompt, options);
    results.push(result as GroqResponse<T>);

    // Small delay between requests to avoid rate limits
    if (prompts.length > 1) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  return results;
}

/**
 * Get usage statistics (if available)
 * Returns estimated usage for monitoring
 */
export function getGroqUsageEstimate(requestCount: number): {
  requests_used: number;
  requests_remaining: number;
  daily_limit: number;
  percentage_used: number;
} {
  const DAILY_LIMIT = 14400; // Free tier limit
  const remaining = Math.max(0, DAILY_LIMIT - requestCount);
  const percentage = (requestCount / DAILY_LIMIT) * 100;

  return {
    requests_used: requestCount,
    requests_remaining: remaining,
    daily_limit: DAILY_LIMIT,
    percentage_used: parseFloat(percentage.toFixed(2)),
  };
}

/**
 * Format prompt with context
 * Helper for consistent prompt formatting
 */
export function formatPrompt(
  instruction: string,
  context?: Record<string, any>,
  examples?: string[]
): string {
  let prompt = instruction;

  if (context && Object.keys(context).length > 0) {
    prompt += '\n\nContext:\n';
    for (const [key, value] of Object.entries(context)) {
      prompt += `- ${key}: ${JSON.stringify(value)}\n`;
    }
  }

  if (examples && examples.length > 0) {
    prompt += '\n\nExamples:\n';
    examples.forEach((example, i) => {
      prompt += `${i + 1}. ${example}\n`;
    });
  }

  return prompt;
}
