/**
 * Duplicate Detection for Timeline Events
 * Identifies potential duplicate entries during import
 * Uses fuzzy matching on dates, titles, and content
 */

import { ParsedEvent } from './timelineEventsImporter';

// ===================================
// TYPES & INTERFACES
// ===================================

export interface ExistingEvent {
  id: string;
  event_timestamp: Date;
  event_type: string;
  event_category: string;
  title: string;
  description?: string;
}

export interface DuplicateCheck {
  is_duplicate: boolean;
  similarity_score: number; // 0.0 to 1.0
  existing_event: ExistingEvent | null;
  reason: string;
}

// ===================================
// FUZZY DATE MATCHING
// ===================================

/**
 * Check if two dates are within the specified window (in hours)
 */
function datesWithinWindow(date1: Date, date2: Date, windowHours: number = 48): boolean {
  const diff = Math.abs(date1.getTime() - date2.getTime());
  const diffHours = diff / (1000 * 60 * 60);
  return diffHours <= windowHours;
}

// ===================================
// TEXT SIMILARITY
// ===================================

/**
 * Tokenize text into normalized words
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .split(/\s+/)
    .filter(word => word.length > 2); // Ignore very short words
}

/**
 * Calculate Jaccard similarity between two texts
 * (intersection over union of word tokens)
 */
function jaccardSimilarity(text1: string, text2: string): number {
  const tokens1 = new Set(tokenize(text1));
  const tokens2 = new Set(tokenize(text2));

  if (tokens1.size === 0 && tokens2.size === 0) return 1.0;
  if (tokens1.size === 0 || tokens2.size === 0) return 0.0;

  // Calculate intersection
  const intersection = new Set(
    [...tokens1].filter(token => tokens2.has(token))
  );

  // Calculate union
  const union = new Set([...tokens1, ...tokens2]);

  return intersection.size / union.size;
}

/**
 * Extract key phrases (2-3 word combinations) from text
 */
