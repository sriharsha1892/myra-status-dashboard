/**
 * Field Normalizer - Handles synonym mapping and value normalization
 *
 * Transparently converts AI-extracted fields to canonical names and formats,
 * reducing parsing failures from synonym confusion.
 */

import type { ParsedCommand } from './types';

// ============ FIELD ALIASES ============

/**
 * Map commonly confused field names to canonical versions
 */
const FIELD_ALIASES: Record<string, string> = {
  // Value fields → deal_value
  'contract_value': 'deal_value',
  'price': 'deal_value',
  'amount': 'deal_value',
  'value': 'deal_value',
  'contract': 'deal_value',
  'deal_amount': 'deal_value',
  'pricing': 'deal_value',

  // Status synonyms → deal_status
  'status': 'deal_status',
  'deal': 'deal_status',
};

/**
 * Map status value synonyms to canonical values
 */
const STATUS_ALIASES: Record<string, string> = {
  // Won synonyms
  'closed': 'won',
  'signed': 'won',
  'converted': 'won',
  'closed_won': 'won',
  'deal_closed': 'won',

  // Lost synonyms
  'churned': 'lost',
  'cancelled': 'lost',
  'canceled': 'lost',
  'closed_lost': 'lost',
  'declined': 'lost',
  'rejected': 'lost',

  // Negotiating synonyms
  'negotiation': 'negotiating',
  'in_progress': 'negotiating',
  'active': 'negotiating',
  'discussing': 'negotiating',

  // Pending synonyms
  'new': 'pending',
  'prospect': 'pending',
  'lead': 'pending',
};

/**
 * Map action synonyms (for "wrong action" detection)
 */
const ACTION_SYNONYMS: Record<string, string[]> = {
  'DELETE_ORG': ['remove', 'delete', 'trash', 'eliminate', 'get rid of'],
  'UPDATE_DEAL': ['deal', 'won', 'lost', 'contract', 'pricing', 'value'],
  'UPDATE_STAGE': ['stage', 'trial', 'customer', 'convert', 'lifecycle'],
  'ADD_NOTE': ['note', 'comment', 'observation', 'memo'],
  'LOG_ACTIVITY': ['log', 'activity', 'query', 'login', 'demo', 'call', 'meeting'],

  // Prospect lifecycle actions
  'CREATE_PROSPECT_ORG': ['add prospect', 'new prospect', 'cold lead', 'prospect org', 'create prospect'],
  'ADD_PROSPECT_CONTACT': ['add contact', 'new contact', 'prospect contact'],
  'LOG_OUTREACH': ['sent email', 'emailed', 'called', 'reached out', 'linkedin', 'dm'],
  'LOG_RESPONSE': ['replied', 'responded', 'got back', 'heard back', 'response'],
  'LOG_SCREENING': ['screened', 'qualified', 'icp', 'screening'],
  'UPDATE_PROSPECT_STAGE': ['move prospect', 'prospect stage', 'demo scheduled'],
  'DISQUALIFY_PROSPECT': ['disqualify', 'not a fit', 'bad fit', 'unqualify'],
  'CONVERT_TO_TRIAL': ['start trial', 'begin trial', 'convert to trial', 'trial started'],

  // Deal outcome actions
  'UPDATE_DEAL_STAGE': ['deal stage', 'evaluation', 'negotiation'],
  'CLOSE_DEAL_WON': ['deal won', 'closed won', 'signed', 'became customer'],
  'CLOSE_DEAL_LOST': ['deal lost', 'closed lost', 'went elsewhere', 'competitor'],
  'DEFER_DEAL': ['defer', 'push back', 'revisit later', 'maybe later'],
};

/**
 * Map prospect stage synonyms to canonical values
 */
const PROSPECT_STAGE_ALIASES: Record<string, string> = {
  'new': 'cold_lead',
  'cold': 'cold_lead',
  'initial': 'cold_lead',
  'reached_out': 'contacted',
  'emailed': 'contacted',
  'replied': 'responded',
  'answered': 'responded',
  'qualifying': 'screening',
  'qualified': 'screening',
  'icp_check': 'screening',
  'demo_booked': 'demo_scheduled',
  'meeting_scheduled': 'demo_scheduled',
  'demo_complete': 'demo_done',
  'demo_completed': 'demo_done',
  'not_a_fit': 'disqualified',
  'bad_fit': 'disqualified',
  'unqualified': 'disqualified',
};

