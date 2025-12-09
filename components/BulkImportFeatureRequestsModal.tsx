/**
 * Feature Requests Bulk Import Modal
 *
 * Uses the unified Bulk Import Framework with BulkImportWizard
 *
 * Benefits:
 * - Standardized UI with BulkImportWizard
 * - Automatic error handling and retry
 * - Progress tracking
 * - Consistent results display
 * - Reusable validation logic
 */

'use client';

import React from 'react';
import { BulkImporter, createCSVParser, createFieldBasedDuplicateDetector } from '@/lib/bulkImport';
import BulkImportWizard from '@/components/shared/BulkImportWizard';
import { validateField, normalizePriority } from '@/lib/validation/bulkImport';

// =====================================================
// TYPES
// =====================================================

interface BulkImportFeatureRequestsModalProps {
  orgId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ParsedFeatureRequest {
  title?: string;
  description?: string;
  use_case?: string;
  priority?: string;
  [key: string]: any;
}

interface FeatureRequestRecord {
  org_id: string;
  title: string;
  description: string | null;
  use_case: string | null;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'submitted';
  votes: number;
}

// =====================================================
// IMPORTER CONFIGURATION
// =====================================================

function createFeatureRequestImporter(orgId: string) {
  return new BulkImporter<ParsedFeatureRequest, FeatureRequestRecord>({
    // Entity information
    entityType: 'feature request',
    entityPlural: 'feature requests',

    // Parser: CSV with expected headers
    parser: createCSVParser<ParsedFeatureRequest>({
      expectedHeaders: ['title'], // Only title is required
      hasHeader: true,
      trimValues: true,
      skipEmptyLines: true,
    }),

    // Validator: Ensure title is present
    validator: (item, index) => {
      return validateField('title', item.title, [{ type: 'required' }]);
    },

    // Transformer: Convert parsed CSV to database format
    transformer: (item) => ({
      org_id: orgId,
      title: (item.title || '').trim(),
      description: (item.description || '').trim() || null,
      use_case: (item.use_case || '').trim() || null,
      priority: normalizePriority(item.priority, 'medium'),
      status: 'submitted',
      votes: 0,
    }),

    // Database configuration
    database: {
      tableName: 'feature_requests',
      batchSize: 100,
      delayBetweenBatches: 0,
    },

    // Duplicate detection: Check for duplicate titles
    duplicateDetector: createFieldBasedDuplicateDetector<FeatureRequestRecord>(
      'title',
      'skip' // Skip duplicates
    ),

    // Preview columns
    preview: {
      maxRows: 20,
      columns: [
        { key: 'title', label: 'Title', width: '40%' },
        {
          key: 'priority',
          label: 'Priority',
          width: '15%',
          formatter: (value) => (value || 'medium').toUpperCase(),
        },
        {
          key: 'description',
          label: 'Description Preview',
          width: '45%',
          formatter: (value) => (value ? String(value).substring(0, 50) : '-'),
        },
      ],
    },

    // Success message builder
    successMessageBuilder: (item) => ({
      title: item.title,
      details: `Priority: ${item.priority}`,
    }),
  });
}

// =====================================================
// COMPONENT
// =====================================================

export default function BulkImportFeatureRequestsModal({
  orgId,
  isOpen,
  onClose,
  onSuccess,
}: BulkImportFeatureRequestsModalProps) {
  // Create importer instance
  const importer = React.useMemo(() => createFeatureRequestImporter(orgId), [orgId]);

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
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
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
            title="Bulk Import Feature Requests"
            description="Import feature requests from CSV. Required columns: title. Optional: description, use_case, priority (low/medium/high/critical)."
            importer={importer}
            previewColumns={importer.config.preview?.columns || []}
            inputMethod="file"
            acceptedFileTypes=".csv"
            onComplete={handleComplete}
            showPreview={true}
            maxPreviewRows={20}
          />
        </div>
      </div>
    </div>
  );
}
