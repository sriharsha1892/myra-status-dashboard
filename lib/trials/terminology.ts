/**
 * Terminology Matching Engine
 * Maps internal jargon to standardized values without external AI
 */

import { createClient } from '@/lib/supabase/server';
import * as fuzz from 'fuzzball';

export interface TerminologyMapping {
  id: string;
  phrase: string;
  phrase_normalized: string;
  mapping_type: 'lifecycle_stage' | 'activity_type' | 'deal_status' | 'feature_usage' | 'model_usage' | 'custom';
  target_value: string;
  metadata: Record<string, any>;
  confidence_boost: number;
  is_core_term: boolean;
  learn_variations: boolean;
}

export interface MatchResult {
  mapping: TerminologyMapping;
  confidence: number; // 0-100
  matchType: 'exact' | 'fuzzy' | 'variation';
}

// In-memory cache for terminology mappings (refreshed periodically)
let terminologyCache: TerminologyMapping[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Load terminology mappings from database with caching
 */
async function loadTerminology(): Promise<TerminologyMapping[]> {
  const now = Date.now();

  // Return cached data if still valid
  if (terminologyCache && (now - cacheTimestamp) < CACHE_TTL) {
    return terminologyCache;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('terminology_mappings')
    .select('*')
    .order('is_core_term', { ascending: false })
    .order('usage_count', { ascending: false });

  if (error) {
    console.error('Error loading terminology:', error);
    return terminologyCache || []; // Return stale cache if available
  }

  terminologyCache = data || [];
  cacheTimestamp = now;
  return terminologyCache;
}

/**
 * Find terminology mapping for a given phrase
 */
export async function findTerminologyMatch(phrase: string): Promise<MatchResult | null> {
  if (!phrase || phrase.trim().length === 0) return null;

  const normalizedPhrase = phrase.toLowerCase().trim();
  const mappings = await loadTerminology();

  // 1. Try exact match first (highest confidence)
  const exactMatch = mappings.find(m => m.phrase_normalized === normalizedPhrase);
  if (exactMatch) {
    return {
      mapping: exactMatch,
      confidence: Math.min(95 + exactMatch.confidence_boost, 100),
      matchType: 'exact'
    };
  }

  // 2. Try fuzzy matching (medium confidence)
  const fuzzyMatches = mappings
    .map(mapping => ({
      mapping,
      score: fuzz.ratio(normalizedPhrase, mapping.phrase_normalized)
    }))
    .filter(m => m.score >= 85) // 85%+ similarity
    .sort((a, b) => b.score - a.score);

  if (fuzzyMatches.length > 0) {
    const best = fuzzyMatches[0];
    return {
      mapping: best.mapping,
      confidence: Math.min(best.score + best.mapping.confidence_boost, 100),
      matchType: 'fuzzy'
    };
  }

  // 3. Try partial matching for variations (lower confidence)
  const variationMatches = mappings
    .filter(m => m.learn_variations && m.is_core_term)
    .map(mapping => {
      // Check if phrase contains core term or vice versa
      const phraseWords = normalizedPhrase.split(/\s+/);
      const termWords = mapping.phrase_normalized.split(/\s+/);

      const overlap = phraseWords.filter(w => termWords.includes(w)).length;
      const score = (overlap / Math.max(phraseWords.length, termWords.length)) * 100;

      return { mapping, score };
    })
    .filter(m => m.score >= 70)
    .sort((a, b) => b.score - a.score);

  if (variationMatches.length > 0) {
    const best = variationMatches[0];
    return {
      mapping: best.mapping,
      confidence: Math.min(best.score + best.mapping.confidence_boost - 10, 90), // Slightly lower confidence
      matchType: 'variation'
    };
  }

  return null;
}

/**
 * Find all terminology matches for a given text
 */
export async function findAllMatches(text: string): Promise<MatchResult[]> {
  const sentences = text.split(/[.!?\n]+/).filter(s => s.trim().length > 0);
  const phrases = sentences.flatMap(s => {
    // Extract potential phrases (2-5 words)
    const words = s.trim().split(/\s+/);
    const extracted: string[] = [];

    for (let len = 2; len <= 5 && len <= words.length; len++) {
      for (let i = 0; i <= words.length - len; i++) {
        extracted.push(words.slice(i, i + len).join(' '));
      }
    }

    return extracted;
  });

  const matches: MatchResult[] = [];
  const seen = new Set<string>();

  for (const phrase of phrases) {
    const match = await findTerminologyMatch(phrase);
    if (match && !seen.has(match.mapping.id)) {
      matches.push(match);
      seen.add(match.mapping.id);
    }
  }

  return matches.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Increment usage count for a terminology mapping
 */
export async function incrementTerminologyUsage(mappingId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.rpc('increment_terminology_usage', { term_id: mappingId });

  // Invalidate cache to force refresh on next load
  terminologyCache = null;
}

/**
 * Suggest new terminology mapping based on unknown phrase
 */
export async function suggestNewMapping(
  phrase: string,
  context: string,
  userId: string
): Promise<string> {
  const supabase = await createClient();

  // Create review queue item for admin to approve
  const { data, error } = await supabase
    .from('review_queue')
    .insert({
      review_type: 'terminology_learning',
      priority: 'normal',
      source_data: {
        phrase,
        context,
        suggested_at: new Date().toISOString()
      },
      suggestions: [], // Admin will fill this in
      source_type: 'text_parser'
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating terminology suggestion:', error);
    throw error;
  }

  return data.id;
}

/**
 * Get terminology mappings by type
 */
export async function getTerminologyByType(
  type: TerminologyMapping['mapping_type']
): Promise<TerminologyMapping[]> {
  const mappings = await loadTerminology();
  return mappings.filter(m => m.mapping_type === type);
}

/**
 * Clear terminology cache (useful after admin updates)
 */
export function clearTerminologyCache(): void {
  terminologyCache = null;
  cacheTimestamp = 0;
}
