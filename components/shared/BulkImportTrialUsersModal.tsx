/**
 * Trial Users Bulk Import Modal - Framework Version
 *
 * Migrated to use the unified Bulk Import Framework
 * AI-powered extraction of trial users from unstructured text
 *
 * Features:
 * - Extracts name, email, role from various formats
 * - 6 role types with intelligent suggestion
 * - Email validation and normalization
 * - Duplicate detection
 * - Confidence scoring
 * - Post-import enrichment for user data completion
 */

'use client';

import React from 'react';
import BulkImportWizard from '@/components/shared/BulkImportWizard';
import { createTrialUsersImporter } from '@/lib/users/trialUsersImporter';
import type { ImportResult, EnrichmentConfig } from '@/components/shared/ImportResultsModal';

// =====================================================
// TYPES
// =====================================================

interface BulkImportTrialUsersModalProps {
  orgId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// =====================================================
// COMPONENT
// =====================================================

export default function BulkImportTrialUsersModal({
  orgId,
  isOpen,
  onClose,
  onSuccess,
}: BulkImportTrialUsersModalProps) {
  // Create importer instance
  const importer = React.useMemo(() => createTrialUsersImporter(orgId), [orgId]);

  // Handle import completion
  const handleComplete = React.useCallback(
    (result: ImportResult) => {
      if (result.summary.successful > 0) {
        onSuccess();
      }
    },
    [onSuccess]
  );

  // Build enrichment config from import result
  const enrichmentConfigBuilder = React.useCallback(
    (result: ImportResult): EnrichmentConfig | undefined => {
      const userIds = result.metadata?.importedEntityIds as string[] | undefined;
      if (!userIds || userIds.length === 0) return undefined;

      return {
        entityIds: userIds,
        entityType: 'user',
        userRole: 'admin', // Default role for enrichment questions
        onEnrichmentComplete: () => {
          // Optionally trigger refresh
        },
      };
    },
    []
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
            title="Bulk Import Trial Users (AI-Powered)"
            enrichmentConfigBuilder={enrichmentConfigBuilder}
            description={
              <div className="space-y-2">
                <p className="text-gray-600">
                  Import trial users from unstructured text using AI. Paste email lists, CSV data, or any text containing user information.
                </p>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm">
                  <p className="font-semibold text-purple-900 mb-1">✨ AI-Powered Extraction</p>
                  <ul className="text-purple-800 space-y-1 ml-4 list-disc">
                    <li><strong>Smart parsing</strong> from any format (CSV, email lists, Slack messages)</li>
                    <li><strong>Email extraction</strong> with validation</li>
                    <li><strong>Name detection</strong> (or extracts from email if missing)</li>
                    <li><strong>Intelligent role suggestion</strong> (Admin, Manager, Developer, Analyst, Designer, User)</li>
                    <li><strong>Duplicate detection</strong> by email address</li>
                    <li><strong>Confidence scoring</strong> for each user</li>
                  </ul>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm">
                  <p className="font-semibold text-gray-900 mb-1">📝 Example Input:</p>
                  <pre className="text-gray-700 whitespace-pre-wrap font-mono text-xs">
{`john.doe@acme.com
Jane Smith <jane@acme.com>
CEO: Bob Johnson (bob@acme.com)
Engineering Lead - Mike Developer <mike@acme.com>
sarah.analyst@acme.com (Data Analyst)
tom@acme.com, lisa@acme.com`}
                  </pre>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                  <p className="font-semibold text-blue-900 mb-1">🎯 Role Assignment Rules:</p>
                  <ul className="text-blue-800 space-y-0.5 ml-4 list-disc text-xs">
                    <li><strong>Admin:</strong> CEO, CTO, Founder, VP, President</li>
                    <li><strong>Manager:</strong> Manager, Lead, Director, Head</li>
                    <li><strong>Developer:</strong> Engineer, Developer, Dev, Programmer</li>
                    <li><strong>Analyst:</strong> Analyst, Data, Research</li>
                    <li><strong>Designer:</strong> Designer, UX, UI, Design</li>
                    <li><strong>User:</strong> Default if role cannot be determined</li>
                  </ul>
                </div>
              </div>
            }
            importer={importer}
            previewColumns={importer.config.preview?.columns || []}
            inputMethod="text" // Text input for AI parsing
            acceptedFileTypes=".txt,.csv"
            onComplete={handleComplete}
            showPreview={true}
            maxPreviewRows={20}
            textPlaceholder={`Paste your user list here. The AI will automatically extract names, emails, and suggest roles.

Examples:
• john.doe@company.com
• Jane Smith <jane@company.com>
• CEO Bob Johnson (bob@company.com)
• Engineering Lead - Mike <mike@company.com>
• sarah.analyst@company.com (Data Analyst)

Supports mixed formats:
• Plain email lists
• CSV-style data
• Email threads
• Slack exports
• Any text with email addresses

The AI will:
• Extract valid email addresses
• Detect names from text or email
• Suggest appropriate roles
• Validate formats
• Detect duplicates
• Score confidence`}
          />
        </div>
      </div>
    </div>
  );
}
