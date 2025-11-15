/**
 * Import Results Formatter
 * Formats import results for user display with detailed success/failure reporting
 * Works with existing error handlers for consistent error messaging
 */

import { getErrorMessage, formatErrorForToast, ErrorContext } from '@/lib/errorHandler';
import { getUserFriendlyMessage } from '@/lib/utils/errorHandler';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ImportItem {
  id?: string;
  title?: string;
  name?: string;
  description?: string;
  [key: string]: any;
}

export interface SuccessfulImport<T = ImportItem> {
  id: string;
  item: T;
}

export interface FailedImport<T = ImportItem> {
  item: T;
  error: string;
  technical?: string;
}

export interface ImportResults<T = ImportItem> {
  successful: SuccessfulImport<T>[];
  failed: FailedImport<T>[];
  warnings: string[];
}

export interface ImportSummary {
  success: boolean; // true only if NO failures
  totalAttempted: number;
  successCount: number;
  failureCount: number;
  warningCount: number;
  message: string; // User-friendly summary
  detailedMessage?: string; // Optional detailed breakdown
}

// ============================================================================
// RESULT COLLECTION
// ============================================================================

/**
 * Creates an empty import results object
 */
export function createImportResults<T = ImportItem>(): ImportResults<T> {
  return {
    successful: [],
    failed: [],
    warnings: []
  };
}

/**
 * Add successful import to results
 */
export function addSuccess<T = ImportItem>(
  results: ImportResults<T>,
  id: string,
  item: T
): void {
  results.successful.push({ id, item });
}

/**
 * Add failed import to results with graceful error handling
 */
export function addFailure<T = ImportItem>(
  results: ImportResults<T>,
  item: T,
  error: any,
  context?: ErrorContext
): void {
  const errorDetails = getErrorMessage(error, context || 'generic');

  results.failed.push({
    item,
    error: errorDetails.message,
    technical: errorDetails.technical
  });
}

/**
 * Add warning to results
 */
export function addWarning<T>(
  results: ImportResults<T>,
  warning: string
): void {
  results.warnings.push(warning);
}

// ============================================================================
// VERIFICATION
// ============================================================================

/**
 * Verify expected vs actual counts and add warnings if mismatch
 */
export function verifyImportCounts<T>(
  results: ImportResults<T>,
  expectedCount: number,
  entityName: string = 'items'
): void {
  const actualSuccessCount = results.successful.length;

  if (actualSuccessCount !== expectedCount) {
    const diff = expectedCount - actualSuccessCount;
    addWarning(
      results,
      `Count mismatch: Expected ${expectedCount} ${entityName}, but only ${actualSuccessCount} were successfully created. ${diff} ${entityName} failed.`
    );
  }
}

/**
 * Add database verification results
 */
export function addDatabaseVerification<T>(
  results: ImportResults<T>,
  dbCount: number,
  expectedCount: number,
  entityName: string = 'records'
): void {
  if (dbCount !== expectedCount) {
    addWarning(
      results,
      `Database verification: Expected ${expectedCount} ${entityName} in database, found ${dbCount}. Some ${entityName} may not have been saved properly.`
    );
  }
}

// ============================================================================
// SUMMARY GENERATION
// ============================================================================

/**
 * Generate a user-friendly summary of import results
 */
export function generateImportSummary<T>(
  results: ImportResults<T>,
  entityName: string = 'items',
  totalAttempted: number = results.successful.length + results.failed.length
): ImportSummary {
  const successCount = results.successful.length;
  const failureCount = results.failed.length;
  const warningCount = results.warnings.length;
  const success = failureCount === 0 && warningCount === 0;

  // Generate main message
  let message = '';
  if (success) {
    message = `✓ Successfully imported ${successCount}/${totalAttempted} ${entityName}`;
  } else if (failureCount === 0 && warningCount > 0) {
    message = `⚠ Imported ${successCount}/${totalAttempted} ${entityName} with ${warningCount} warning(s)`;
  } else if (successCount === 0) {
    message = `✗ Failed to import all ${totalAttempted} ${entityName}`;
  } else {
    message = `⚠ Partial success: ${successCount}/${totalAttempted} ${entityName} imported`;
  }

  // Generate detailed message
  let detailedMessage = message;

  if (failureCount > 0) {
    detailedMessage += `\n\n${failureCount} ${entityName} failed:`;
    results.failed.forEach((failed, index) => {
      const itemLabel = (failed.item as any).title || (failed.item as any).name || `Item ${index + 1}`;
      detailedMessage += `\n• ${itemLabel}: ${failed.error}`;
    });
  }

  if (warningCount > 0) {
    detailedMessage += `\n\nWarnings:`;
    results.warnings.forEach((warning) => {
      detailedMessage += `\n• ${warning}`;
    });
  }

  return {
    success,
    totalAttempted,
    successCount,
    failureCount,
    warningCount,
    message,
    detailedMessage
  };
}

