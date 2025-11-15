// @ts-nocheck
'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import Papa from 'papaparse';
import {
  createImportResults,
  addSuccess,
  addFailure,
  generateImportSummary,
  getImportToastMessage
} from '@/lib/errors/importResultsFormatter';
import { getErrorMessage } from '@/lib/errorHandler';

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

export default function BulkImportFeatureRequestsModal({
  orgId,
  isOpen,
  onClose,
  onSuccess,
}: BulkImportFeatureRequestsModalProps) {
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ParsedFeatureRequest[]>([]);
  const [step, setStep] = useState<'upload' | 'preview' | 'importing'>('upload');

  const supabase = createClient();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.match(/\.(csv|xlsx?)$/i)) {
      toast.error('Please upload a CSV or Excel file');
      return;
    }

    setFile(selectedFile);

    // Parse the file
    if (selectedFile.name.endsWith('.csv')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const csv = event.target?.result as string;
        Papa.parse(csv, {
          header: true,
          complete: (results) => {
            setPreview(results.data.filter((row: any) => row.title)); // Filter out empty rows
            setStep('preview');
          },
          error: (error) => {
            toast.error(`Error parsing CSV: ${error.message}`);
          },
        });
      };
      reader.readAsText(selectedFile);
    } else {
      // For Excel files, we'll use a simple approach
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          // You would typically use xlsx library here
          // For now, show a message that Excel support requires xlsx library
          toast.error('Excel import requires xlsx library. Please use CSV format or contact support.');
          setFile(null);
        } catch (error: any) {
          toast.error(`Error parsing Excel: ${error.message}`);
        }
      };
      reader.readAsArrayBuffer(selectedFile);
    }
  };

  const handleImport = async () => {
    if (preview.length === 0) {
      toast.error('No valid records to import');
      return;
    }

    setStep('importing');
    setLoading(true);

    // Create import results tracker
    const importResults = createImportResults<ParsedFeatureRequest>();
    let totalProcessed = 0;

    try {
      const recordsToInsert = preview
        .filter((row) => row.title && row.title.trim()) // Must have title
        .map((row) => ({
          org_id: orgId,
          title: (row.title || '').trim(),
          description: (row.description || '').trim() || null,
          use_case: (row.use_case || '').trim() || null,
          priority: (['low', 'medium', 'high', 'critical'].includes(row.priority?.toLowerCase())
            ? row.priority?.toLowerCase()
            : 'medium') as 'low' | 'medium' | 'high' | 'critical',
          status: 'submitted' as const,
          votes: 0,
        }));

      if (recordsToInsert.length === 0) {
        toast.error('No valid records with title field');
        setStep('preview');
        setLoading(false);
        return;
      }

      // Insert in batches of 100 with error collection
      for (let i = 0; i < recordsToInsert.length; i += 100) {
        const batch = recordsToInsert.slice(i, i + 100);
        const batchStartIndex = i;

        try {
          const { data, error } = await supabase
            .from('feature_requests')
            .insert(batch)
            .select('id, title');

          if (error) throw error;

          // Track all successful inserts from this batch
          if (data) {
            data.forEach((record, idx) => {
              addSuccess(importResults, record.id, preview[batchStartIndex + idx]);
              totalProcessed++;
            });
          }

          // Show progress toast
          if (recordsToInsert.length > 100) {
            toast.success(`Imported ${Math.min(i + 100, recordsToInsert.length)}/${recordsToInsert.length} records`, { duration: 2000 });
          }
        } catch (batchError: any) {
          // Track batch failure - add each item in the failed batch to failures
          batch.forEach((record, idx) => {
            addFailure(
              importResults,
              preview[batchStartIndex + idx],
              batchError,
              'generic'
            );
          });

          // Log for debugging
          console.error('[Bulk Import] Batch failed:', {
            batchIndex: i / 100 + 1,
            batchSize: batch.length,
            error: batchError.message
          });
        }
      }

      // Generate summary
      const summary = generateImportSummary(importResults, 'feature requests', recordsToInsert.length);

      // Show appropriate toast based on results
      if (summary.success) {
        toast.success(`✅ Successfully imported all ${summary.successCount} feature requests!`, { duration: 5000 });
        setFile(null);
        setPreview([]);
        setStep('upload');
        onClose();
        onSuccess();
      } else if (summary.successCount > 0) {
        // Partial success
        const message = `⚠️ Imported ${summary.successCount}/${summary.totalAttempted} feature requests\n\n${summary.failureCount} failed. Some records may have duplicates or validation issues.`;
        toast.error(message, { duration: 8000 });
        setStep('preview');
      } else {
        // Complete failure
        const errorDetails = getErrorMessage(importResults.failed[0]?.error || 'Unknown error', 'generic');
        toast.error(`❌ Failed to import feature requests\n\n${errorDetails.message}`, { duration: 7000 });
        setStep('preview');
      }

      // Log summary for debugging
      console.log('[Bulk Import] Import complete:', {
        total: summary.totalAttempted,
        succeeded: summary.successCount,
        failed: summary.failureCount
      });
    } catch (error: any) {
      // Unexpected error during preparation
      const errorDetails = getErrorMessage(error, 'generic');
      console.error('[Bulk Import] Unexpected error:', {
        error: error.message,
        technical: errorDetails.technical,
        stack: error.stack
      });

      toast.error(`Failed to import: ${errorDetails.message}\n\n${errorDetails.suggestion || 'Please try again.'}`, {
        duration: 7000
      });
      setStep('preview');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Bulk Import Feature Requests</h2>
            <p className="text-sm text-gray-500 mt-1">Import past feature requests from CSV file</p>
          </div>
          <button
            onClick={() => {
              onClose();
              setFile(null);
              setPreview([]);
              setStep('upload');
            }}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* UPLOAD STEP */}
          {step === 'upload' && (
            <div className="space-y-4">
              {/* CSV Template Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-blue-900 mb-2">📋 CSV Template Format</p>
                <p className="text-xs text-blue-800 mb-3">
                  Your CSV file should have these columns (at minimum):
                </p>
                <div className="bg-white p-3 rounded font-mono text-xs text-gray-700 overflow-x-auto">
                  <div>title,description,use_case,priority</div>
                  <div className="text-gray-500 mt-2"># Example:</div>
                  <div>Dark Mode Support,Add dark mode theme,UX improvement,high</div>
                  <div>Real-time Sync,Live data sync across devices,Critical feature,critical</div>
                </div>
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Select CSV File *</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 hover:bg-blue-50 transition-colors">
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileSelect}
                    disabled={loading}
                    className="hidden"
                    id="file-input"
                  />
                  <label htmlFor="file-input" className="cursor-pointer block">
                    <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-sm font-medium text-gray-700">
                      {file ? file.name : 'Click to select or drag and drop'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">CSV, XLSX files are supported</p>
                  </label>
                </div>
              </div>

              {/* Info Box */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex gap-2 items-start">
                  <span className="text-lg mt-0.5">💡</span>
                  <div>
                    <p className="text-sm font-semibold text-amber-900">Tips for successful import</p>
                    <ul className="text-xs text-amber-800 mt-1 space-y-1 list-disc list-inside">
                      <li>Ensure your CSV has a header row with column names</li>
                      <li>Title field is required for each row</li>
                      <li>Valid priorities: low, medium, high, critical (defaults to medium)</li>
                      <li>All requests will be imported with status "submitted" and 0 votes</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PREVIEW STEP */}
          {step === 'preview' && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-green-900">
                  ✅ {preview.length} records ready to import
                </p>
              </div>

              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-sm border-collapse">
                  <thead className="sticky top-0 bg-gray-100 border-b border-gray-300">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold text-gray-900">Title</th>
                      <th className="text-left px-3 py-2 font-semibold text-gray-900">Priority</th>
                      <th className="text-left px-3 py-2 font-semibold text-gray-900">Description Preview</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 20).map((row, idx) => (
                      <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-900 font-medium">{row.title}</td>
                        <td className="px-3 py-2">
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold">
                            {row.priority || 'medium'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-gray-600 truncate text-xs">
                          {row.description ? row.description.substring(0, 50) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {preview.length > 20 && (
                  <div className="p-4 text-center text-xs text-gray-600 bg-gray-50 border-t border-gray-200">
                    ... and {preview.length - 20} more records
                  </div>
                )}
              </div>
            </div>
          )}

          {/* IMPORTING STEP */}
          {step === 'importing' && (
            <div className="py-8 text-center">
              <svg className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-gray-900 font-semibold">Importing feature requests...</p>
              <p className="text-sm text-gray-600 mt-1">This may take a moment depending on file size</p>
            </div>
          )}

          {/* Action Buttons */}
          {step !== 'importing' && (
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  setFile(null);
                  setPreview([]);
                  setStep('upload');
                }}
                className="flex-1 h-10 px-4 bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-lg transition-all duration-200 border border-gray-300"
              >
                Cancel
              </button>

              {step === 'preview' && (
                <>
                  <button
                    onClick={() => {
                      setFile(null);
                      setPreview([]);
                      setStep('upload');
                    }}
                    className="flex-1 h-10 px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-semibold rounded-lg transition-all duration-200"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={loading}
                    className="flex-1 h-10 px-4 bg-accent-500 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Import {preview.length} Records</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
