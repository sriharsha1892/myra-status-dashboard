/**
 * AI Parser for Bulk Import Framework
 *
 * Handles AI-powered parsing using Groq LLM
 * Used by:
 * - Timeline Events Import (AI)
 * - Trial Users Import
 * - Smart Import
 * - Auto-Tag Organizations
 */

import { ImportParser, ParseResult } from '../BulkImportFramework';
import {
  parseWithAI,
  AIParsingConfig,
  buildExtractionPrompt,
  buildInputPrompt,
} from '@/lib/ai/bulkParsingService';

export interface AIParserConfig {
  /** Entity information */
  entityType: string;
  entityPlural: string;

  /** Field definitions for extraction */
  fields: Array<{
    name: string;
    type: string;
    required: boolean;
    description?: string;
  }>;

  /** Examples to include in prompt */
  examples?: string[];

  /** Special instructions for LLM */
  specialInstructions?: string[];

  /** Additional context to pass to LLM */
  context?: Record<string, any>;

  /** Model to use (default: llama-3.3-70b-versatile) */
  model?: string;

  /** Temperature (0-2, lower = more deterministic) */
  temperature?: number;

  /** Max tokens */
  maxTokens?: number;

  /** Max retries */
  maxRetries?: number;
}

/**
 * AI-Powered Parser using Groq LLM
 */
export class AIParser<T> implements ImportParser<T> {
  type: 'ai' = 'ai';
  private config: AIParserConfig;

  constructor(config: AIParserConfig) {
    this.config = config;
  }

  async parse(input: File | string): Promise<ParseResult<T>> {
    const startTime = Date.now();

    try {
      // Get text content
      const text = typeof input === 'string' ? input : await input.text();

      // Build prompts using standardized builders
      const systemPrompt = buildExtractionPrompt({
        entityType: this.config.entityType,
        entityPlural: this.config.entityPlural,
        fields: this.config.fields,
        examples: this.config.examples,
        specialInstructions: this.config.specialInstructions,
      });

      const userPrompt = buildInputPrompt(text, this.config.context);

      // Call AI parsing service
      const aiConfig: AIParsingConfig = {
        systemPrompt,
        userPrompt,
        model: this.config.model,
        temperature: this.config.temperature || 0.2,
        maxTokens: this.config.maxTokens || 4000,
        maxRetries: this.config.maxRetries || 3,
      };

      const result = await parseWithAI<{
        [key: string]: T[];
        metadata?: {
          count: number;
          confidence: number;
        };
      }>(aiConfig);

      if (!result.success || !result.data) {
        return {
          items: [],
          errors: [
            {
              message: result.error || 'AI parsing failed',
            },
          ],
        };
      }

      // Extract items from result
      // LLM returns { "entityPlural": [...], "metadata": {...} }
      const items = result.data[this.config.entityPlural] || [];

      return {
        items: items as T[],
        errors: [],
        metadata: {
          rowCount: items.length,
          parsingDuration: Date.now() - startTime,
        },
      };
    } catch (error) {
      return {
        items: [],
        errors: [
          {
            message: `AI parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
      };
    }
  }
}

/**
 * Factory function to create AI parser
 */
export function createAIParser<T>(config: AIParserConfig): AIParser<T> {
  return new AIParser<T>(config);
}

/**
 * Factory function to create AI parser with simplified config
 * (when you just want to extract a list of items)
 */
export function createSimpleAIParser<T>(
  entityType: string,
  entityPlural: string,
  fieldDescriptions: Record<string, string>
): AIParser<T> {
  const fields = Object.entries(fieldDescriptions).map(([name, description]) => ({
    name,
    type: 'string',
    required: true,
    description,
  }));

  return new AIParser<T>({
    entityType,
    entityPlural,
    fields,
  });
}
