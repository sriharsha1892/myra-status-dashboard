/**
 * Text Parser for Bulk Import Framework
 *
 * Handles unstructured text parsing with various strategies
 * Used by:
 * - Interactive CLI Import
 * - Text-based imports
 * - Any free-form text imports
 */

import { ImportParser, ParseResult } from '../BulkImportFramework';

export interface TextParserConfig {
  /** Parsing strategy */
  strategy: 'line-by-line' | 'paragraph' | 'json' | 'custom';

  /** Line delimiter (for line-by-line) */
  lineDelimiter?: string;

  /** Paragraph delimiter (for paragraph) */
  paragraphDelimiter?: string;

  /** Custom parser function */
  customParser?: (text: string) => any[];

  /** Skip empty entries */
  skipEmpty?: boolean;

  /** Trim whitespace */
  trimValues?: boolean;

  /** Transform function applied to each parsed item */
  transformer?: (item: any, index: number) => any;
}

/**
 * Generic Text Parser
 */
export class TextParser<T> implements ImportParser<T> {
  type: 'text' = 'text';
  private config: TextParserConfig;

  constructor(config: TextParserConfig) {
    this.config = {
      skipEmpty: true,
      trimValues: true,
      lineDelimiter: '\n',
      paragraphDelimiter: '\n\n',
      ...config,
    };
  }

  async parse(input: File | string): Promise<ParseResult<T>> {
    const startTime = Date.now();

    try {
      // Get text content
      const text = typeof input === 'string' ? input : await input.text();

      let items: any[];

      switch (this.config.strategy) {
        case 'line-by-line':
          items = this.parseLineByLine(text);
          break;

        case 'paragraph':
          items = this.parseParagraph(text);
          break;

        case 'json':
          items = this.parseJSON(text);
          break;

        case 'custom':
          if (!this.config.customParser) {
            throw new Error('Custom parser function not provided');
          }
          items = this.config.customParser(text);
          break;

        default:
          throw new Error(`Unknown parsing strategy: ${this.config.strategy}`);
      }

      // Apply transformer if configured
      if (this.config.transformer) {
        items = items.map(this.config.transformer);
      }

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
            message: `Text parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
      };
    }
  }

  /**
   * Parse text line by line
   */
  private parseLineByLine(text: string): any[] {
    let lines = text.split(this.config.lineDelimiter || '\n');

    if (this.config.trimValues) {
      lines = lines.map((line) => line.trim());
    }

    if (this.config.skipEmpty) {
      lines = lines.filter((line) => line.length > 0);
    }

    return lines;
  }

  /**
   * Parse text by paragraphs
   */
  private parseParagraph(text: string): any[] {
    let paragraphs = text.split(this.config.paragraphDelimiter || '\n\n');

    if (this.config.trimValues) {
      paragraphs = paragraphs.map((p) => p.trim());
    }

    if (this.config.skipEmpty) {
      paragraphs = paragraphs.filter((p) => p.length > 0);
    }

    return paragraphs;
  }

  /**
   * Parse JSON text (supports both array and single object)
   */
  private parseJSON(text: string): any[] {
    try {
      const parsed = JSON.parse(text);

      if (Array.isArray(parsed)) {
        return parsed;
      } else {
        return [parsed];
      }
    } catch (error) {
      throw new Error(`Invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

/**
 * Factory function to create line-by-line text parser
 */
export function createLineParser<T>(
  transformer?: (line: string, index: number) => T
): TextParser<T> {
  return new TextParser<T>({
    strategy: 'line-by-line',
    transformer,
  });
}

/**
 * Factory function to create paragraph parser
 */
export function createParagraphParser<T>(
  transformer?: (paragraph: string, index: number) => T
): TextParser<T> {
  return new TextParser<T>({
    strategy: 'paragraph',
    transformer,
  });
}

/**
 * Factory function to create JSON parser
 */
export function createJSONParser<T>(): TextParser<T> {
  return new TextParser<T>({
    strategy: 'json',
  });
}

/**
 * Factory function to create custom text parser
 */
export function createCustomTextParser<T>(
  customParser: (text: string) => T[]
): TextParser<T> {
  return new TextParser<T>({
    strategy: 'custom',
    customParser,
  });
}
