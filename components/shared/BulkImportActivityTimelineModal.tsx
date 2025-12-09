/**
 * Activity Timeline Bulk Import Modal
 *
 * Uses unified BulkImportWizard component for consistent UX
 *
 * Features:
 * - Unified UI with step-by-step wizard
 * - CSV file parsing
 * - Organization name → ID lookup
 * - Multiple event types
 */

'use client';

import React, { useMemo } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import BulkImportWizard from './BulkImportWizard';
import { createActivityTimelineImporter, VALID_EVENT_TYPES } from '@/lib/activities/activityTimelineImporter';

interface BulkImportActivityTimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BulkImportActivityTimelineModal({
  isOpen,
  onClose,
  onSuccess,
}: BulkImportActivityTimelineModalProps) {
  const { user } = useAuth();

  // Create importer instance with user ID (memoized)
  const importer = useMemo(() => {
    if (!user?.id) return null;
    return createActivityTimelineImporter(user.id);
  }, [user?.id]);

  if (!isOpen) return null;

  if (!user || !importer) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
          <p className="text-red-600 font-medium">
            You must be logged in to import activity events.
          </p>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">
            Import Activity Timeline Events
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-lg hover:bg-gray-100"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Wizard Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <BulkImportWizard
            title=""
            description={`Upload a CSV file with activity events. Required columns: org_name, event_date, title. Optional: event_type (${VALID_EVENT_TYPES.join(', ')}), description. Organization names must match existing organizations.`}
            importer={importer}
            previewColumns={importer.config.preview?.columns || []}
            inputMethod="file"
            acceptedFileTypes=".csv"
            showPreview={true}
            maxPreviewRows={15}
            onComplete={(result) => {
              if (result.summary.successful > 0) {
                onSuccess();
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
