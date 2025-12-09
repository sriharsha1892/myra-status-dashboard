/**
 * Fuzzy Entity Matcher Module
 *
 * Shared module for fuzzy matching entities (orgs, users, etc.) during bulk imports.
 * Uses fuzzball library for string similarity and supports multiple matching strategies.
 */

import {
  ConfidenceTier,
  calculateTier,
  TierConfig,
  DEFAULT_TIER_CONFIG,
} from '../confidence';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Available matching strategies
 */
export enum MatchStrategy {
  EXACT = 'exact',
  FUZZY_NAME = 'fuzzy_name',
  DOMAIN_BASED = 'domain_based',
  CREATE_NEW = 'create_new',
}

/**
 * Fuzzy matcher configuration
 */
export interface FuzzyMatcherConfig {
  /** Minimum score to consider a fuzzy match (0-100) */
  fuzzyThreshold: number;
  /** Maximum number of suggestions to return */
  maxSuggestions: number;
  /** Confidence tier configuration */
  tierConfig: TierConfig;
  /** Scoring algorithm to use */
  scorer: 'token_set_ratio' | 'token_sort_ratio' | 'partial_ratio' | 'ratio';
}

/**
 * Default fuzzy matcher configuration
 */
export const DEFAULT_FUZZY_CONFIG: FuzzyMatcherConfig = {
  fuzzyThreshold: 60,
  maxSuggestions: 3,
  tierConfig: DEFAULT_TIER_CONFIG,
  scorer: 'token_set_ratio',
};

/**
 * A candidate entity for matching
 */
export interface MatchCandidate<T = unknown> {
  id: string;
  name: string;
  /** Additional data attached to the candidate */
  data?: T;
}

/**
 * A suggestion for an alternative match
 */
export interface MatchSuggestion<T = unknown> {
  id: string;
  name: string;
  confidence: number;
  data?: T;
}

/**
 * Result of a match operation
 */
export interface MatchResult<T = unknown> {
  /** Matched entity ID (null if new) */
  matchedId: string | null;
  /** Original input name */
  inputName: string;
  /** Matched/resolved name */
  matchedName: string;
  /** Confidence score (0-100) */
  confidence: number;
  /** Strategy used for matching */
  strategy: MatchStrategy;
  /** Confidence tier */
  tier: ConfidenceTier;
  /** Whether this is a new entity */
  isNew: boolean;
  /** Alternative suggestions */
  suggestions?: MatchSuggestion<T>[];
  /** Additional matched data */
  data?: T;
}

// ============================================================================
// FUZZBALL LAZY LOADING
// ============================================================================

let fuzzballModule: typeof import('fuzzball') | null = null;

/**
 * Lazy load fuzzball to avoid SSR issues
 */
async function getFuzzball(): Promise<typeof import('fuzzball')> {
  if (!fuzzballModule) {
    fuzzballModule = await import('fuzzball');
  }
  return fuzzballModule;
}

// ============================================================================
// NORMALIZATION FUNCTIONS
// ============================================================================

/**
 * Normalize organization name for matching
 * Removes common suffixes and normalizes whitespace
 */
export function normalizeOrgName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.,\-_]/g, '')
    .replace(/\b(inc|llc|ltd|corp|corporation|company|co)\b\.?/gi, '');
}

/**
 * Normalize person name for matching
 */
export function normalizePersonName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.,\-_]/g, ' ');
}

/**
 * Normalize generic text for matching
 */
export function normalizeText(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, ' ');
}

// ============================================================================
// FUZZY ENTITY MATCHER CLASS
// ============================================================================

/**
 * Flexible fuzzy entity matcher for bulk imports
 *
 * @example
 * ```ts
 * const matcher = new FuzzyEntityMatcher<OrgData>(normalizeOrgName, {
 *   fuzzyThreshold: 70,
 * });
 *
 * // Set candidates (existing entities)
 * matcher.setCandidates(existingOrgs.map(org => ({
 *   id: org.org_id,
 *   name: org.org_name,
 *   data: org,
 * })));
 *
 * // Match a new entity
 * const result = await matcher.match('Acme Corporation');
 * // result.strategy: 'exact' | 'fuzzy_name' | 'create_new'
 * // result.confidence: 0-100
 * // result.suggestions: alternative matches
 * ```
 */
export class FuzzyEntityMatcher<T = unknown> {
  private candidates: MatchCandidate<T>[] = [];
  private normalizedCandidates: Map<string, MatchCandidate<T>> = new Map();
  private config: FuzzyMatcherConfig;
  private normalizer: (input: string) => string;

  constructor(
    normalizer: (input: string) => string = normalizeText,
    config: Partial<FuzzyMatcherConfig> = {}
  ) {
    this.normalizer = normalizer;
    this.config = { ...DEFAULT_FUZZY_CONFIG, ...config };
  }

  /**
   * Set the list of candidate entities to match against
   */
  setCandidates(candidates: MatchCandidate<T>[]): this {
    this.candidates = candidates;
    this.normalizedCandidates.clear();

    // Pre-normalize all candidates
    for (const candidate of candidates) {
      const normalized = this.normalizer(candidate.name);
      this.normalizedCandidates.set(normalized, candidate);
    }

    return this;
  }

  /**
   * Get current candidates
   */
  getCandidates(): MatchCandidate<T>[] {
    return [...this.candidates];
  }

