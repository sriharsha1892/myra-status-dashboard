/**
 * Standardized Import Results Modal
 *
 * Provides consistent UI for displaying import results across all bulk import tools:
 * - Timeline Events (AI & Legacy)
 * - Feature Requests
 * - Trial Users
 * - Smart Import
 * - Excel Organizations
 *
 * Benefits:
 * - Consistent user experience
 * - Reusable component
 * - Standardized messaging
 * - Export/download functionality
 */

'use client';

import { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertCircle, AlertTriangle, Download, ChevronDown, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { EnrichmentPanel } from '@/components/enrichment';
import { useEnrichment } from '@/hooks/useEnrichment';
import type { EntityType, UserRole } from '@/lib/enrichment/types';

// =====================================================
// TYPES
// =====================================================

export interface ImportResult {
  /** Entity type being imported (e.g., "timeline event", "feature request") */
  entityType: string;

  /** Plural form (e.g., "timeline events", "feature requests") */
  entityPlural: string;

  /** Summary statistics */
  summary: {
    total: number;
    successful: number;
    failed: number;
    warnings: number;
  };

  /** Successful imports */
  success: Array<{
    id?: string;
    title: string;
    details?: string;
  }>;

  /** Failed imports */
  failed: Array<{
    item: string;
    error: string;
    rowNumber?: number;
  }>;

  /** Warnings (non-blocking issues) */
  warnings: Array<{
    item: string;
    message: string;
    rowNumber?: number;
  }>;

  /** Optional batch breakdown */
  batches?: Array<{
    batchNumber: number;
    successful: number;
    failed: number;
    errors: string[];
  }>;

  /** Processing metadata */
  metadata?: {
    duration?: number; // in ms
    batchSize?: number;
    totalBatches?: number;
    retriedBatches?: number;
  };
}

/** Optional enrichment configuration */
export interface EnrichmentConfig {
  /** IDs of imported entities to enrich */
  entityIds: string[];
  /** Type of entity (organization or user) */
  entityType: EntityType;
  /** User's role for question prioritization */
  userRole?: UserRole;
  /** Callback when enrichment is completed */
  onEnrichmentComplete?: () => void;
}

interface ImportResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: ImportResult;
  onRetryFailed?: () => void;
  /** Enable progressive data enrichment after import */
  enrichmentConfig?: EnrichmentConfig;
}

// =====================================================
// COMPONENT
// =====================================================

