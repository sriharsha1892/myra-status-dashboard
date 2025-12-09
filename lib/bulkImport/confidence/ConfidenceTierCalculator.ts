/**
 * Confidence Tier Calculator
 *
 * Shared module for calculating confidence tiers in bulk import operations.
 * Extracted from MyRA CSV import for reuse across importers.
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * Confidence tier levels for import review workflow
 */
export enum ConfidenceTier {
  /** >90% confidence - auto-approve, green tier */
  AUTO_APPROVE = 'auto_approve',
  /** 70-90% confidence - needs manual review, yellow tier */
  NEEDS_REVIEW = 'needs_review',
  /** <70% confidence - requires fix before import, red tier */
  REQUIRES_FIX = 'requires_fix',
}

/**
 * Configuration for tier thresholds
 */
export interface TierConfig {
  /** Minimum confidence for auto-approve (default: 90) */
  autoApproveThreshold: number;
  /** Minimum confidence for needs-review (default: 70) */
  reviewThreshold: number;
}

/**
 * Item with confidence information
 */
export interface ConfidenceItem {
  confidence: number;
  hasErrors?: boolean;
  issues?: Array<{ severity: 'error' | 'warning' }>;
}

/**
 * Result of tier grouping
 */
export interface TierGroups<T> {
  autoApprove: T[];
  needsReview: T[];
  requiresFix: T[];
}

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

export const DEFAULT_TIER_CONFIG: TierConfig = {
  autoApproveThreshold: 90,
  reviewThreshold: 70,
};

// ============================================================================
// FUNCTIONS
// ============================================================================

/**
 * Calculate confidence tier based on confidence score and issues
 *
 * @param confidence - Confidence score (0-100)
 * @param hasErrors - Whether the item has any errors
 * @param config - Optional tier configuration
 * @returns ConfidenceTier
 *
 * @example
 * ```ts
 * const tier = calculateTier(85, false);
 * // Returns: ConfidenceTier.NEEDS_REVIEW
 *
 * const tier = calculateTier(95, false);
 * // Returns: ConfidenceTier.AUTO_APPROVE
 *
 * const tier = calculateTier(95, true);
 * // Returns: ConfidenceTier.REQUIRES_FIX (errors override confidence)
 * ```
 */
export function calculateTier(
  confidence: number,
  hasErrors: boolean = false,
  config: TierConfig = DEFAULT_TIER_CONFIG
): ConfidenceTier {
  // Errors always require fix, regardless of confidence
  if (hasErrors) {
    return ConfidenceTier.REQUIRES_FIX;
  }

  // Based on confidence thresholds
  if (confidence >= config.autoApproveThreshold) {
    return ConfidenceTier.AUTO_APPROVE;
  } else if (confidence >= config.reviewThreshold) {
    return ConfidenceTier.NEEDS_REVIEW;
  } else {
    return ConfidenceTier.REQUIRES_FIX;
  }
}

/**
 * Calculate tier from an item with issues array
 *
 * @param item - Item with confidence and optional issues
 * @param config - Optional tier configuration
 * @returns ConfidenceTier
 */
export function calculateTierFromItem<T extends ConfidenceItem>(
  item: T,
  config: TierConfig = DEFAULT_TIER_CONFIG
): ConfidenceTier {
  const hasErrors = item.hasErrors ||
    (item.issues?.some(i => i.severity === 'error') ?? false);
  return calculateTier(item.confidence, hasErrors, config);
}

/**
 * Group items by their confidence tier
 *
 * @param items - Array of items with confidence scores
 * @param config - Optional tier configuration
 * @returns TierGroups with items sorted by tier
 *
 * @example
 * ```ts
 * const items = [
 *   { id: 1, confidence: 95 },
 *   { id: 2, confidence: 85 },
 *   { id: 3, confidence: 50 },
 * ];
 * const groups = groupByTier(items);
 * // groups.autoApprove = [{ id: 1, ... }]
 * // groups.needsReview = [{ id: 2, ... }]
 * // groups.requiresFix = [{ id: 3, ... }]
 * ```
 */
export function groupByTier<T extends ConfidenceItem>(
  items: T[],
  config: TierConfig = DEFAULT_TIER_CONFIG
): TierGroups<T> {
  const groups: TierGroups<T> = {
    autoApprove: [],
    needsReview: [],
    requiresFix: [],
  };

  for (const item of items) {
    const tier = calculateTierFromItem(item, config);

    switch (tier) {
      case ConfidenceTier.AUTO_APPROVE:
        groups.autoApprove.push(item);
        break;
      case ConfidenceTier.NEEDS_REVIEW:
        groups.needsReview.push(item);
        break;
      case ConfidenceTier.REQUIRES_FIX:
        groups.requiresFix.push(item);
        break;
    }
  }

  return groups;
}

/**
 * Get tier summary statistics
 *
 * @param items - Array of items with confidence scores
 * @param config - Optional tier configuration
 * @returns Object with counts for each tier
 */
export function getTierSummary<T extends ConfidenceItem>(
  items: T[],
  config: TierConfig = DEFAULT_TIER_CONFIG
): { autoApprove: number; needsReview: number; requiresFix: number; total: number } {
  const groups = groupByTier(items, config);
  return {
    autoApprove: groups.autoApprove.length,
    needsReview: groups.needsReview.length,
    requiresFix: groups.requiresFix.length,
    total: items.length,
  };
}

/**
 * Calculate average confidence across items
 *
 * @param confidences - Array of confidence values (0-100)
 * @returns Average confidence rounded to nearest integer
 */
export function averageConfidence(confidences: number[]): number {
  if (confidences.length === 0) return 0;
  const sum = confidences.reduce((acc, c) => acc + c, 0);
  return Math.round(sum / confidences.length);
}

/**
 * Get display color for a tier
 *
 * @param tier - Confidence tier
 * @returns Tailwind color class prefix (e.g., 'green', 'yellow', 'red')
 */
export function getTierColor(tier: ConfidenceTier): 'green' | 'yellow' | 'red' {
  switch (tier) {
    case ConfidenceTier.AUTO_APPROVE:
      return 'green';
    case ConfidenceTier.NEEDS_REVIEW:
      return 'yellow';
    case ConfidenceTier.REQUIRES_FIX:
      return 'red';
  }
}

/**
 * Get display label for a tier
 *
 * @param tier - Confidence tier
 * @returns Human-readable label
 */
export function getTierLabel(tier: ConfidenceTier): string {
  switch (tier) {
    case ConfidenceTier.AUTO_APPROVE:
      return 'Auto-Approve';
    case ConfidenceTier.NEEDS_REVIEW:
      return 'Needs Review';
    case ConfidenceTier.REQUIRES_FIX:
      return 'Requires Fix';
  }
}
