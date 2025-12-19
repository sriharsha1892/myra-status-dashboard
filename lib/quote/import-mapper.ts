// Import Mapper - AI-assisted column detection and value normalization
import type { ColumnMapping, PipelineStage, SalesPipelineEntry } from './pipeline-types';

// Validation result type
export interface ValidationResult {
  errors: string[];
  warnings: string[];
  isValid: boolean;
}

// Validate email format
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate an entry before import
export function validateEntry(data: Partial<SalesPipelineEntry>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!data.company_name || data.company_name.trim() === '') {
    errors.push('Company name is required');
  }
  if (!data.primary_email || data.primary_email.trim() === '') {
    errors.push('Email is required');
  }

  // Email format validation
  if (data.primary_email && !isValidEmail(data.primary_email)) {
    errors.push('Invalid email format');
  }

  // Validate additional emails if present
  const additionalEmails = [data.email_2, data.email_3, data.email_4].filter(Boolean);
  for (const email of additionalEmails) {
    if (email && !isValidEmail(email)) {
      warnings.push(`Additional email "${email}" appears invalid`);
    }
  }

  // Date logic validation
  if (data.subscription_start_date && data.subscription_end_date) {
    const startDate = new Date(data.subscription_start_date);
    const endDate = new Date(data.subscription_end_date);
    if (endDate < startDate) {
      warnings.push('End date is before start date');
    }
  }

  // Value sanity checks
  if (data.deal_value !== undefined && data.deal_value !== null) {
    if (data.deal_value < 0) {
      errors.push('Deal value cannot be negative');
    }
    if (data.deal_value > 10000000) {
      warnings.push('Unusually high deal value (>$10M)');
    }
  }

  // User count sanity
  if (data.num_users !== undefined && data.num_users !== null) {
    if (data.num_users < 0) {
      errors.push('Number of users cannot be negative');
    }
    if (data.num_users > 10000) {
      warnings.push('Unusually high user count (>10,000)');
    }
  }

  // Consulting hours sanity
  if (data.num_consulting_hours !== undefined && data.num_consulting_hours !== null) {
    if (data.num_consulting_hours < 0) {
      errors.push('Consulting hours cannot be negative');
    }
    if (data.num_consulting_hours > 1000) {
      warnings.push('Unusually high consulting hours (>1,000)');
    }
  }

  return {
    errors,
    warnings,
    isValid: errors.length === 0,
  };
}

