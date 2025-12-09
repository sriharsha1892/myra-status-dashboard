/**
 * Enrichment Components - Public Exports
 */

// New redesigned components (Linear/Asana hybrid)
export { EnrichmentPanel } from './EnrichmentPanel';
export { EnrichmentQuestion } from './EnrichmentQuestion';
export { EnrichmentChoiceChips } from './EnrichmentChoiceChips';
export { EnrichmentProgressRing } from './EnrichmentProgressRing';
export { BatchEnrichmentPanel } from './BatchEnrichmentPanel';
export { BatchEnrichmentModal } from './BatchEnrichmentModal';

// Inline enrichment prompts (for org/user detail pages)
export { default as InlineEnrichmentPrompt, HealthStatusPrompt, DealMomentumPrompt, UserInfluencePrompt } from './InlineEnrichmentPrompt';

// Animation variants
export * from './animations';

// Hooks
export { useKeyboardNav } from './useKeyboardNav';
