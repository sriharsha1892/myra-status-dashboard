/**
 * Excel Parser for Bulk Import Framework
 *
 * Handles Excel file parsing (.xlsx, .xls)
 * Used by:
 * - Excel Organizations Import
 * - Any Excel-based imports
 */

import * as XLSX from 'xlsx';
import { ImportParser, ParseResult } from '../BulkImportFramework';

export interface ExcelParserConfig {
  /** Sheet name to parse (default: first sheet) */
  sheetName?: string;

  /** Sheet index to parse (default: 0) */
  sheetIndex?: number;

  /** Expected headers (for validation) */
  expectedHeaders?: string[];

  /** Header mapping (Excel header → field name) */
  headerMapping?: Record<string, string>;

  /** Skip rows (e.g., skip first N rows) */
  skipRows?: number;

  /** Date format (for Excel serial dates) */
  dateFormat?: string;

  /** Trim whitespace from values */
  trimValues?: boolean;

  /** Skip empty rows */
  skipEmptyRows?: boolean;
}

/**
 * Generic Excel Parser
 */
export class ExcelParser<T> implements ImportParser<T> {
  type: 'excel' = 'excel';
  private config: ExcelParserConfig;

  constructor(config: ExcelParserConfig = {}) {
    this.config = {
      sheetIndex: 0,
      trimValues: true,
      skipEmptyRows: true,
      ...config,
    };
  }

  async parse(input: File | string): Promise<ParseResult<T>> {
    const startTime = Date.now();

    try {
      // Read file
      const buffer = typeof input === 'string'
        ? Buffer.from(input, 'base64')
        : await input.arrayBuffer();

      // Parse workbook
      const workbook = XLSX.read(buffer, {
        type: typeof input === 'string' ? 'buffer' : 'array',
        cellDates: true, // Auto-convert Excel dates
      });

      // Select sheet
      let sheet: XLSX.WorkSheet;

      if (this.config.sheetName) {
        sheet = workbook.Sheets[this.config.sheetName];
        if (!sheet) {
          return {
            items: [],
            errors: [{ message: `Sheet "${this.config.sheetName}" not found` }],
          };
        }
      } else {
        const sheetName = workbook.SheetNames[this.config.sheetIndex || 0];
        sheet = workbook.Sheets[sheetName];
      }

      // Convert to JSON
      let data = XLSX.utils.sheet_to_json(sheet, {
        raw: false, // Convert everything to strings
        defval: '', // Default value for empty cells
      }) as any[];

      // Skip rows if configured
      if (this.config.skipRows && this.config.skipRows > 0) {
        data = data.slice(this.config.skipRows);
      }

      // Trim values if configured
      if (this.config.trimValues) {
        data = data.map((row) => {
          const trimmed: any = {};
          Object.entries(row).forEach(([key, value]) => {
            trimmed[key.trim()] = typeof value === 'string' ? value.trim() : value;
          });
          return trimmed;
        });
      }

      // Skip empty rows if configured
      if (this.config.skipEmptyRows) {
        data = data.filter((row) => {
          return Object.values(row).some((value) => value !== '' && value !== null);
        });
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
            message: `Excel parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
      };
    }
  }
}

/**
 * Factory function to create Excel parser
 */
export function createExcelParser<T>(config?: ExcelParserConfig): ExcelParser<T> {
  return new ExcelParser<T>(config);
}