// Exact match mappings (case-insensitive)
const EXACT_MAPPINGS: Record<string, string> = {
  // Company info
  'company name': 'company_name',
  'company': 'company_name',
  'client name': 'client_name',
  'contact name': 'client_name',
  'contact': 'client_name',
  'address': 'address',
  'country': 'country',

  // Demo Log specific fields
  'title/role': 'client_title',
  'title/role (primary contact)': 'client_title',
  'title': 'client_title',
  'role': 'client_title',
  'domain': 'industry',
  'industry': 'industry',
  'date': 'demo_date',
  'demo date': 'demo_date',
  'stage': 'stage',
  'deal value': 'deal_value',
  'deal value (total booking amount)': 'deal_value',
  'dealvalue': 'deal_value',
  'closing month': 'expected_close',
  'expected close': 'expected_close',
  'current ai/research tools used': 'current_tools',
  'current tools': 'current_tools',
  'current pain points identified': 'pain_points',
  'pain points': 'pain_points',
  'immediate next steps': 'next_steps',
  'next steps': 'next_steps',
  'date (linked to next steps)': 'next_step_date',
  'next step date': 'next_step_date',
  'demo observations': 'demo_notes',
  'demo notes': 'demo_notes',
  'observations': 'demo_notes',
  'general notes': 'notes',
  'general notes (log feature requests| challenges faced| key notes separately here)': 'notes',

  // Trial tracking fields (from Request for trial licenses sheet)
  'date of request': 'trial_requested_date',
  'trial requested date': 'trial_requested_date',
  'license needed on': 'trial_needed_date',
  'license needed on (mark a specific date if the demo hasn\'t happened yet)': 'trial_needed_date',
  'trial needed date': 'trial_needed_date',
  'license given on': 'trial_given_date',
  'license given on / to be given on (date)': 'trial_given_date',
  'trial given date': 'trial_given_date',
  'current status': 'trial_status',
  'trial status': 'trial_status',
  'current status (as of 22/10/2025)': 'trial_status',
  'comments/ observation from users': 'trial_usage_notes',
  'trial usage notes': 'trial_usage_notes',

  // Sales POC mappings
  'sales poc': 'employee_name',
  'ac': 'employee_name',

  // Original mappings
  'deal id': 'deal_id',
  'dealid': 'deal_id',
  'invoice no': 'invoice_no',
  'invoice number': 'invoice_no',
  'invoice': 'invoice_no',
  'employee name': 'employee_name',
  'am name': 'employee_name',
  'account manager': 'employee_name',
  'employee id': 'employee_id',
  'emp id': 'employee_id',
  'source': 'source',
  'referred by': 'referred_by',
  'referral': 'referred_by',
  'subscription details': 'subscription_details',
  'users': 'num_users',
  'no of users': 'num_users',
  'number of users': 'num_users',
  'num users': 'num_users',
  'billing frequency': 'billing_frequency',
  'payment frequency': 'billing_frequency',
  'consulting hours': 'num_consulting_hours',
  'hours': 'num_consulting_hours',
  'standard cost': 'standard_cost',
  'list price': 'standard_cost',
  'currency': 'currency',
  'gst number': 'gst_number',
  'gst no': 'gst_number',
  'gstin': 'gst_number',
  'gst amount': 'gst_amount',
  'gst': 'gst_amount',
  'mode of payment': 'mode_of_payment',
  'payment mode': 'mode_of_payment',
  'payment terms': 'payment_terms',
  'terms': 'payment_terms',
  'termination terms': 'termination_terms',
  'invoice date': 'invoice_date',
  'month': 'fiscal_month',
  'fiscal month': 'fiscal_month',
  'quarter': 'fiscal_quarter',
  'fiscal quarter': 'fiscal_quarter',
  'notes': 'notes',
  'remarks': 'notes',
  'comments': 'notes',
};

// Pattern-based mappings (regex patterns)
const PATTERN_MAPPINGS: Array<{ pattern: RegExp; field: string | ((match: string) => string) }> = [
  // Email patterns
  { pattern: /^(primary\s*)?email(\s*id)?$/i, field: 'primary_email' },
  { pattern: /client\s*email(\s*\(primary\))?/i, field: 'primary_email' },
  { pattern: /email\s*[-_]?\s*1/i, field: 'primary_email' },
  { pattern: /email\s*[-_]?\s*2/i, field: 'email_2' },
  { pattern: /email\s*id\s*[-_]?\s*1/i, field: 'email_2' },
  { pattern: /email\s*[-_]?\s*3/i, field: 'email_3' },
  { pattern: /email\s*id\s*[-_]?\s*2/i, field: 'email_3' },
  { pattern: /email\s*[-_]?\s*4/i, field: 'email_4' },
  { pattern: /email\s*id\s*[-_]?\s*3/i, field: 'email_4' },

  // Date patterns
  { pattern: /subscription\s*start/i, field: 'subscription_start_date' },
  { pattern: /start\s*date/i, field: 'subscription_start_date' },
  { pattern: /subscription\s*end/i, field: 'subscription_end_date' },
  { pattern: /end\s*date/i, field: 'subscription_end_date' },
  { pattern: /expected\s*start/i, field: 'expected_start_date' },

  // Financial patterns
  { pattern: /deal\s*value\s*\(?\s*inr\s*\)?/i, field: 'deal_value_inr' },
  { pattern: /value\s*inr/i, field: 'deal_value_inr' },
  { pattern: /additional.*hour.*rate/i, field: 'additional_consulting_rate' },
  { pattern: /hourly\s*rate/i, field: 'additional_consulting_rate' },

  // Employee/AM patterns
  { pattern: /employee|emp|am|account\s*manager/i, field: 'employee_name' },

  // Lead/Event patterns
  { pattern: /lead.*event.*id/i, field: 'lead_event_id' },
  { pattern: /event.*id/i, field: 'lead_event_id' },
];

