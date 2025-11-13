/**
 * Activity Type Fuzzy Matching
 * Suggests closest event types when exact match fails
 * Learns from user corrections over time
 */

import { EVENT_TAXONOMY } from './llmParser';

// ===================================
// TYPES & INTERFACES
// ===================================

export interface Match {
  event_type: string;
  event_category: string;
  confidence: number; // 0.0 to 1.0
  reason: string;
  icon: string;
  display_name?: string;
}

export interface CorrectionHistory {
  [suggested_type: string]: string; // suggested => corrected
}

// Common aliases for event types
const ALIASES: Record<string, string[]> = {
  // Communication
  'call': ['call_completed', 'call_scheduled', 'meeting_held'],
  'phone': ['call_completed', 'call_scheduled'],
  'meeting': ['meeting_held', 'call_completed'],
  'demo': ['demo_conducted', 'meeting_held'],
  'email': ['email_exchange', 'follow_up_sent'],
  'followup': ['follow_up_sent', 'email_exchange'],
  'follow-up': ['follow_up_sent', 'email_exchange'],

  // Support
  'bug': ['bug_reported', 'technical_issue_reported'],
  'issue': ['technical_issue_reported', 'bug_reported', 'issue_resolved'],
  'problem': ['technical_issue_reported', 'support_ticket_created'],
  'ticket': ['support_ticket_created', 'issue_resolved'],
  'support': ['support_ticket_created', 'technical_issue_reported'],
  'fix': ['issue_resolved', 'workaround_provided'],
  'resolved': ['issue_resolved'],

  // Feedback
  'feedback': ['feedback_received', 'positive_feedback', 'negative_feedback'],
  'request': ['feature_request', 'support_ticket_created'],
  'feature': ['feature_request', 'feature_tested'],
  'pain': ['pain_point_identified'],

  // Engagement
  'login': ['user_logged_in', 'first_login'],
  'usage': ['usage_observed', 'high_engagement', 'low_engagement'],
  'activity': ['usage_observed', 'high_engagement'],
  'tested': ['feature_tested', 'use_case_tested'],

  // Milestones
  'trial': ['trial_extended', 'trial_converted', 'trial_access_provided'],
  'extended': ['trial_extended'],
  'converted': ['trial_converted', 'contract_signed'],
  'signed': ['contract_signed'],
  'lost': ['deal_lost'],
  'won': ['trial_converted', 'contract_signed'],
  'champion': ['champion_identified'],
  'budget': ['budget_confirmed', 'pricing_discussion'],

  // Onboarding
  'credentials': ['credentials_shared', 'trial_access_provided'],
  'access': ['trial_access_provided', 'trial_access_requested', 'first_login'],
  'onboard': ['onboarding_complete', 'first_login'],
  'allowlist': ['allowlist_support'],
  'whitelist': ['allowlist_support'],

  // Sales
  'note': ['sales_note', 'internal_note', 'follow_up_note'],
  'update': ['sales_note', 'internal_note'],
  'pricing': ['pricing_discussion', 'budget_confirmed'],
  'competitor': ['competitor_mentioned'],
  'renewal': ['renewal_discussion'],
};

// ===================================
// LEVENSHTEIN DISTANCE
// ===================================

/**
 * Calculate Levenshtein distance between two strings
 * (minimum number of single-character edits to transform one string into another)
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  // Initialize matrix
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[len1][len2];
}

/**
 * Calculate string similarity (0.0 to 1.0)
 */
function stringSimilarity(str1: string, str2: string): number {
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  const maxLength = Math.max(str1.length, str2.length);
  return maxLength === 0 ? 1.0 : 1.0 - distance / maxLength;
}

// ===================================
// KEYWORD MATCHING
// ===================================

/**
 * Check if input contains keywords associated with an event type
 */
function keywordMatch(input: string, keywords: string[]): number {
  const inputLower = input.toLowerCase();
  let score = 0;

  for (const keyword of keywords) {
    if (inputLower.includes(keyword.toLowerCase())) {
      // Exact phrase match gets higher score
      score += 1.0;
    } else {
      // Check for partial word matches
      const inputWords = inputLower.split(/\W+/);
      const keywordWords = keyword.toLowerCase().split(/\W+/);

      for (const kw of keywordWords) {
        if (inputWords.includes(kw)) {
          score += 0.5;
        }
      }
    }
  }

  return score;
}

