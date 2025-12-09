/**
 * CSV Parser for Bulk Import Framework
 *
 * Handles CSV file parsing using PapaParse
 * Used by:
 * - Feature Requests Import
 * - Timeline Events Import (Legacy)
 * - Any CSV-based imports
 */

import Papa from 'papaparse';
import { ImportParser, ParseResult } from '../BulkImportFramework';

export interface CSVParserConfig {
  /** Expected headers (for validation) */
  expectedHeaders?: string[];

  /** Header mapping (CSV header → field name) */
  headerMapping?: Record<string, string>;

  /** Skip rows (e.g., skip first N rows) */
  skipRows?: number;

  /** Delimiter (default: ',') */
  delimiter?: string;

  /** Whether first row is header */
  hasHeader?: boolean;

  /** Trim whitespace from values */
  trimValues?: boolean;

  /** Skip empty lines */
  skipEmptyLines?: boolean;
}

/**
 * Generic CSV Parser
 */
export class CSVParser<T> implements ImportParser<T> {
  type: 'csv' = 'csv';
  private config: CSVParserConfig;

  constructor(config: CSVParserConfig = {}) {
    this.config = {
      hasHeader: true,
      trimValues: true,
      skipEmptyLines: true,
      delimiter: ',',
      ...config,
    };
  }

  async parse(input: File | string): Promise<ParseResult<T>> {
    const startTime = Date.now();

    try {
      // Get CSV text
      const csvText = typeof input === 'string' ? input : await input.text();

      // Parse with PapaParse
      const parseResult = Papa.parse(csvText, {
        header: this.config.hasHeader,
        delimiter: this.config.delimiter,
        skipEmptyLines: this.config.skipEmptyLines ? 'greedy' : false,
        transformHeader: this.config.trimValues ? (header: string) => header.trim() : undefined,
        transform: this.config.trimValues ? (value: string) => value.trim() : undefined,
      });

      if (parseResult.errors.length > 0) {
        const errors = parseResult.errors.map((error) => ({
          row: error.row,
          message: error.message,
        }));

        return {
          items: [],
          errors,
        };
      }

      let data = parseResult.data as any[];

      // Skip rows if configured
      if (this.config.skipRows && this.config.skipRows > 0) {
        data = data.slice(this.config.skipRows);
      }

      // Apply header mapping if configured
      if (this.config.headerMapping) {
        data = data.map((row) => {
          const mapped: any = {};
          Object.entries(row).forEach(([key, value]) => {
            const mappedKey = this.config.headerMapping?.[key] || key;
            mapped[mappedKey] = value;
          });
          return mapped;
        });
      }

      // Validate headers if expected headers provided
      const errors: Array<{ row?: number; message: string }> = [];

      if (this.config.expectedHeaders && data.length > 0) {
        const actualHeaders = Object.keys(data[0]);
        const missingHeaders = this.config.expectedHeaders.filter(
          (h) => !actualHeaders.includes(h)
        );

        if (missingHeaders.length > 0) {
          errors.push({
            message: `Missing required columns: ${missingHeaders.join(', ')}`,
          });
        }
      }

      return {
        items: data as T[],
        errors,
        metadata: {
          rowCount: data.length,
          columnCount: data.length > 0 ? Object.keys(data[0]).length : 0,
          parsingDuration: Date.now() - startTime,
        },
      };
    } catch (error) {
      return {
        items: [],
        errors: [
          {
            message: `CSV parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
      };
    }
  }
}

/**
 * Factory function to create CSV parser
 */
export function createCSVParser<T>(config?: CSVParserConfig): CSVParser<T> {
  return new CSVParser<T>(config);
}