// Calculate string similarity using Levenshtein distance
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
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshteinDistance(a.toLowerCase(), b.toLowerCase()) / maxLen;
}

// Detect the target field for a source column
export function detectColumnMapping(sourceColumn: string): { field: string; confidence: number } | null {
  const normalized = sourceColumn.toLowerCase().trim().replace(/[_-]/g, ' ');

  // 1. Check exact mappings first
  if (EXACT_MAPPINGS[normalized]) {
    return { field: EXACT_MAPPINGS[normalized], confidence: 0.98 };
  }

  // 2. Check pattern mappings
  for (const { pattern, field } of PATTERN_MAPPINGS) {
    if (pattern.test(sourceColumn)) {
      const targetField = typeof field === 'function' ? field(sourceColumn) : field;
      return { field: targetField, confidence: 0.92 };
    }
  }

  // 3. Fuzzy match against known field names
  const fieldNames = Object.values(EXACT_MAPPINGS);
  let bestMatch = { field: '', similarity: 0 };

  for (const fieldName of fieldNames) {
    const sim = similarity(normalized, fieldName.replace(/_/g, ' '));
    if (sim > bestMatch.similarity && sim > 0.6) {
      bestMatch = { field: fieldName, similarity: sim };
    }
  }

  if (bestMatch.field) {
    return { field: bestMatch.field, confidence: Math.round(bestMatch.similarity * 100) / 100 };
  }

  return null;
}

// Auto-detect mappings for all columns
export function autoDetectMappings(sourceColumns: string[]): ColumnMapping[] {
  const mappings: ColumnMapping[] = [];
  const usedTargets = new Set<string>();

  for (const sourceColumn of sourceColumns) {
    const detected = detectColumnMapping(sourceColumn);

    if (detected && !usedTargets.has(detected.field)) {
      mappings.push({
        sourceColumn,
        targetField: detected.field,
        confidence: detected.confidence,
        isManualOverride: false,
      });
      usedTargets.add(detected.field);
    } else {
      // No mapping found - will go to extra_data
      mappings.push({
        sourceColumn,
        targetField: '',
        confidence: 0,
        isManualOverride: false,
      });
    }
  }

  return mappings;
}

// Normalize values during import
export function normalizeValue(value: unknown, targetField: string): unknown {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const strValue = String(value).trim();

  // Stage field - use dedicated normalizer
  if (targetField === 'stage') {
    return normalizeStage(strValue);
  }

  // Trial status field - use dedicated normalizer
  if (targetField === 'trial_status') {
    return normalizeTrialStatus(strValue);
  }

  // Date fields (including new ones)
  const dateFields = [
    'demo_date', 'next_step_date', 'trial_requested_date', 'trial_needed_date',
    'trial_given_date', 'subscription_start_date', 'subscription_end_date',
    'expected_start_date', 'invoice_date', 'trial_start_date', 'trial_end_date'
  ];
  if (dateFields.includes(targetField) || targetField === 'fiscal_month') {
    return normalizeDate(strValue);
  }

  // Numeric fields
  const numericFields = [
    'num_users', 'num_consulting_hours', 'standard_cost', 'deal_value',
    'deal_value_inr', 'gst_amount', 'additional_consulting_rate'
  ];
  if (numericFields.includes(targetField)) {
    return normalizeNumber(strValue);
  }

  // Payment terms normalization
  if (targetField === 'payment_terms') {
    return normalizePaymentTerms(strValue);
  }

  // Currency normalization
  if (targetField === 'currency') {
    return normalizeCurrency(strValue);
  }

  // Email normalization
  if (targetField.includes('email')) {
    return normalizeEmail(strValue);
  }

  // Boolean fields
  if (targetField === 'gst_applicable' || targetField === 'consulting_hours_included') {
    return normalizeBoolean(strValue);
  }

  return strValue;
}