  /**
   * Match an input string against candidates
   */
  async match(input: string): Promise<MatchResult<T>> {
    const normalizedInput = this.normalizer(input);

    // Strategy 1: Exact match
    const exactMatch = this.normalizedCandidates.get(normalizedInput);
    if (exactMatch) {
      return {
        matchedId: exactMatch.id,
        inputName: input,
        matchedName: exactMatch.name,
        confidence: 100,
        strategy: MatchStrategy.EXACT,
        tier: ConfidenceTier.AUTO_APPROVE,
        isNew: false,
        data: exactMatch.data,
      };
    }

    // Strategy 2: Fuzzy matching
    if (this.candidates.length > 0) {
      const fb = await getFuzzball();
      const scoreFn = this.getScorerFunction(fb);

      const fuzzyMatches = this.candidates
        .map((candidate) => ({
          candidate,
          score: scoreFn(normalizedInput, this.normalizer(candidate.name)),
        }))
        .filter((m) => m.score >= this.config.fuzzyThreshold)
        .sort((a, b) => b.score - a.score);

      if (fuzzyMatches.length > 0) {
        const best = fuzzyMatches[0];
        const tier = calculateTier(best.score, false, this.config.tierConfig);

        return {
          matchedId: best.candidate.id,
          inputName: input,
          matchedName: best.candidate.name,
          confidence: best.score,
          strategy: MatchStrategy.FUZZY_NAME,
          tier,
          isNew: false,
          data: best.candidate.data,
          suggestions: fuzzyMatches.slice(0, this.config.maxSuggestions).map((m) => ({
            id: m.candidate.id,
            name: m.candidate.name,
            confidence: m.score,
            data: m.candidate.data,
          })),
        };
      }
    }

    // Strategy 3: Create new
    return {
      matchedId: null,
      inputName: input,
      matchedName: input,
      confidence: 100, // 100% confidence in creating new
      strategy: MatchStrategy.CREATE_NEW,
      tier: ConfidenceTier.AUTO_APPROVE,
      isNew: true,
    };
  }

  /**
   * Match multiple inputs in batch
   */
  async matchBatch(inputs: string[]): Promise<MatchResult<T>[]> {
    return Promise.all(inputs.map((input) => this.match(input)));
  }

  /**
   * Get the scorer function based on config
   */
  private getScorerFunction(fb: typeof import('fuzzball')): (a: string, b: string) => number {
    switch (this.config.scorer) {
      case 'token_sort_ratio':
        return fb.token_sort_ratio;
      case 'partial_ratio':
        return fb.partial_ratio;
      case 'ratio':
        return fb.ratio;
      case 'token_set_ratio':
      default:
        return fb.token_set_ratio;
    }
  }
}

// ============================================================================
// SPECIALIZED MATCHERS
// ============================================================================

/**
 * Create an organization matcher with appropriate normalization
 */
export function createOrgMatcher<T = unknown>(
  config?: Partial<FuzzyMatcherConfig>
): FuzzyEntityMatcher<T> {
  return new FuzzyEntityMatcher<T>(normalizeOrgName, config);
}

/**
 * Create a person/user matcher with appropriate normalization
 */
export function createPersonMatcher<T = unknown>(
  config?: Partial<FuzzyMatcherConfig>
): FuzzyEntityMatcher<T> {
  return new FuzzyEntityMatcher<T>(normalizePersonName, config);
}

// ============================================================================
// EMAIL DOMAIN MATCHING
// ============================================================================

/**
 * Extract domain from email address
 */
export function extractEmailDomain(email: string): string | null {
  const parts = email.toLowerCase().trim().split('@');
  return parts.length === 2 ? parts[1] : null;
}

/**
 * Check if two emails share the same domain
 */
export function emailsShareDomain(email1: string, email2: string): boolean {
  const domain1 = extractEmailDomain(email1);
  const domain2 = extractEmailDomain(email2);
  return domain1 !== null && domain1 === domain2;
}

/**
 * Find candidates that share an email domain
 */
export function filterByEmailDomain<T extends { email: string }>(
  candidates: T[],
  targetEmail: string
): T[] {
  const targetDomain = extractEmailDomain(targetEmail);
  if (!targetDomain) return [];

  return candidates.filter((c) => {
    const domain = extractEmailDomain(c.email);
    return domain === targetDomain;
  });
}

// ============================================================================
// COMBINED CONFIDENCE CALCULATION
// ============================================================================

/**
 * Calculate combined confidence from multiple match results
 * Uses weighted average with configurable weights
 */
export function calculateCombinedConfidence(
  results: Array<{ confidence: number; weight: number }>
): number {
  const totalWeight = results.reduce((sum, r) => sum + r.weight, 0);
  if (totalWeight === 0) return 0;

  const weightedSum = results.reduce((sum, r) => sum + r.confidence * r.weight, 0);
  return Math.round(weightedSum / totalWeight);
}

/**
 * Check if all results indicate new entities
 */
export function allAreNew(results: MatchResult[]): boolean {
  return results.every((r) => r.isNew);
}

/**
 * Check if all results are exact matches
 */
export function allAreExact(results: MatchResult[]): boolean {
  return results.every((r) => r.strategy === MatchStrategy.EXACT);
}

/**
 * Get the lowest confidence tier from multiple results
 */
export function getLowestTier(results: MatchResult[]): ConfidenceTier {
  const tierOrder = [
    ConfidenceTier.REQUIRES_FIX,
    ConfidenceTier.NEEDS_REVIEW,
    ConfidenceTier.AUTO_APPROVE,
  ];

  for (const tier of tierOrder) {
    if (results.some((r) => r.tier === tier)) {
      return tier;
    }
  }

  return ConfidenceTier.AUTO_APPROVE;
}