/**
 * Map response status synonyms
 */
const RESPONSE_STATUS_ALIASES: Record<string, string> = {
  'none': 'no_response',
  'no_reply': 'no_response',
  'interested': 'positive',
  'good': 'positive',
  'not_interested': 'negative',
  'bad': 'negative',
  'declined': 'negative',
  'maybe': 'neutral',
  'waiting': 'pending',
  'tbd': 'pending',
};

/**
 * Map outreach type synonyms
 */
const OUTREACH_TYPE_ALIASES: Record<string, string> = {
  'email': 'email_sent',
  'sent_email': 'email_sent',
  'received_email': 'email_received',
  'phone': 'call',
  'phone_call': 'call',
  'called': 'call',
  'linkedin_message': 'linkedin',
  'dm': 'linkedin',
  'inmail': 'linkedin',
  'met': 'meeting',
  'in_person': 'meeting',
};

/**
 * Map deal pipeline stage synonyms
 */
const DEAL_STAGE_ALIASES: Record<string, string> = {
  'evaluating': 'evaluation',
  'in_trial': 'evaluation',
  'expired': 'trial_expired',
  'trial_ended': 'trial_expired',
  'negotiating': 'negotiation',
  'contract': 'negotiation',
  'pricing': 'negotiation',
  'done': 'closed',
  'finished': 'closed',
};

// ============ VALUE PARSING ============

/**
 * Parse various money formats to a number
 * Handles: 76000, "76000", "$76,000", "76K", "$76k", "1.2M", etc.
 */
export function parseMoneyValue(value: string | number): number | null {
  if (typeof value === 'number') {
    return value;
  }

  if (!value || typeof value !== 'string') {
    return null;
  }

  // Remove currency symbols, commas, spaces
  let cleaned = value.replace(/[$,\s]/g, '').toLowerCase();

  // Handle K/M/B suffixes
  let multiplier = 1;
  if (cleaned.endsWith('k')) {
    multiplier = 1000;
    cleaned = cleaned.slice(0, -1);
  } else if (cleaned.endsWith('m')) {
    multiplier = 1000000;
    cleaned = cleaned.slice(0, -1);
  } else if (cleaned.endsWith('b')) {
    multiplier = 1000000000;
    cleaned = cleaned.slice(0, -1);
  }

  const parsed = parseFloat(cleaned);
  if (isNaN(parsed)) {
    return null;
  }

  return Math.round(parsed * multiplier);
}

// ============ NORMALIZATION ============

/**
 * Normalize a single field name
 */
function normalizeFieldName(name: string): string {
  const lower = name.toLowerCase();
  return FIELD_ALIASES[lower] || name;
}

/**
 * Normalize a status value
 */
function normalizeStatusValue(value: string): string {
  const lower = value.toLowerCase().trim();
  return STATUS_ALIASES[lower] || value;
}

/**
 * Normalize parsed command fields
 * - Maps field name synonyms to canonical names
 * - Normalizes status values
 * - Parses money strings to numbers
 */
export function normalizeFields(fields: Record<string, any>): Record<string, any> {
  const normalized: Record<string, any> = {};

  for (const [key, value] of Object.entries(fields)) {
    const normalizedKey = normalizeFieldName(key);

    // Handle value based on field type
    if (normalizedKey === 'deal_value' && value !== undefined) {
      const parsed = parseMoneyValue(value);
      if (parsed !== null) {
        normalized[normalizedKey] = parsed;
      }
    } else if (normalizedKey === 'deal_status' && typeof value === 'string') {
      normalized[normalizedKey] = normalizeStatusValue(value);
    } else if (normalizedKey === 'prospect_stage' && typeof value === 'string') {
      // Normalize prospect stage aliases
      const lowerValue = value.toLowerCase().replace(/\s+/g, '_');
      normalized[normalizedKey] = PROSPECT_STAGE_ALIASES[lowerValue] || value;
    } else if (normalizedKey === 'response_status' && typeof value === 'string') {
      // Normalize response status aliases
      const lowerValue = value.toLowerCase().replace(/\s+/g, '_');
      normalized[normalizedKey] = RESPONSE_STATUS_ALIASES[lowerValue] || value;
    } else if (normalizedKey === 'outreach_type' && typeof value === 'string') {
      // Normalize outreach type aliases
      const lowerValue = value.toLowerCase().replace(/\s+/g, '_');
      normalized[normalizedKey] = OUTREACH_TYPE_ALIASES[lowerValue] || value;
    } else if (normalizedKey === 'deal_pipeline_stage' && typeof value === 'string') {
      // Normalize deal pipeline stage aliases
      const lowerValue = value.toLowerCase().replace(/\s+/g, '_');
      normalized[normalizedKey] = DEAL_STAGE_ALIASES[lowerValue] || value;
    } else if (normalizedKey === 'icp_fit_score' && value !== undefined) {
      // Ensure ICP score is a number between 0-100
      const score = typeof value === 'number' ? value : parseInt(String(value), 10);
      if (!isNaN(score)) {
        normalized[normalizedKey] = Math.max(0, Math.min(100, score));
      }
    } else if (value !== undefined && value !== null) {
      // Check if this is a misplaced value that should be deal_value
      if (typeof value === 'number' && !normalized.deal_value &&
          (key === 'contract_value' || key === 'value' || key === 'amount')) {
        normalized.deal_value = value;
      } else {
        normalized[normalizedKey] = value;
      }
    }
  }

  return normalized;
}

