/**
 * Prospects Bulk Import Modal
 *
 * Simple modal for importing prospect contacts (people) via CSV.
 * Uses the reliableImport pipeline via admin imports API.
 */

'use client';

import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface BulkImportProspectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BulkImportProspectsModal({
  isOpen,
  onClose,
  onSuccess,
}: BulkImportProspectsModalProps) {
  const [csvData, setCsvData] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleImport = useCallback(async () => {
    if (!csvData.trim()) {
      setError('Please paste CSV data');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Stage the data
      const prepareRes = await fetch('/api/admin/imports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'prepare',
          entityType: 'prospect',
          name: `Prospect import ${new Date().toISOString().slice(0, 16)}`,
          data: csvData,
        }),
      });

      const prepareResult = await prepareRes.json();
      if (!prepareRes.ok) throw new Error(prepareResult.error);

      const batchId = prepareResult.batchId;

      // Validate
      const validateRes = await fetch('/api/admin/imports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'validate', batchId }),
      });

      const validateResult = await validateRes.json();
      if (!validateRes.ok) throw new Error(validateResult.error);

      // Import validated rows
      const importRes = await fetch('/api/admin/imports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'import', batchId }),
      });

      const importResult = await importRes.json();
      if (!importRes.ok) throw new Error(importResult.error);

      setSuccess(
        `Imported ${importResult.imported} prospects. ` +
        (importResult.skipped > 0 ? `${importResult.skipped} skipped (duplicates). ` : '') +
        (importResult.failed > 0 ? `${importResult.failed} failed. ` : '') +
        (validateResult.failed > 0
          ? `Note: Some rows may need org assignment - check Admin > Imports for details.`
          : '')
      );

      setCsvData('');
      onSuccess();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [csvData, onSuccess]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setCsvData(event.target?.result as string);
    };
    reader.readAsText(file);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Import Prospect Contacts</h2>
          <p className="text-sm text-gray-500 mt-1">
            Upload a CSV file with prospect contacts (people). Each prospect will be linked to an organization.
          </p>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm">
            <p className="font-medium text-blue-900 mb-2">Required columns:</p>
            <ul className="text-blue-800 space-y-1">
              <li><code className="bg-blue-100 px-1 rounded">name</code> - Contact person&apos;s name</li>
              <li><code className="bg-blue-100 px-1 rounded">org_name</code> - Organization/company name</li>
            </ul>
            <p className="font-medium text-blue-900 mt-3 mb-2">Optional columns:</p>
            <ul className="text-blue-800 space-y-1">
              <li><code className="bg-blue-100 px-1 rounded">email</code>, <code className="bg-blue-100 px-1 rounded">title</code>, <code className="bg-blue-100 px-1 rounded">phone</code>, <code className="bg-blue-100 px-1 rounded">linkedin_url</code></li>
              <li><code className="bg-blue-100 px-1 rounded">source</code> (linkedin, cold_outreach, referral, inbound, event)</li>
              <li><code className="bg-blue-100 px-1 rounded">is_primary_contact</code>, <code className="bg-blue-100 px-1 rounded">notes</code></li>
            </ul>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload CSV File
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          {/* Or Paste */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-white text-gray-400">or paste CSV data</span>
            </div>
          </div>

          {/* Text Area */}
          <textarea
            value={csvData}
            onChange={(e) => setCsvData(e.target.value)}
            placeholder="name,org_name,email,title,source&#10;John Smith,Acme Corp,john@acme.com,VP Sales,linkedin&#10;Jane Doe,Beta Inc,jane@beta.io,CEO,cold_outreach"
            rows={8}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
          />

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
              {success}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-between items-center">
          <a
            href="/support/admin/imports"
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Go to Advanced Import
          </a>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={isLoading || !csvData.trim()}
              className={cn(
                'px-4 py-2 rounded-lg font-medium transition-colors',
                isLoading || !csvData.trim()
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              )}
            >
              {isLoading ? 'Importing...' : 'Import Prospects'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
