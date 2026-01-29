/**
 * Fuzzy Company Matcher
 * Matches Excel company names to existing database records using string similarity
 */

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculate similarity score (0-100) between two strings
 */
export function calculateSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;

  const strA = normalizeCompanyName(a);
  const strB = normalizeCompanyName(b);

  // If both normalize to empty strings, return 0 (not 100)
  // This prevents false positives like "Corp Inc" vs "Ltd LLC"
  if (strA.length === 0 && strB.length === 0) return 0;

  if (strA === strB) return 100;

  const maxLen = Math.max(strA.length, strB.length);
  if (maxLen === 0) return 0;

  const distance = levenshteinDistance(strA, strB);
  return Math.round((1 - distance / maxLen) * 100);
}

/**
 * Normalize company name for comparison
 * - Lowercase
 * - Remove common suffixes (Inc, Corp, Ltd, etc.)
 * - Remove special characters
 * - Trim whitespace
 */
export function normalizeCompanyName(name: string): string {
  if (!name) return '';

  return name
    .toLowerCase()
    .replace(/\b(inc|corp|corporation|ltd|limited|llc|llp|pvt|private|gmbh|ag|sa|srl|bv|nv)\b\.?/gi, '')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface DbRecord {
  id: string;
  company_name: string;
  primary_email?: string;
  stage?: string;
  deal_value?: number;
  employee_name?: string;
  [key: string]: unknown;
}

export interface MatchResult {
  excelRowIndex: number;
  excelCompanyName: string;
  matchType: 'exact' | 'fuzzy' | 'none';
  matches: Array<{
    dbRecord: DbRecord;
    similarity: number;
    matchedBy: 'company_name' | 'email' | 'both';
  }>;
  suggestedMatch: DbRecord | null;
}

/**
 * Find potential matches for an Excel company name in the database
 */
export function findMatches(
  excelCompanyName: string,
  excelEmail: string | null,
  dbRecords: DbRecord[],
  topN: number = 3
): MatchResult['matches'] {
  const matches: MatchResult['matches'] = [];

  for (const record of dbRecords) {
    let similarity = 0;
    let matchedBy: 'company_name' | 'email' | 'both' = 'company_name';

    // Check company name similarity
    const nameSimilarity = calculateSimilarity(excelCompanyName, record.company_name);

    // Check email match
    const emailMatch =
      excelEmail &&
      record.primary_email &&
      excelEmail.toLowerCase() === record.primary_email.toLowerCase();

    if (emailMatch && nameSimilarity >= 50) {
      similarity = Math.max(nameSimilarity, 95); // Email match boosts confidence
      matchedBy = 'both';
    } else if (emailMatch && nameSimilarity >= 30) {
      // Email match with some name similarity - moderate confidence
      similarity = 70;
      matchedBy = 'email';
    } else if (emailMatch) {
      // Email-only match without name similarity - reduced confidence to prevent false positives
      // Require at least 30% name similarity to qualify as a match
      continue; // Skip this record - email alone is not reliable enough
    } else {
      similarity = nameSimilarity;
      matchedBy = 'company_name';
    }

    if (similarity >= 50) {
      matches.push({
        dbRecord: record,
        similarity,
        matchedBy,
      });
    }
  }

  // Sort by similarity descending and return top N
  return matches
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topN);
}

/**
 * Match all Excel rows against database records
 */
export function matchExcelToDb(
  excelRows: Array<{ company_name: string; email?: string; [key: string]: unknown }>,
  dbRecords: DbRecord[]
): MatchResult[] {
  return excelRows.map((row, index) => {
    const matches = findMatches(
      row.company_name,
      row.email || null,
      dbRecords
    );

    let matchType: MatchResult['matchType'] = 'none';
    let suggestedMatch: DbRecord | null = null;

    if (matches.length > 0) {
      if (matches[0].similarity === 100) {
        matchType = 'exact';
      } else if (matches[0].similarity >= 70) {
        matchType = 'fuzzy';
      }
      suggestedMatch = matches[0].dbRecord;
    }

    return {
      excelRowIndex: index,
      excelCompanyName: row.company_name,
      matchType,
      matches,
      suggestedMatch,
    };
  });
}

export interface FieldDiff {
  field: string;
  label: string;
  excelValue: unknown;
  dbValue: unknown;
  resolution: 'keep_db' | 'use_excel' | 'pending';
}

/**
 * Compare Excel row with matched DB record and find differences
 */
export function compareRecords(
  excelRow: Record<string, unknown>,
  dbRecord: DbRecord,
  fieldMappings: Array<{ excelField: string; dbField: string; label: string }>
): FieldDiff[] {
  const diffs: FieldDiff[] = [];

  for (const mapping of fieldMappings) {
    const excelValue = excelRow[mapping.excelField];
    const dbValue = dbRecord[mapping.dbField];

    // Normalize for comparison
    const normalizedExcel = normalizeValue(excelValue);
    const normalizedDb = normalizeValue(dbValue);

    if (normalizedExcel !== normalizedDb && (normalizedExcel || normalizedDb)) {
      diffs.push({
        field: mapping.dbField,
        label: mapping.label,
        excelValue,
        dbValue,
        resolution: 'pending',
      });
    }
  }

  return diffs;
}

/**
 * Normalize value for comparison
 */
function normalizeValue(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  if (typeof value === 'number') {
    return value.toString();
  }

  if (typeof value === 'string') {
    return value.toLowerCase().trim();
  }

  return JSON.stringify(value);
}

/**
 * Field mappings for Excel to DB comparison
 */
export const FIELD_MAPPINGS = [
  { excelField: 'stage', dbField: 'stage', label: 'Stage' },
  { excelField: 'demo_status', dbField: 'demo_status', label: 'Demo Status' },
  { excelField: 'deal_value', dbField: 'deal_value', label: 'Deal Value' },
  { excelField: 'sales_poc', dbField: 'employee_name', label: 'Sales POC' },
  { excelField: 'contact_email', dbField: 'primary_email', label: 'Email' },
  { excelField: 'contact_title', dbField: 'contact_title', label: 'Title/Role' },
  { excelField: 'domain', dbField: 'domain', label: 'Domain' },
  { excelField: 'closing_month', dbField: 'expected_close', label: 'Closing Month' },
];
