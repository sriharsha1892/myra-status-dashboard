/**
 * Issue Detector Module
 *
 * Shared module for detecting and categorizing issues during bulk imports.
 * Provides a flexible rule-based system for identifying problems that need review.
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * Issue severity levels
 */
export type IssueSeverity = 'error' | 'warning' | 'info';

/**
 * Built-in issue types common across importers
 */
export type CommonIssueType =
  | 'entity_fuzzy_match'    // Fuzzy matched entity with low confidence
  | 'missing_entity'        // Entity not found, needs creation
  | 'low_confidence'        // Low confidence on AI/automated analysis
  | 'validation_error'      // Data validation failure
  | 'duplicate_detected'    // Potential duplicate entry
  | 'missing_required'      // Required field missing
  | 'format_error';         // Data format issue

/**
 * Generic issue interface
 * Can be extended with custom issue types
 */
export interface Issue<T extends string = CommonIssueType> {
  type: T;
  severity: IssueSeverity;
  message: string;
  field?: string;
  suggestedFix?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Rule for detecting issues
 */
export interface IssueRule<TInput, TIssueType extends string = CommonIssueType> {
  /** Unique identifier for the rule */
  id: string;
  /** Human-readable description */
  description: string;
  /** The type of issue this rule detects */
  issueType: TIssueType;
  /** Default severity for issues from this rule */
  defaultSeverity: IssueSeverity;
  /** Field this rule checks (optional) */
  field?: string;
  /** Check function - returns issue details if problem detected, null otherwise */
  check: (input: TInput) => IssueCheckResult | null;
}

/**
 * Result of an issue check
 */
export interface IssueCheckResult {
  message: string;
  severity?: IssueSeverity; // Override default severity
  suggestedFix?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Issue summary for a collection of items
 */
export interface IssueSummary {
  total: number;
  byType: Record<string, number>;
  bySeverity: {
    error: number;
    warning: number;
    info: number;
  };
  hasErrors: boolean;
  hasWarnings: boolean;
}

// ============================================================================
// ISSUE DETECTOR CLASS
// ============================================================================

/**
 * Flexible issue detector that applies rules to detect problems
 *
 * @example
 * ```ts
 * const detector = new IssueDetector<MyRowType>();
 *
 * detector.addRule({
 *   id: 'org_fuzzy_match',
 *   description: 'Check for low-confidence org matches',
 *   issueType: 'entity_fuzzy_match',
 *   defaultSeverity: 'warning',
 *   field: 'org_name',
 *   check: (row) => {
 *     if (row.orgMatch.strategy === 'fuzzy' && row.orgMatch.confidence < 90) {
 *       return {
 *         message: `Low confidence match: ${row.orgMatch.confidence}%`,
 *         suggestedFix: row.orgMatch.matchedName,
 *       };
 *     }
 *     return null;
 *   },
 * });
 *
 * const issues = detector.detect(row);
 * ```
 */
export class IssueDetector<TInput, TIssueType extends string = CommonIssueType> {
  private rules: IssueRule<TInput, TIssueType>[] = [];

  /**
   * Add a detection rule
   */
  addRule(rule: IssueRule<TInput, TIssueType>): this {
    this.rules.push(rule);
    return this;
  }

  /**
   * Add multiple rules at once
   */
  addRules(rules: IssueRule<TInput, TIssueType>[]): this {
    this.rules.push(...rules);
    return this;
  }

  /**
   * Remove a rule by ID
   */
  removeRule(ruleId: string): this {
    this.rules = this.rules.filter(r => r.id !== ruleId);
    return this;
  }

  /**
   * Get all registered rules
   */
  getRules(): IssueRule<TInput, TIssueType>[] {
    return [...this.rules];
  }

  /**
   * Detect issues in a single input
   */
  detect(input: TInput): Issue<TIssueType>[] {
    const issues: Issue<TIssueType>[] = [];

    for (const rule of this.rules) {
      const result = rule.check(input);
      if (result) {
        issues.push({
          type: rule.issueType,
          severity: result.severity ?? rule.defaultSeverity,
          message: result.message,
          field: rule.field,
          suggestedFix: result.suggestedFix,
          metadata: result.metadata,
        });
      }
    }

    return issues;
  }

