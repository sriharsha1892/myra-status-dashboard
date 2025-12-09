/**
 * Entity Matching Module
 *
 * Exports all fuzzy matching utilities for bulk import operations.
 */

export {
  // Enums
  MatchStrategy,
  // Types
  type FuzzyMatcherConfig,
  type MatchCandidate,
  type MatchSuggestion,
  type MatchResult,
  // Config
  DEFAULT_FUZZY_CONFIG,
  // Normalization functions
  normalizeOrgName,
  normalizePersonName,
  normalizeText,
  // Main class
  FuzzyEntityMatcher,
  // Factory functions
  createOrgMatcher,
  createPersonMatcher,
  // Email utilities
  extractEmailDomain,
  emailsShareDomain,
  filterByEmailDomain,
  // Combined confidence helpers
  calculateCombinedConfidence,
  allAreNew,
  allAreExact,
  getLowestTier,
} from './FuzzyEntityMatcher';
