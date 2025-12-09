/**
 * CSV Organizations Bulk Import Modal
 *
 * Uses unified BulkImportWizard component for consistent UX
 *
 * Features:
 * - Unified UI with step-by-step wizard
 * - CSV file parsing with header mapping
 * - Single-user per organization handling
 * - Domain normalization (6 standard domains)
 * - Logo URL generation (Clearbit + UI Avatars fallback)
 */

'use client';

import React, { useMemo } from 'react';
import { X } from 'lucide-react';
import BulkImportWizard from './BulkImportWizard';
import { createCSVOrganizationsImporter } from '@/lib/organizations/csvOrganizationsImporter';

interface BulkImportCSVOrganizationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BulkImportCSVOrganizationsModal({
  isOpen,
  onClose,
  onSuccess,
}: BulkImportCSVOrganizationsModalProps) {
  // Create importer instance (memoized)
  const importer = useMemo(() => createCSVOrganizationsImporter(), []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">
            Import Organizations from CSV
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
            description="Upload a CSV file with organization and contact information. Required columns: org_name, contact_email. Optional: website_url, domain_category, contact_name, contact_designation, sales_poc_name."
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