function normalizeDate(value: string): string | null {
  if (!value) return null;

  // Try various date formats
  const formats = [
    // ISO format
    /^(\d{4})-(\d{2})-(\d{2})$/,
    // DD/MM/YYYY or DD-MM-YYYY
    /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/,
    // MM/DD/YYYY or MM-DD-YYYY
    /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/,
    // DD MMM YYYY
    /^(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})$/,
  ];

  // Try parsing as Date
  const date = new Date(value);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }

  // For month-only values like "January 2025"
  const monthMatch = value.match(/^([A-Za-z]+)\s*(\d{4})$/);
  if (monthMatch) {
    const month = new Date(`${monthMatch[1]} 1, ${monthMatch[2]}`);
    if (!isNaN(month.getTime())) {
      return month.toISOString().split('T')[0];
    }
  }

  return value; // Return as-is if can't parse
}

function normalizeNumber(value: string): number | null {
  if (!value) return null;

  // Remove currency symbols, commas, spaces
  const cleaned = value.replace(/[$€£₹,\s]/g, '').replace(/[()]/g, '');

  // Handle Indian lakh/crore notation
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function normalizePaymentTerms(value: string): string {
  const upper = value.toUpperCase().replace(/\s+/g, '');

  const termMappings: Record<string, string> = {
    'IMMEDIATE': 'Immediate',
    '100%ADVANCE': 'Immediate',
    'NET15': 'NET 15',
    'NET30': 'NET 30',
    'NET-30': 'NET 30',
    'NET45': 'NET 45',
    'NET60': 'NET 60',
    'NET-60': 'NET 60',
    'NET90': 'NET 90',
    'NET-90': 'NET 90',
  };

  return termMappings[upper] || value;
}

function normalizeCurrency(value: string): string {
  const upper = value.toUpperCase().trim();

  const currencyMappings: Record<string, string> = {
    '$': 'USD',
    'DOLLAR': 'USD',
    'DOLLARS': 'USD',
    'US$': 'USD',
    'USD': 'USD',
    '€': 'EUR',
    'EURO': 'EUR',
    'EUROS': 'EUR',
    'EUR': 'EUR',
    '£': 'GBP',
    'POUND': 'GBP',
    'POUNDS': 'GBP',
    'GBP': 'GBP',
    '₹': 'INR',
    'RUPEE': 'INR',
    'RUPEES': 'INR',
    'INR': 'INR',
    'RS': 'INR',
    'RS.': 'INR',
  };

  return currencyMappings[upper] || 'USD';
}

function normalizeEmail(value: string): string | null {
  if (!value) return null;

  const email = value.toLowerCase().trim();

  // Basic email validation
  if (email.includes('@') && email.includes('.')) {
    return email;
  }

  return null;
}

function normalizeBoolean(value: string): boolean {
  const lower = value.toLowerCase().trim();
  return ['yes', 'true', '1', 'y', 'applicable'].includes(lower);
}

// Valid pipeline stages (matching Demo Log workflow)
const VALID_STAGES = ['intro', 'demo', 'pending_trial', 'trial', 'feedback', 'proposal', 'nego', 'won', 'lost'];

// Normalize stage value from import
export function normalizeStage(value: string | undefined | null): PipelineStage {
  if (!value) return 'intro';

  const normalized = value.toLowerCase().trim().replace(/[_\s]+/g, '_');

  // Direct matches
  if (VALID_STAGES.includes(normalized)) {
    return normalized as PipelineStage;
  }

  // Common variations
  const stageMap: Record<string, PipelineStage> = {
    'pending trial': 'pending_trial',
    'pending_trial': 'pending_trial',
    'pendingtrial': 'pending_trial',
    'feedback call': 'feedback',
    'feedback_call': 'feedback',
    'feedbackcall': 'feedback',
    'negotiation': 'nego',
    'negotiating': 'nego',
    'closed won': 'won',
    'closed_won': 'won',
    'closed': 'won',
    'closed lost': 'lost',
    'closed_lost': 'lost',
    'prospect': 'intro',
    'lead': 'intro',
    'new': 'intro',
    'quote': 'proposal',
    'quoted': 'proposal',
    'msa': 'nego',
    'onboarded': 'won',
  };

  return stageMap[normalized] || 'intro';
}

// Valid trial statuses
const VALID_TRIAL_STATUSES = ['not_requested', 'requested', 'scheduled', 'active', 'inactive', 'expired'];

// Normalize trial status from import
export function normalizeTrialStatus(value: string | undefined | null): string {
  if (!value) return 'not_requested';

  const normalized = value.toLowerCase().trim();

  // Direct matches
  if (VALID_TRIAL_STATUSES.includes(normalized)) {
    return normalized;
  }

  // Common variations from "Current Status" column
  const statusMap: Record<string, string> = {
    'active - logged in and using': 'active',
    'active': 'active',
    'inactive - access shared and not logged in': 'inactive',
    'inactive': 'inactive',
    'yet to schedule the demo': 'not_requested',
    'demo given': 'scheduled',
    'trial license needed': 'requested',
    'follow-up needed': 'requested',
    'user not responding': 'inactive',
    'expired': 'expired',
  };

  // Check if it contains key phrases
  if (normalized.includes('logged in') && normalized.includes('using')) {
    return 'active';
  }
  if (normalized.includes('not logged in') || normalized.includes('not using')) {
    return 'inactive';
  }
  if (normalized.includes('demo given') || normalized.includes('license given')) {
    return 'scheduled';
  }

  return statusMap[normalized] || 'not_requested';
}

// Detect pipeline stage from imported data
export function detectStage(data: Partial<SalesPipelineEntry>): PipelineStage {
  // If stage is explicitly set, normalize and return it
  if (data.stage) {
    return normalizeStage(data.stage);
  }

  // Has subscription end date in future + payment received = won
  if (data.subscription_end_date && data.mode_of_payment) {
    const endDate = new Date(data.subscription_end_date);
    if (endDate > new Date()) {
      return 'won';
    }
  }

  // Has MSA reference or msa_id = nego
  if (data.msa_id) {
    return 'nego';
  }

  // Has invoice number or significant deal value = proposal
  if (data.invoice_no || (data.deal_value && data.deal_value > 0)) {
    return 'proposal';
  }

  // Has trial dates = trial
  if (data.subscription_start_date && !data.invoice_no) {
    return 'trial';
  }

  // Has demo date = demo
  if ((data as Record<string, unknown>).demo_date) {
    return 'demo';
  }

  // Default = intro
  return 'intro';
}

// Parse CSV/TSV data
export function parseDelimitedData(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  // Detect delimiter (tab or comma)
  const firstLine = lines[0];
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const delimiter = tabCount > commaCount ? '\t' : ',';

  // Parse headers
  const headers = parseCSVLine(lines[0], delimiter);

  // Parse data rows
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCSVLine(line, delimiter);
    const row: Record<string, string> = {};

    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] || '';
    }

    rows.push(row);
  }

  return { headers, rows };
}

// Parse a single CSV/TSV line, handling quoted fields
function parseCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

// Apply mappings to a row of data
export function applyMappings(
  row: Record<string, string>,
  mappings: ColumnMapping[]
): { mapped: Partial<SalesPipelineEntry>; extra: Record<string, unknown> } {
  const mapped: Partial<SalesPipelineEntry> = {};
  const extra: Record<string, unknown> = {};

  for (const mapping of mappings) {
    const value = row[mapping.sourceColumn];

    if (mapping.targetField) {
      // Map to known field
      const normalizedValue = normalizeValue(value, mapping.targetField);
      if (normalizedValue !== null) {
        (mapped as Record<string, unknown>)[mapping.targetField] = normalizedValue;
      }
    } else if (value) {
      // Store in extra_data
      extra[mapping.sourceColumn] = value;
    }
  }

  return { mapped, extra };
}
