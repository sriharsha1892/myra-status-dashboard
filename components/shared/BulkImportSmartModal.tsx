/**
 * Smart Import Modal
 *
 * Uses unified BulkImportWizard component for consistent UX
 *
 * "Smart" Features:
 * - Auto-detect domain category from org name/description
 * - Flexible column mappings (org_name, organization, company all work)
 * - Smart defaults for missing fields
 * - Logo URL generation
 */

'use client';

import React, { useMemo } from 'react';
import { X, Sparkles } from 'lucide-react';
import BulkImportWizard from './BulkImportWizard';
import { createSmartImporter } from '@/lib/organizations/smartImporter';

interface BulkImportSmartModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BulkImportSmartModal({
  isOpen,
  onClose,
  onSuccess,
}: BulkImportSmartModalProps) {
  // Create importer instance (memoized)
  const importer = useMemo(() => createSmartImporter(), []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-50 to-blue-50 border-b border-purple-200 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-purple-600" />
            <h2 className="text-2xl font-bold text-gray-900">
              Smart Import Organizations
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-lg hover:bg-white/50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Smart Features Info */}
        <div className="px-6 py-4 bg-gradient-to-r from-purple-50/50 to-blue-50/50 border-b border-purple-100">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-semibold text-purple-900 mb-1">Auto-Detect Domain</p>
              <p className="text-purple-700">TMT, NEO, AF&B, E&C, HC, AAD from org name</p>
            </div>
            <div>
              <p className="font-semibold text-purple-900 mb-1">Flexible Columns</p>
              <p className="text-purple-700">org_name, organization, company all work</p>
            </div>
            <div>
              <p className="font-semibold text-purple-900 mb-1">Smart Defaults</p>
              <p className="text-purple-700">Auto-fills missing fields intelligently</p>
            </div>
            <div>
              <p className="font-semibold text-purple-900 mb-1">Logo Generation</p>
              <p className="text-purple-700">Clearbit logos or generated placeholders</p>
            </div>
          </div>
        </div>

        {/* Wizard Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <BulkImportWizard
            title=""
            description="Upload a CSV file. Required: org_name (or organization/company). Optional: website_url, domain_category (auto-detected), description, contact_email, contact_name."
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