export default function ImportResultsModal({
  isOpen,
  onClose,
  result,
  onRetryFailed,
  enrichmentConfig,
}: ImportResultsModalProps) {
  const [showSuccessDetails, setShowSuccessDetails] = useState(false);
  const [showFailedDetails, setShowFailedDetails] = useState(true); // Show failures by default
  const [showWarningsDetails, setShowWarningsDetails] = useState(false);
  const [showEnrichment, setShowEnrichment] = useState(false);

  // Enrichment hook
  const enrichment = useEnrichment({
    entityIds: enrichmentConfig?.entityIds || [],
    entityType: enrichmentConfig?.entityType || 'organization',
    userRole: enrichmentConfig?.userRole || 'admin',
    onComplete: enrichmentConfig?.onEnrichmentComplete,
  });

  // Auto-fetch enrichment questions when modal opens with enrichment config
  useEffect(() => {
    if (isOpen && enrichmentConfig && enrichmentConfig.entityIds.length > 0 && result.summary.successful > 0) {
      enrichment.fetchQuestions();
      setShowEnrichment(true);
    }
  }, [isOpen, enrichmentConfig, result.summary.successful]);
  const [showBatchDetails, setShowBatchDetails] = useState(false);

  if (!isOpen) return null;

  const { summary, success, failed, warnings, batches, metadata, entityType, entityPlural } = result;

  const isFullSuccess = summary.failed === 0 && summary.warnings === 0;
  const hasWarnings = summary.warnings > 0;
  const hasFailures = summary.failed > 0;

  // =====================================================
  // HANDLERS
  // =====================================================

  const handleDownloadResults = () => {
    const csv = generateCSV(result);
    downloadCSV(csv, `import-results-${Date.now()}.csv`);
    toast.success('Results downloaded');
  };

  const handleCopyToClipboard = () => {
    const text = generateTextSummary(result);
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div
          className={`px-6 py-4 border-b ${
            isFullSuccess
              ? 'bg-green-50 border-green-200'
              : hasFailures
              ? 'bg-red-50 border-red-200'
              : 'bg-yellow-50 border-yellow-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isFullSuccess ? (
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              ) : hasFailures ? (
                <AlertCircle className="w-8 h-8 text-red-600" />
              ) : (
                <AlertTriangle className="w-8 h-8 text-yellow-600" />
              )}
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Import Results</h2>
                <p className="text-sm text-gray-600 mt-0.5">
                  {isFullSuccess
                    ? `All ${entityPlural} imported successfully!`
                    : hasFailures
                    ? `Import completed with errors`
                    : `Import completed with warnings`}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="p-6 bg-gradient-to-br from-slate-50 to-white border-b border-gray-200">
          <div className="grid grid-cols-4 gap-4">
            <StatCard
              label="Total"
              value={summary.total}
              icon="📊"
              color="gray"
            />
            <StatCard
              label="Successful"
              value={summary.successful}
              icon="✅"
              color="green"
            />
            <StatCard
              label="Failed"
              value={summary.failed}
              icon="❌"
              color="red"
            />
            <StatCard
              label="Warnings"
              value={summary.warnings}
              icon="⚠️"
              color="yellow"
            />
          </div>

          {/* Metadata */}
          {metadata && (
            <div className="mt-4 flex items-center gap-4 text-xs text-gray-600">
              {metadata.duration && (
                <span>⏱️ Duration: {formatDuration(metadata.duration)}</span>
              )}
              {metadata.totalBatches && (
                <span>📦 Batches: {metadata.totalBatches}</span>
              )}
              {metadata.retriedBatches && metadata.retriedBatches > 0 && (
                <span className="text-yellow-600">
                  🔄 Retried: {metadata.retriedBatches}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Details (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Enrichment Panel - Progressive Data Completion (Redesigned) */}
          {showEnrichment && enrichment.questions.length > 0 && (
            <EnrichmentPanel
              questions={enrichment.questions}
              completenessScore={enrichment.completenessScore}
              sessionId={enrichment.sessionId}
              isLoading={enrichment.isLoading}
              onAnswer={enrichment.submitAnswer}
              onSkip={enrichment.skipQuestion}
              onComplete={enrichment.completeSession}
            />
          )}

          {/* Success Details */}
          {success.length > 0 && (
            <CollapsibleSection
              title={`Successful (${success.length})`}
              isOpen={showSuccessDetails}
              onToggle={() => setShowSuccessDetails(!showSuccessDetails)}
              icon={<CheckCircle2 className="w-5 h-5 text-green-600" />}
            >
              <div className="space-y-2">
                {success.slice(0, showSuccessDetails ? undefined : 5).map((item, index) => (
                  <div
                    key={index}
                    className="p-3 bg-green-50 border border-green-200 rounded-lg"
                  >
                    <div className="font-medium text-gray-900">{item.title}</div>
                    {item.details && (
                      <div className="text-sm text-gray-600 mt-1">{item.details}</div>
                    )}
                  </div>
                ))}
                {!showSuccessDetails && success.length > 5 && (
                  <div className="text-sm text-gray-500 text-center py-2">
                    + {success.length - 5} more...
                  </div>
                )}
              </div>
            </CollapsibleSection>
          )}

          {/* Failed Details */}
          {failed.length > 0 && (
            <CollapsibleSection
              title={`Failed (${failed.length})`}
              isOpen={showFailedDetails}
              onToggle={() => setShowFailedDetails(!showFailedDetails)}
              icon={<AlertCircle className="w-5 h-5 text-red-600" />}
            >
              <div className="space-y-2">
                {failed.map((item, index) => (
                  <div
                    key={index}
                    className="p-3 bg-red-50 border border-red-200 rounded-lg"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          {item.rowNumber !== undefined && (
                            <span className="text-red-600 mr-2">Row {item.rowNumber}:</span>
                          )}
                          {item.item}
                        </div>
                        <div className="text-sm text-red-600 mt-1">{item.error}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* Warnings Details */}
          {warnings.length > 0 && (
            <CollapsibleSection
              title={`Warnings (${warnings.length})`}
              isOpen={showWarningsDetails}
              onToggle={() => setShowWarningsDetails(!showWarningsDetails)}
              icon={<AlertTriangle className="w-5 h-5 text-yellow-600" />}
            >
              <div className="space-y-2">
                {warnings.map((item, index) => (
                  <div
                    key={index}
                    className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
                  >
                    <div className="font-medium text-gray-900">
                      {item.rowNumber !== undefined && (
                        <span className="text-yellow-600 mr-2">Row {item.rowNumber}:</span>
                      )}
                      {item.item}
                    </div>
                    <div className="text-sm text-yellow-700 mt-1">{item.message}</div>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* Batch Details */}
          {batches && batches.length > 1 && (
            <CollapsibleSection
              title={`Batch Details (${batches.length} batches)`}
              isOpen={showBatchDetails}
              onToggle={() => setShowBatchDetails(!showBatchDetails)}
              icon={<span className="text-lg">📦</span>}
            >
              <div className="space-y-2">
                {batches.map((batch, index) => (
                  <div
                    key={index}
                    className="p-3 bg-gray-50 border border-gray-200 rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium text-gray-900">
                        Batch #{batch.batchNumber}
                      </div>
                      <div className="text-sm text-gray-600">
                        ✅ {batch.successful} | ❌ {batch.failed}
                      </div>
                    </div>
                    {batch.errors.length > 0 && (
                      <div className="text-sm text-red-600 space-y-1">
                        {batch.errors.map((error, errorIndex) => (
                          <div key={errorIndex}>• {error}</div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadResults}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              <Download className="w-4 h-4" />
              Download CSV
            </button>
            <button
              onClick={handleCopyToClipboard}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              Copy Summary
            </button>
          </div>

          <div className="flex items-center gap-2">
            {onRetryFailed && failed.length > 0 && (
              <button
                onClick={onRetryFailed}
                className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors text-sm font-medium"
              >
                Retry Failed
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// SUBCOMPONENTS
// =====================================================

interface StatCardProps {
  label: string;
  value: number;
  icon: string;
  color: 'gray' | 'green' | 'red' | 'yellow';
}

function StatCard({ label, value, icon, color }: StatCardProps) {
  const colorClasses = {
    gray: 'bg-gray-100 border-gray-300 text-gray-700',
    green: 'bg-green-100 border-green-300 text-green-700',
    red: 'bg-red-100 border-red-300 text-red-700',
    yellow: 'bg-yellow-100 border-yellow-300 text-yellow-700',
  };

  return (
    <div className={`p-4 rounded-xl border-2 ${colorClasses[color]}`}>
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-3xl font-bold">{value.toLocaleString()}</div>
      <div className="text-sm font-medium mt-1">{label}</div>
    </div>
  );
}

interface CollapsibleSectionProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}

function CollapsibleSection({
  title,
  isOpen,
  onToggle,
  icon,
  children,
}: CollapsibleSectionProps) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-semibold text-gray-900">{title}</span>
        </div>
        {isOpen ? (
          <ChevronDown className="w-5 h-5 text-gray-500" />
        ) : (
          <ChevronRight className="w-5 h-5 text-gray-500" />
        )}
      </button>
      {isOpen && <div className="p-4 bg-white">{children}</div>}
    </div>
  );
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

function generateCSV(result: ImportResult): string {
  let csv = 'Type,Item,Details,Row\n';

  // Add successful imports
  result.success.forEach((item) => {
    csv += `Success,"${escapeCSV(item.title)}","${escapeCSV(item.details || '')}",\n`;
  });

  // Add failed imports
  result.failed.forEach((item) => {
    csv += `Failed,"${escapeCSV(item.item)}","${escapeCSV(item.error)}",${item.rowNumber || ''}\n`;
  });

  // Add warnings
  result.warnings.forEach((item) => {
    csv += `Warning,"${escapeCSV(item.item)}","${escapeCSV(item.message)}",${item.rowNumber || ''}\n`;
  });

  return csv;
}

function escapeCSV(text: string): string {
  return text.replace(/"/g, '""');
}

function downloadCSV(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function generateTextSummary(result: ImportResult): string {
  const { summary, entityPlural } = result;

  let text = `Import Results - ${entityPlural}\n`;
  text += `${'='.repeat(50)}\n\n`;
  text += `Total: ${summary.total}\n`;
  text += `Successful: ${summary.successful}\n`;
  text += `Failed: ${summary.failed}\n`;
  text += `Warnings: ${summary.warnings}\n\n`;

  if (result.failed.length > 0) {
    text += `Failed Items:\n`;
    text += `${'-'.repeat(50)}\n`;
    result.failed.forEach((item, index) => {
      text += `${index + 1}. ${item.item}\n`;
      text += `   Error: ${item.error}\n\n`;
    });
  }

  return text;
}
