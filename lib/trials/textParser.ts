/**
 * Text Intelligence Parser
 * Extract structured data from unstructured text using regex and patterns
 * NO EXTERNAL AI DEPENDENCIES - Pure rule-based parsing
 */

import { parse as parseDate, isValid } from 'date-fns';
import { findTerminologyMatch, findAllMatches } from './terminology';
import * as fuzz from 'fuzzball';

export interface ParsedEntity {
  type: 'org' | 'user' | 'activity' | 'date' | 'number' | 'feature' | 'model';
  value: string;
  confidence: number; // 0-100
  metadata?: Record<string, any>;
  position?: { start: number; end: number };
}

export interface ParsedData {
  orgs: ParsedEntity[];
  users: ParsedEntity[];
  activities: ParsedEntity[];
  dates: ParsedEntity[];
  numbers: ParsedEntity[];
  features: ParsedEntity[];
  models: ParsedEntity[];
  raw_text: string;
  overall_confidence: number;
}

// Common patterns
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
const PHONE_REGEX = /\b(?:\+?1[-.]?)?\(?([0-9]{3})\)?[-.]?([0-9]{3})[-.]?([0-9]{4})\b/g;
const NUMBER_PATTERN = /\b(\d+)\s*(users?|questions?|queries|logins?|tickets?|days?|weeks?)\b/gi;
const URL_REGEX = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;

// Date format patterns to try
const DATE_FORMATS = [
  'yyyy-MM-dd',
  'MM/dd/yyyy',
  'dd/MM/yyyy',
  'MMM dd, yyyy',
  'MMMM dd, yyyy',
  'dd MMM yyyy',
  'yyyy/MM/dd'
];

/**
 * Extract email addresses from text
 */
export function extractEmails(text: string): ParsedEntity[] {
  const emails = text.match(EMAIL_REGEX) || [];
  return emails.map(email => ({
    type: 'user' as const,
    value: email,
    confidence: 95, // Email regex is very accurate
    metadata: { email, source: 'regex_email' }
  }));
}

/**
 * Extract phone numbers from text
 */
export function extractPhones(text: string): string[] {
  const phones = text.match(PHONE_REGEX) || [];
  return phones.map(p => p.replace(/\D/g, ''));
}

/**
 * Extract potential organization names
 * Heuristic: Capitalized multi-word phrases, often near "from", "at", "for", etc.
 */
export function extractOrgNames(text: string): ParsedEntity[] {
  const orgs: ParsedEntity[] = [];

  // Pattern 1: "from/at/for [Company Name]"
  const contextPattern = /(?:from|at|for|with)\s+([A-Z][A-Za-z0-9\s&.,-]{2,40}?)(?:\s|,|\.|\n|$)/g;
  let match;

  while ((match = contextPattern.exec(text)) !== null) {
    const orgName = match[1].trim();
    // Filter out common false positives
    if (!['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].includes(orgName)) {
      orgs.push({
        type: 'org',
        value: orgName,
        confidence: 75,
        metadata: { source: 'context_pattern' },
        position: { start: match.index, end: match.index + match[0].length }
      });
    }
  }

  // Pattern 2: Capitalized phrase at start of sentence
  const sentences = text.split(/[.!?\n]+/);
  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    const capitalizedMatch = /^([A-Z][A-Za-z0-9\s&.,-]{2,40}?)\s+(has|had|is|was|will|wants?|needs?|asked)/i.exec(trimmed);

    if (capitalizedMatch) {
      const orgName = capitalizedMatch[1].trim();
      orgs.push({
        type: 'org',
        value: orgName,
        confidence: 65,
        metadata: { source: 'sentence_start' }
      });
    }
  }

  // Deduplicate and return highest confidence for each unique org
  const uniqueOrgs = new Map<string, ParsedEntity>();
  for (const org of orgs) {
    const normalized = org.value.toLowerCase();
    if (!uniqueOrgs.has(normalized) || uniqueOrgs.get(normalized)!.confidence < org.confidence) {
      uniqueOrgs.set(normalized, org);
    }
  }

  return Array.from(uniqueOrgs.values());
}

/**
 * Extract person names from text
 * Looks for patterns like "John Doe", "Jane Smith attended", etc.
 */
export function extractPersonNames(text: string): ParsedEntity[] {
  const names: ParsedEntity[] = [];

  // Pattern: [FirstName LastName] (action verb)
  const namePattern = /\b([A-Z][a-z]+)\s+([A-Z][a-z]+)\s+(attended|joined|asked|said|mentioned|is|was)\b/g;
  let match;

  while ((match = namePattern.exec(text)) !== null) {
    const fullName = `${match[1]} ${match[2]}`;
    names.push({
      type: 'user',
      value: fullName,
      confidence: 70,
      metadata: {
        firstName: match[1],
        lastName: match[2],
        source: 'name_pattern'
      },
      position: { start: match.index, end: match.index + fullName.length }
    });
  }

  return names;
}

/**
 * Extract dates from text
 */
export function extractDates(text: string): ParsedEntity[] {
  const dates: ParsedEntity[] = [];

  // Try each date format
  const words = text.split(/\s+/);
  for (let i = 0; i < words.length; i++) {
    // Try 1-3 word combinations for dates
    for (let len = 1; len <= 3 && i + len <= words.length; len++) {
      const dateStr = words.slice(i, i + len).join(' ');

      for (const format of DATE_FORMATS) {
        const parsed = parseDate(dateStr, format, new Date());
        if (isValid(parsed)) {
          dates.push({
            type: 'date',
            value: parsed.toISOString(),
            confidence: 85,
            metadata: {
              original: dateStr,
              format,
              source: 'date_parser'
            }
          });
          break; // Found valid date, move on
        }
      }
    }
  }

  // Relative dates: "tomorrow", "next week", "yesterday"
  const relativePattern = /(today|tomorrow|yesterday|next\s+week|last\s+week|next\s+month)/gi;
  const relativeMatches = text.match(relativePattern) || [];

  for (const rel of relativeMatches) {
    const normalized = rel.toLowerCase().replace(/\s+/g, '_');
    dates.push({
      type: 'date',
      value: rel,
      confidence: 70,
      metadata: {
        relative: normalized,
        source: 'relative_date'
      }
    });
  }

  return dates;
}