/**
 * Full normalization of a parsed command
 */
export function normalizeParsedCommand(parsed: ParsedCommand): ParsedCommand {
  return {
    ...parsed,
    fields: normalizeFields(parsed.fields),
  };
}

/**
 * Detect if the wrong action might have been parsed
 * Returns suggested alternative actions
 */
export function detectActionMismatch(
  input: string,
  parsedAction: string
): { likely: boolean; alternatives: string[] } {
  const lowerInput = input.toLowerCase();
  const alternatives: string[] = [];

  for (const [action, keywords] of Object.entries(ACTION_SYNONYMS)) {
    if (action === parsedAction) continue;

    const hasKeyword = keywords.some(kw => lowerInput.includes(kw));
    if (hasKeyword) {
      alternatives.push(action);
    }
  }

  // Check for specific mismatches

  // "remove/delete" should be DELETE_*, not UPDATE_*
  if ((lowerInput.includes('remove') || lowerInput.includes('delete')) &&
      parsedAction.startsWith('UPDATE')) {
    return { likely: true, alternatives: ['DELETE_ORG', 'DELETE_USER'] };
  }

  // "won/lost" with value should be UPDATE_DEAL, not UPDATE_STAGE
  if ((lowerInput.includes('won') || lowerInput.includes('lost')) &&
      (lowerInput.match(/\$?\d+[kKmM]?/) || lowerInput.includes('value') || lowerInput.includes('contract')) &&
      parsedAction === 'UPDATE_STAGE') {
    return { likely: true, alternatives: ['UPDATE_DEAL'] };
  }

  return { likely: alternatives.length > 0, alternatives };
}

/**
 * Extract implicit fields that might be missing
 * e.g., "won with $50K" should have both deal_status and deal_value
 */
export function extractImplicitFields(
  input: string,
  fields: Record<string, any>
): Record<string, any> {
  const lowerInput = input.toLowerCase();
  const enhanced = { ...fields };

  // If input mentions "won" or "lost" but no deal_status, add it
  if (!enhanced.deal_status) {
    if (lowerInput.includes(' won') || lowerInput.includes('won ') ||
        lowerInput.includes('deal won') || lowerInput.includes('as won')) {
      enhanced.deal_status = 'won';
    } else if (lowerInput.includes(' lost') || lowerInput.includes('lost ') ||
               lowerInput.includes('deal lost') || lowerInput.includes('as lost')) {
      enhanced.deal_status = 'lost';
    }
  }

  // If input has a money value but no deal_value, extract it
  if (enhanced.deal_value === undefined) {
    const moneyMatch = input.match(/\$?([\d,]+(?:\.\d+)?)\s*[kKmM]?(?:\s|$)/);
    if (moneyMatch) {
      const parsed = parseMoneyValue(moneyMatch[0]);
      if (parsed !== null && parsed > 100) { // Assume values > 100 are money
        enhanced.deal_value = parsed;
      }
    }
  }

  return enhanced;
}

export default {
  normalizeFields,
  normalizeParsedCommand,
  parseMoneyValue,
  detectActionMismatch,
  extractImplicitFields,
};