/**
 * Generate toast message for import results
 */
export function getImportToastMessage<T>(
  results: ImportResults<T>,
  entityName: string = 'items',
  totalAttempted: number = results.successful.length + results.failed.length
): string {
  const summary = generateImportSummary(results, entityName, totalAttempted);

  // For full success, just show success message
  if (summary.success) {
    return summary.message;
  }

  // For failures, show detailed message
  return summary.detailedMessage || summary.message;
}

// ============================================================================
// DETAILED REPORTING
// ============================================================================

/**
 * Generate HTML-formatted detailed report (for modals/expandable sections)
 */
export function generateDetailedHTMLReport<T>(
  results: ImportResults<T>,
  entityName: string = 'items'
): string {
  const summary = generateImportSummary(results, entityName);

  let html = `<div class="import-report">`;

  // Summary section
  html += `<div class="summary ${summary.success ? 'success' : 'partial-failure'}">`;
  html += `<h3>${summary.message}</h3>`;
  html += `</div>`;

  // Successful imports
  if (summary.successCount > 0) {
    html += `<div class="successful-imports">`;
    html += `<h4>✓ Successfully Imported (${summary.successCount})</h4>`;
    html += `<ul>`;
    results.successful.forEach((success) => {
      const label = (success.item as any).title || (success.item as any).name || success.id;
      html += `<li>${label}</li>`;
    });
    html += `</ul>`;
    html += `</div>`;
  }

  // Failed imports
  if (summary.failureCount > 0) {
    html += `<div class="failed-imports">`;
    html += `<h4>✗ Failed (${summary.failureCount})</h4>`;
    html += `<ul class="errors">`;
    results.failed.forEach((failed) => {
      const label = (failed.item as any).title || (failed.item as any).name || 'Unknown item';
      html += `<li><strong>${label}</strong>: ${failed.error}</li>`;
    });
    html += `</ul>`;
    html += `</div>`;
  }

  // Warnings
  if (summary.warningCount > 0) {
    html += `<div class="warnings">`;
    html += `<h4>⚠ Warnings (${summary.warningCount})</h4>`;
    html += `<ul>`;
    results.warnings.forEach((warning) => {
      html += `<li>${warning}</li>`;
    });
    html += `</ul>`;
    html += `</div>`;
  }

  html += `</div>`;
  return html;
}

/**
 * Generate markdown-formatted report (for logging/documentation)
 */
export function generateMarkdownReport<T>(
  results: ImportResults<T>,
  entityName: string = 'items'
): string {
  const summary = generateImportSummary(results, entityName);

  let markdown = `# Import Report\n\n`;
  markdown += `## Summary\n${summary.message}\n\n`;

  if (summary.successCount > 0) {
    markdown += `## ✓ Successfully Imported (${summary.successCount})\n`;
    results.successful.forEach((success) => {
      const label = (success.item as any).title || (success.item as any).name || success.id;
      markdown += `- ${label}\n`;
    });
    markdown += `\n`;
  }

  if (summary.failureCount > 0) {
    markdown += `## ✗ Failed (${summary.failureCount})\n`;
    results.failed.forEach((failed) => {
      const label = (failed.item as any).title || (failed.item as any).name || 'Unknown item';
      markdown += `- **${label}**: ${failed.error}\n`;
    });
    markdown += `\n`;
  }

  if (summary.warningCount > 0) {
    markdown += `## ⚠ Warnings (${summary.warningCount})\n`;
    results.warnings.forEach((warning) => {
      markdown += `- ${warning}\n`;
    });
    markdown += `\n`;
  }

  return markdown;
}

// ============================================================================
// REACT COMPONENTS DATA
// ============================================================================

/**
 * Format results for display in React components
 */
export function formatForReact<T>(
  results: ImportResults<T>,
  entityName: string = 'items'
): {
  summary: ImportSummary;
  sections: Array<{
    title: string;
    type: 'success' | 'error' | 'warning';
    items: string[];
  }>;
} {
  const summary = generateImportSummary(results, entityName);
  const sections: Array<{ title: string; type: 'success' | 'error' | 'warning'; items: string[] }> = [];

  if (results.successful.length > 0) {
    sections.push({
      title: `Successfully Imported (${results.successful.length})`,
      type: 'success',
      items: results.successful.map((s) =>
        (s.item as any).title || (s.item as any).name || s.id
      )
    });
  }

  if (results.failed.length > 0) {
    sections.push({
      title: `Failed (${results.failed.length})`,
      type: 'error',
      items: results.failed.map((f) => {
        const label = (f.item as any).title || (f.item as any).name || 'Unknown';
        return `${label}: ${f.error}`;
      })
    });
  }

  if (results.warnings.length > 0) {
    sections.push({
      title: `Warnings (${results.warnings.length})`,
      type: 'warning',
      items: results.warnings
    });
  }

  return { summary, sections };
}
