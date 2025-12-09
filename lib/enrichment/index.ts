/**
 * Progressive Data Enrichment - Public API
 */

// Types
export * from './types';

// Question Registry
export {
  ENRICHMENT_QUESTIONS,
  getQuestionsForRole,
  getQuestionsForEntityType,
  getQuestionById,
  getTotalWeight,
  sortQuestionsByPriority,
} from './questions';

// Completeness Scoring
export {
  calculateOrgCompleteness,
  calculateUserCompleteness,
  calculateCombinedCompleteness,
  isUnlocked,
  getCompletenessStatus,
  answersToUnlock,
  COMPLETENESS_UNLOCK_THRESHOLD,
} from './completenessScore';

// AI Inference
export { inferSuggestions, inferSuggestionsWithGroq } from './aiInference';