/**
 * Extract numbers with context (e.g., "3 users", "15 questions")
 */
export function extractNumbers(text: string): ParsedEntity[] {
  const numbers: ParsedEntity[] = [];
  let match;

  while ((match = NUMBER_PATTERN.exec(text)) !== null) {
    const count = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();

    numbers.push({
      type: 'number',
      value: count.toString(),
      confidence: 90,
      metadata: {
        count,
        unit: unit.replace(/s$/, ''), // Singular form
        original: match[0],
        source: 'number_pattern'
      },
      position: { start: match.index, end: match.index + match[0].length }
    });
  }

  return numbers;
}

/**
 * Main parsing function - extracts all entities from text
 */
export async function parseText(text: string): Promise<ParsedData> {
  // Extract basic entities using regex
  const emails = extractEmails(text);
  const personNames = extractPersonNames(text);
  const orgNames = extractOrgNames(text);
  const dates = extractDates(text);
  const numbers = extractNumbers(text);

  // Merge user entities (emails + names)
  const users = [...emails, ...personNames];

  // Extract terminology matches for activities, features, models
  const terminologyMatches = await findAllMatches(text);

  const activities: ParsedEntity[] = [];
  const features: ParsedEntity[] = [];
  const models: ParsedEntity[] = [];

  for (const match of terminologyMatches) {
    const entity: ParsedEntity = {
      type: match.mapping.mapping_type === 'activity_type' ? 'activity' :
            match.mapping.mapping_type === 'feature_usage' ? 'feature' :
            match.mapping.mapping_type === 'model_usage' ? 'model' : 'activity',
      value: match.mapping.target_value,
      confidence: match.confidence,
      metadata: {
        ...match.mapping.metadata,
        phrase: match.mapping.phrase,
        match_type: match.matchType,
        source: 'terminology'
      }
    };

    if (entity.type === 'activity') activities.push(entity);
    else if (entity.type === 'feature') features.push(entity);
    else if (entity.type === 'model') models.push(entity);
  }

  // Calculate overall confidence
  const allEntities = [...users, ...orgNames, ...activities, ...dates, ...numbers, ...features, ...models];
  const overall_confidence = allEntities.length > 0
    ? allEntities.reduce((sum, e) => sum + e.confidence, 0) / allEntities.length
    : 0;

  return {
    orgs: orgNames,
    users,
    activities,
    dates,
    numbers,
    features,
    models,
    raw_text: text,
    overall_confidence: Math.round(overall_confidence)
  };
}

/**
 * Infer activity type from text context
 */
export async function inferActivityType(text: string): Promise<string | null> {
  const lowerText = text.toLowerCase();

  // Keyword mapping for activity types
  const keywords: Record<string, string[]> = {
    'demo_completed': ['demo', 'demonstration', 'presented', 'showcased'],
    'trial_started': ['started trial', 'began trial', 'kicked off'],
    'trial_extended': ['extended', 'extension', 'prolonged'],
    'user_login': ['logged in', 'accessed', 'signed in'],
    'questions_asked': ['asked questions', 'inquired', 'queried'],
    'ticket_created': ['issue', 'problem', 'bug', 'ticket'],
    'feature_request': ['feature request', 'suggested', 'requested feature'],
    'call_scheduled': ['scheduled call', 'set up meeting', 'arranged call'],
    'call_completed': ['call completed', 'spoke with', 'discussed'],
  };

  for (const [activityType, words] of Object.entries(keywords)) {
    if (words.some(keyword => lowerText.includes(keyword))) {
      return activityType;
    }
  }

  // Fallback to terminology matching
  const matches = await findAllMatches(text);
  const activityMatch = matches.find(m => m.mapping.mapping_type === 'activity_type');

  return activityMatch ? activityMatch.mapping.target_value : null;
}

/**
 * Calculate confidence score for parsed data
 */
export function calculateConfidence(entities: ParsedEntity[]): number {
  if (entities.length === 0) return 0;

  // Weight by entity type
  const weights: Record<string, number> = {
    user: 1.2, // Emails are very reliable
    org: 0.8,  // Org names less reliable
    activity: 1.0,
    date: 0.9,
    number: 1.1,
    feature: 1.0,
    model: 1.0
  };

  const weightedSum = entities.reduce((sum, e) => {
    const weight = weights[e.type] || 1.0;
    return sum + (e.confidence * weight);
  }, 0);

  const totalWeight = entities.reduce((sum, e) => sum + (weights[e.type] || 1.0), 0);

  return Math.round(weightedSum / totalWeight);
}

/**
 * Clean and normalize extracted org name
 */
export function normalizeOrgName(name: string): string {
  return name
    .replace(/\s+Inc\.?$/i, '')
    .replace(/\s+Corp\.?$/i, '')
    .replace(/\s+Corporation$/i, '')
    .replace(/\s+Ltd\.?$/i, '')
    .replace(/\s+Limited$/i, '')
    .replace(/\s+LLC$/i, '')
    .trim();
}

/**
 * Extract domain from email
 */
export function extractDomainFromEmail(email: string): string {
  const match = email.match(/@(.+)$/);
  return match ? match[1].toLowerCase() : '';
}
