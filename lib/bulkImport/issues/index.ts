/**
 * Issue Detection Module
 *
 * Exports all issue detection utilities for bulk import operations.
 */

export {
  // Types
  type IssueSeverity,
  type CommonIssueType,
  type Issue,
  type IssueRule,
  type IssueCheckResult,
  type IssueSummary,
  // Class
  IssueDetector,
  // Helper functions
  hasErrors,
  hasWarnings,
  filterBySeverity,
  filterByType,
  groupByType,
  groupBySeverity,
  getIssueSummary,
  mergeIssueSummaries,
  // Rule builders
  createFuzzyMatchRule,
  createMissingEntityRule,
  createLowConfidenceRule,
  createRequiredFieldRule,
} from './IssueDetector';