// ===================================
// FUZZY MATCHING ALGORITHM
// ===================================

/**
 * Find top matching event types for a given input string
 * Uses multiple strategies: exact match, alias lookup, string similarity, keyword matching
 */
export function fuzzyMatch(
  input: string,
  correctionHistory?: CorrectionHistory,
  topN: number = 3
): Match[] {
  const matches: Match[] = [];
  const inputLower = input.toLowerCase().trim();

  // Strategy 1: Exact match
  const exactMatch = EVENT_TAXONOMY.find(et => et.type === inputLower);
  if (exactMatch) {
    matches.push({
      event_type: exactMatch.type,
      event_category: exactMatch.category,
      confidence: 1.0,
      reason: 'Exact match',
      icon: exactMatch.icon,
    });
    return matches;
  }

  // Strategy 2: Check correction history (user has corrected this before)
  if (correctionHistory && correctionHistory[inputLower]) {
    const correctedType = correctionHistory[inputLower];
    const correctedEntry = EVENT_TAXONOMY.find(et => et.type === correctedType);
    if (correctedEntry) {
      matches.push({
        event_type: correctedEntry.type,
        event_category: correctedEntry.category,
        confidence: 0.95,
        reason: 'Based on your past corrections',
        icon: correctedEntry.icon,
      });
    }
  }

  // Strategy 3: Alias lookup
  if (ALIASES[inputLower]) {
    const aliasTypes = ALIASES[inputLower];
    for (const aliasType of aliasTypes) {
      const aliasEntry = EVENT_TAXONOMY.find(et => et.type === aliasType);
      if (aliasEntry) {
        matches.push({
          event_type: aliasEntry.type,
          event_category: aliasEntry.category,
          confidence: 0.9,
          reason: `Common alias for "${input}"`,
          icon: aliasEntry.icon,
        });
      }
    }
  }

  // Strategy 4: String similarity + keyword matching
  for (const taxonomyEntry of EVENT_TAXONOMY) {
    // Skip if already matched via alias
    if (matches.some(m => m.event_type === taxonomyEntry.type)) {
      continue;
    }

    // Calculate string similarity with event type
    const typeSimilarity = stringSimilarity(inputLower, taxonomyEntry.type);

    // Calculate keyword match score
    const keywordScore = keywordMatch(inputLower, taxonomyEntry.keywords);

    // Combined score (weighted average)
    const combinedScore = (typeSimilarity * 0.4) + (Math.min(keywordScore / 2, 1.0) * 0.6);

    if (combinedScore > 0.3) { // Threshold for relevance
      matches.push({
        event_type: taxonomyEntry.type,
        event_category: taxonomyEntry.category,
        confidence: combinedScore,
        reason: keywordScore > 0
          ? 'Keyword match'
          : `${Math.round(typeSimilarity * 100)}% similar`,
        icon: taxonomyEntry.icon,
      });
    }
  }

  // Sort by confidence (descending) and return top N
  matches.sort((a, b) => b.confidence - a.confidence);
  return matches.slice(0, topN);
}

/**
 * Get all event types in a category
 */
export function getEventsByCategory(category: string): Match[] {
  return EVENT_TAXONOMY
    .filter(et => et.category === category)
    .map(et => ({
      event_type: et.type,
      event_category: et.category,
      confidence: 1.0,
      reason: 'Category filter',
      icon: et.icon,
    }));
}

/**
 * Get all event categories
 */
export function getAllCategories(): string[] {
  const categories = new Set<string>();
  for (const entry of EVENT_TAXONOMY) {
    categories.add(entry.category);
  }
  return Array.from(categories).sort();
}

/**
 * Get formatted display name for event type
 */
export function getDisplayName(eventType: string): string {
  // Convert from snake_case to Title Case
  return eventType
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Search event types by keyword
 */
export function searchEventTypes(query: string, maxResults: number = 10): Match[] {
  if (!query || query.trim().length === 0) {
    // Return all event types sorted by category and sort_order
    return EVENT_TAXONOMY.slice(0, maxResults).map(et => ({
      event_type: et.type,
      event_category: et.category,
      confidence: 1.0,
      reason: 'All types',
      icon: et.icon,
      display_name: getDisplayName(et.type),
    }));
  }

  return fuzzyMatch(query, undefined, maxResults).map(match => ({
    ...match,
    display_name: getDisplayName(match.event_type),
  }));
}