function extractKeyPhrases(text: string): Set<string> {
  const words = tokenize(text);
  const phrases = new Set<string>();

  // 2-word phrases
  for (let i = 0; i < words.length - 1; i++) {
    phrases.add(`${words[i]} ${words[i + 1]}`);
  }

  // 3-word phrases
  for (let i = 0; i < words.length - 2; i++) {
    phrases.add(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
  }

  return phrases;
}

/**
 * Check if two texts share significant key phrases
 */
function hasSharedKeyPhrases(text1: string, text2: string): boolean {
  const phrases1 = extractKeyPhrases(text1);
  const phrases2 = extractKeyPhrases(text2);

  if (phrases1.size === 0 && phrases2.size === 0) return false;

  // Find intersection
  const sharedPhrases = [...phrases1].filter(phrase => phrases2.has(phrase));

  // Consider it a match if they share at least 2 key phrases
  return sharedPhrases.length >= 2;
}

// ===================================
// DUPLICATE DETECTION ALGORITHM
// ===================================

/**
 * Check if a new event is a potential duplicate of existing events
 * Uses multiple heuristics:
 * 1. Same org + date within 48h + title similarity >70%
 * 2. Same org + identical key phrases
 * 3. Same event type + very similar title + close date
 */
export function checkDuplicate(
  newEvent: ParsedEvent,
  existingEvents: ExistingEvent[],
  orgId: string
): DuplicateCheck {
  // No existing events means no duplicate
  if (!existingEvents || existingEvents.length === 0) {
    return {
      is_duplicate: false,
      similarity_score: 0,
      existing_event: null,
      reason: 'No existing events to compare',
    };
  }

  let highestSimilarity = 0;
  let mostSimilarEvent: ExistingEvent | null = null;
  let matchReason = '';

  for (const existingEvent of existingEvents) {
    let similarityScore = 0;
    let reasons: string[] = [];

    // Factor 1: Date proximity (weight: 0.3)
    if (datesWithinWindow(newEvent.event_timestamp, existingEvent.event_timestamp, 48)) {
      const hoursDiff = Math.abs(
        newEvent.event_timestamp.getTime() - existingEvent.event_timestamp.getTime()
      ) / (1000 * 60 * 60);
      const dateScore = 1.0 - (hoursDiff / 48); // Closer dates = higher score
      similarityScore += dateScore * 0.3;
      reasons.push(`${Math.round(hoursDiff)}h apart`);
    }

    // Factor 2: Title similarity (weight: 0.4)
    const titleSimilarity = jaccardSimilarity(newEvent.title, existingEvent.title);
    similarityScore += titleSimilarity * 0.4;
    if (titleSimilarity > 0.5) {
      reasons.push(`${Math.round(titleSimilarity * 100)}% title match`);
    }

    // Factor 3: Event type match (weight: 0.2)
    if (newEvent.event_type === existingEvent.event_type) {
      similarityScore += 0.2;
      reasons.push('same type');
    } else if (newEvent.event_category === existingEvent.event_category) {
      similarityScore += 0.1;
      reasons.push('same category');
    }

    // Factor 4: Description similarity (weight: 0.1)
    if (newEvent.description && existingEvent.description) {
      const descSimilarity = jaccardSimilarity(newEvent.description, existingEvent.description);
      similarityScore += descSimilarity * 0.1;
    }

    // Bonus: Key phrase matching
    const combinedNew = `${newEvent.title} ${newEvent.description || ''}`;
    const combinedExisting = `${existingEvent.title} ${existingEvent.description || ''}`;
    if (hasSharedKeyPhrases(combinedNew, combinedExisting)) {
      similarityScore += 0.1; // Bonus for shared key phrases
      reasons.push('shared key phrases');
    }

    // Update highest similarity
    if (similarityScore > highestSimilarity) {
      highestSimilarity = similarityScore;
      mostSimilarEvent = existingEvent;
      matchReason = reasons.join(', ');
    }
  }

  // Threshold for duplicate: similarity >= 0.7
  const isDuplicate = highestSimilarity >= 0.7;

  return {
    is_duplicate: isDuplicate,
    similarity_score: highestSimilarity,
    existing_event: mostSimilarEvent,
    reason: isDuplicate
      ? `Possible duplicate: ${matchReason}`
      : 'No significant match found',
  };
}

/**
 * Batch check multiple new events against existing events
 * Returns array of duplicate checks in same order as input
 */
export function batchCheckDuplicates(
  newEvents: ParsedEvent[],
  existingEvents: ExistingEvent[],
  orgId: string
): DuplicateCheck[] {
  return newEvents.map(newEvent => checkDuplicate(newEvent, existingEvents, orgId));
}

/**
 * Filter out high-confidence duplicates from a list of events
 * Returns only events that are NOT duplicates (similarity < 0.8)
 */
export function filterDuplicates(
  newEvents: ParsedEvent[],
  existingEvents: ExistingEvent[],
  orgId: string
): ParsedEvent[] {
  return newEvents.filter(newEvent => {
    const duplicateCheck = checkDuplicate(newEvent, existingEvents, orgId);
    // Only filter out very high confidence duplicates (>= 0.8)
    return !duplicateCheck.is_duplicate || duplicateCheck.similarity_score < 0.8;
  });
}

/**
 * Get recent events for an organization
 * Helper function to fetch events for context display
 * Now uses direct Supabase query instead of HTTP fetch
 */
export async function getRecentEvents(
  supabase: any,
  orgId: string,
  limit: number = 5
): Promise<ExistingEvent[]> {
  try {
    const { data, error } = await supabase
      .from('trial_timeline_events')
      .select('id, event_timestamp, event_type, event_category, title, description')
      .eq('org_id', orgId)
      .order('event_timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching recent events:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching recent events:', error);
    return [];
  }
}
