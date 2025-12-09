/**
 * Timeline Events Bulk Import Modal - Framework Version
 *
 * Migrated to use the unified Bulk Import Framework
 * AI-powered extraction of timeline events from unstructured text
 *
 * Features:
 * - Extracts 47 event types across 7 categories
 * - Sentiment analysis (positive/neutral/negative)
 * - Confidence scoring
 * - Follow-up detection
 * - People and feature mentions extraction
 */

'use client';

import React from 'react';
import BulkImportWizard from '@/components/shared/BulkImportWizard';
import { createTimelineEventsImporter } from '@/lib/timeline/timelineEventsImporter';

// =====================================================
// TYPES
// =====================================================

interface BulkImportTimelineEventsModalProps {
  orgId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// =====================================================
// COMPONENT
// =====================================================

export default function BulkImportTimelineEventsModal({
  orgId,
  isOpen,
  onClose,
  onSuccess,
}: BulkImportTimelineEventsModalProps) {
  // Create importer instance
  const importer = React.useMemo(() => createTimelineEventsImporter(orgId), [orgId]);

  // Handle import completion
  const handleComplete = React.useCallback(
    (result) => {
      if (result.summary.successful > 0) {
        onSuccess();
      }
    },
    [onSuccess]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Wizard */}
        <div className="p-6">
          <BulkImportWizard
            title="Bulk Import Timeline Events (AI-Powered)"
            description={
              <div className="space-y-2">
                <p className="text-gray-600">
                  Import timeline events from unstructured text using AI. Paste your notes, emails, or meeting transcripts.
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                  <p className="font-semibold text-blue-900 mb-1">✨ AI-Powered Extraction</p>
                  <ul className="text-blue-800 space-y-1 ml-4 list-disc">
                    <li><strong>47 event types</strong> across 7 categories (onboarding, engagement, communication, feedback, support, milestones, sales notes, learnings)</li>
                    <li><strong>Sentiment analysis</strong> (positive, neutral, negative)</li>
                    <li><strong>Automatic date extraction</strong> from natural language</li>
                    <li><strong>People & feature mentions</strong> detection</li>
                    <li><strong>Follow-up detection</strong> with suggested dates</li>
                    <li><strong>Confidence scoring</strong> for each extracted event</li>
                  </ul>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm">
                  <p className="font-semibold text-gray-900 mb-1">📝 Example Input:</p>
                  <pre className="text-gray-700 whitespace-pre-wrap font-mono text-xs">
{`2024-01-15: John from Acme Corp requested trial access
Jan 20: Had a great call with Sarah about reporting features
Meeting yesterday - Tom mentioned they're having issues with data export
Need to follow up next week about their integration requirements`}
                  </pre>
                </div>
              </div>
            }
            importer={importer}
            previewColumns={importer.config.preview?.columns || []}
            inputMethod="text" // Text input for AI parsing
            acceptedFileTypes=".txt"
            onComplete={handleComplete}
            showPreview={true}
            maxPreviewRows={20}
            textPlaceholder={`Paste your timeline notes here. The AI will automatically extract events.

Examples:
- "2024-01-15: User requested demo"
- "Yesterday: Had meeting with John about feature X"
- "Last week we shipped the new dashboard"
- "Customer reported bug with export functionality"

The AI will extract:
• Event types (47 types available)
• Dates (flexible parsing)
• Sentiment (positive/neutral/negative)
• People mentioned
• Features mentioned
• Follow-up requirements`}
          />
        </div>
      </div>
    </div>
  );
}