  /**
   * Detect issues in multiple inputs
   */
  detectBatch(inputs: TInput[]): Map<number, Issue<TIssueType>[]> {
    const results = new Map<number, Issue<TIssueType>[]>();

    inputs.forEach((input, index) => {
      const issues = this.detect(input);
      if (issues.length > 0) {
        results.set(index, issues);
      }
    });

    return results;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if issues contain any errors
 */
export function hasErrors<T extends string>(issues: Issue<T>[]): boolean {
  return issues.some(i => i.severity === 'error');
}

/**
 * Check if issues contain any warnings
 */
export function hasWarnings<T extends string>(issues: Issue<T>[]): boolean {
  return issues.some(i => i.severity === 'warning');
}

/**
 * Filter issues by severity
 */
export function filterBySeverity<T extends string>(
  issues: Issue<T>[],
  severity: IssueSeverity
): Issue<T>[] {
  return issues.filter(i => i.severity === severity);
}

/**
 * Filter issues by type
 */
export function filterByType<T extends string>(
  issues: Issue<T>[],
  type: T
): Issue<T>[] {
  return issues.filter(i => i.type === type);
}

/**
 * Group issues by type
 */
export function groupByType<T extends string>(
  issues: Issue<T>[]
): Map<T, Issue<T>[]> {
  const groups = new Map<T, Issue<T>[]>();

  for (const issue of issues) {
    const existing = groups.get(issue.type) || [];
    existing.push(issue);
    groups.set(issue.type, existing);
  }

  return groups;
}

/**
 * Group issues by severity
 */
export function groupBySeverity<T extends string>(
  issues: Issue<T>[]
): Record<IssueSeverity, Issue<T>[]> {
  return {
    error: issues.filter(i => i.severity === 'error'),
    warning: issues.filter(i => i.severity === 'warning'),
    info: issues.filter(i => i.severity === 'info'),
  };
}

/**
 * Get summary statistics for issues
 */
export function getIssueSummary<T extends string>(issues: Issue<T>[]): IssueSummary {
  const byType: Record<string, number> = {};
  const bySeverity = { error: 0, warning: 0, info: 0 };

  for (const issue of issues) {
    byType[issue.type] = (byType[issue.type] || 0) + 1;
    bySeverity[issue.severity]++;
  }

  return {
    total: issues.length,
    byType,
    bySeverity,
    hasErrors: bySeverity.error > 0,
    hasWarnings: bySeverity.warning > 0,
  };
}

/**
 * Merge multiple issue summaries
 */
export function mergeIssueSummaries(summaries: IssueSummary[]): IssueSummary {
  const merged: IssueSummary = {
    total: 0,
    byType: {},
    bySeverity: { error: 0, warning: 0, info: 0 },
    hasErrors: false,
    hasWarnings: false,
  };

  for (const summary of summaries) {
    merged.total += summary.total;
    merged.bySeverity.error += summary.bySeverity.error;
    merged.bySeverity.warning += summary.bySeverity.warning;
    merged.bySeverity.info += summary.bySeverity.info;

    for (const [type, count] of Object.entries(summary.byType)) {
      merged.byType[type] = (merged.byType[type] || 0) + count;
    }

    if (summary.hasErrors) merged.hasErrors = true;
    if (summary.hasWarnings) merged.hasWarnings = true;
  }

  return merged;
}

// ============================================================================
// COMMON RULE BUILDERS
// ============================================================================

/**
 * Create a rule for detecting fuzzy entity matches below a threshold
 */
export function createFuzzyMatchRule<TInput>(
  id: string,
  field: string,
  getMatch: (input: TInput) => { strategy: string; confidence: number; matchedName?: string } | null,
  threshold: number = 90
): IssueRule<TInput, CommonIssueType> {
  return {
    id,
    description: `Check for low-confidence fuzzy matches on ${field}`,
    issueType: 'entity_fuzzy_match',
    defaultSeverity: 'warning',
    field,
    check: (input) => {
      const match = getMatch(input);
      if (!match) return null;

      if (match.strategy === 'fuzzy_name' && match.confidence < threshold) {
        return {
          message: `Fuzzy matched "${field}" with ${match.confidence}% confidence`,
          suggestedFix: match.matchedName,
          metadata: { confidence: match.confidence, strategy: match.strategy },
        };
      }
      return null;
    },
  };
}

/**
 * Create a rule for detecting missing/new entities
 */
export function createMissingEntityRule<TInput>(
  id: string,
  field: string,
  entityName: string,
  isNew: (input: TInput) => { isNew: boolean; name: string } | null
): IssueRule<TInput, CommonIssueType> {
  return {
    id,
    description: `Check if ${entityName} needs to be created`,
    issueType: 'missing_entity',
    defaultSeverity: 'warning',
    field,
    check: (input) => {
      const result = isNew(input);
      if (!result || !result.isNew) return null;

      return {
        message: `New ${entityName} "${result.name}" will be created`,
        metadata: { entityType: entityName, name: result.name },
      };
    },
  };
}

/**
 * Create a rule for detecting low confidence on a field
 */
export function createLowConfidenceRule<TInput>(
  id: string,
  field: string,
  getConfidence: (input: TInput) => { confidence: number; value: string } | null,
  threshold: number = 80
): IssueRule<TInput, CommonIssueType> {
  return {
    id,
    description: `Check for low confidence on ${field}`,
    issueType: 'low_confidence',
    defaultSeverity: 'warning',
    field,
    check: (input) => {
      const result = getConfidence(input);
      if (!result) return null;

      if (result.confidence < threshold) {
        return {
          message: `"${field}" assigned "${result.value}" with ${result.confidence}% confidence`,
          suggestedFix: result.value,
          metadata: { confidence: result.confidence },
        };
      }
      return null;
    },
  };
}

/**
 * Create a rule for required field validation
 */
export function createRequiredFieldRule<TInput>(
  id: string,
  field: string,
  getValue: (input: TInput) => unknown
): IssueRule<TInput, CommonIssueType> {
  return {
    id,
    description: `Check if ${field} is present`,
    issueType: 'missing_required',
    defaultSeverity: 'error',
    field,
    check: (input) => {
      const value = getValue(input);
      if (value === null || value === undefined || value === '') {
        return {
          message: `Required field "${field}" is missing`,
        };
      }
      return null;
    },
  };
}
