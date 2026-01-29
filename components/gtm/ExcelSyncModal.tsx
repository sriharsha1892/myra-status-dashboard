'use client';

import React, { useState, useCallback } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface ExcelSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncComplete: () => void;
}

interface ParsedRow {
  name?: string;
  stage?: string;
  deal_value?: number;
  sales_poc?: string;
  vertical?: string;
  region?: string;
  trial_start?: string;
  trial_end?: string;
  notes?: string;
  [key: string]: unknown;
}

interface SyncResult {
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ row: number; error: string }>;
}

export default function ExcelSyncModal({ isOpen, onClose, onSyncComplete }: ExcelSyncModalProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [syncMode, setSyncMode] = useState<'merge' | 'replace' | 'append'>('merge');

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const parseExcelFile = async (file: File) => {
    setIsUploading(true);
    setError(null);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json<ParsedRow>(sheet);

      if (json.length === 0) {
        throw new Error('No data found in the Excel file');
      }

      // Extract headers from first row keys
      const firstRow = json[0];
      const detectedHeaders = Object.keys(firstRow);
      setHeaders(detectedHeaders);
      setParsedRows(json);
      setFile(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse Excel file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.csv'))) {
      await parseExcelFile(droppedFile);
    } else {
      setError('Please upload an Excel (.xlsx) or CSV file');
    }
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      await parseExcelFile(selectedFile);
    }
  };

  const handleSync = async () => {
    if (parsedRows.length === 0) return;

    setIsSyncing(true);
    setError(null);
    setSyncResult(null);

    try {
      const response = await fetch('/api/gtm/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: parsedRows, mode: syncMode }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Sync failed');
      }

      const result = await response.json();
      setSyncResult(result.result);
      onSyncComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setIsSyncing(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      const response = await fetch('/api/gtm/sync');
      const template = await response.json();

      // Create a workbook with template structure
      const ws = XLSX.utils.json_to_sheet(template.example);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Organizations');

      // Download
      XLSX.writeFile(wb, 'gtm_import_template.xlsx');
    } catch {
      setError('Failed to download template');
    }
  };

  const resetState = () => {
    setFile(null);
    setParsedRows([]);
    setHeaders([]);
    setError(null);
    setSyncResult(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">Import Organizations</h2>
              <p className="text-sm text-neutral-500">Sync from Excel/CSV</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {syncResult ? (
            // Sync results
            <div className="space-y-6">
              <div className="flex items-center gap-3 text-emerald-600">
                <CheckCircle className="w-8 h-8" />
                <h3 className="text-xl font-semibold">Sync Complete</h3>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-emerald-50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-emerald-600">{syncResult.created}</div>
                  <div className="text-sm text-neutral-600">Created</div>
                </div>
                <div className="bg-blue-50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{syncResult.updated}</div>
                  <div className="text-sm text-neutral-600">Updated</div>
                </div>
                <div className="bg-neutral-50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-neutral-600">{syncResult.skipped}</div>
                  <div className="text-sm text-neutral-600">Skipped</div>
                </div>
              </div>

              {syncResult.errors.length > 0 && (
                <div className="bg-red-50 rounded-xl p-4">
                  <h4 className="font-semibold text-red-700 mb-2">Errors ({syncResult.errors.length})</h4>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {syncResult.errors.slice(0, 10).map((err, i) => (
                      <div key={i} className="text-sm text-red-600">
                        Row {err.row}: {err.error}
                      </div>
                    ))}
                    {syncResult.errors.length > 10 && (
                      <div className="text-sm text-red-500">
                        +{syncResult.errors.length - 10} more errors
                      </div>
                    )}
                  </div>
                </div>
              )}

              <button
                onClick={resetState}
                className="flex items-center gap-2 px-4 py-2 text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Import Another File
              </button>
            </div>
          ) : parsedRows.length > 0 ? (
            // Preview parsed data
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-neutral-900">{file?.name}</h3>
                  <p className="text-sm text-neutral-500">{parsedRows.length} rows detected</p>
                </div>
                <button
                  onClick={resetState}
                  className="text-sm text-neutral-500 hover:text-neutral-700"
                >
                  Change file
                </button>
              </div>

              {/* Sync mode selector */}
              <div className="bg-neutral-50 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-neutral-700 mb-3">Sync Mode</h4>
                <div className="flex gap-2">
                  {[
                    { value: 'merge' as const, label: 'Merge', desc: 'Update existing, create new' },
                    { value: 'replace' as const, label: 'Replace', desc: 'Overwrite existing records' },
                    { value: 'append' as const, label: 'Append', desc: 'Create all as new' },
                  ].map((mode) => (
                    <button
                      key={mode.value}
                      onClick={() => setSyncMode(mode.value)}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors ${
                        syncMode === mode.value
                          ? 'bg-violet-600 text-white'
                          : 'bg-white text-neutral-600 hover:bg-neutral-100'
                      }`}
                    >
                      <div className="font-medium">{mode.label}</div>
                      <div className={`text-xs ${syncMode === mode.value ? 'text-violet-200' : 'text-neutral-400'}`}>
                        {mode.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Column preview */}
              <div className="bg-neutral-50 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-neutral-700 mb-2">Detected Columns</h4>
                <div className="flex flex-wrap gap-2">
                  {headers.map((header) => (
                    <span
                      key={header}
                      className="px-2 py-1 bg-white text-xs font-medium text-neutral-600 rounded"
                    >
                      {header}
                    </span>
                  ))}
                </div>
              </div>

              {/* Data preview */}
              <div className="border border-neutral-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto max-h-60">
                  <table className="w-full text-sm">
                    <thead className="bg-neutral-100 sticky top-0">
                      <tr>
                        {headers.slice(0, 5).map((header) => (
                          <th
                            key={header}
                            className="px-3 py-2 text-left text-xs font-semibold text-neutral-600"
                          >
                            {header}
                          </th>
                        ))}
                        {headers.length > 5 && (
                          <th className="px-3 py-2 text-left text-xs font-semibold text-neutral-400">
                            +{headers.length - 5} more
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {parsedRows.slice(0, 5).map((row, i) => (
                        <tr key={i} className="hover:bg-neutral-50">
                          {headers.slice(0, 5).map((header) => (
                            <td key={header} className="px-3 py-2 text-neutral-700">
                              {String(row[header] ?? '-').substring(0, 30)}
                            </td>
                          ))}
                          {headers.length > 5 && <td className="px-3 py-2">...</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {parsedRows.length > 5 && (
                  <div className="px-3 py-2 bg-neutral-50 text-xs text-neutral-500 border-t border-neutral-200">
                    Showing 5 of {parsedRows.length} rows
                  </div>
                )}
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-lg p-3">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">{error}</span>
                </div>
              )}
            </div>
          ) : (
            // Upload area
            <div className="space-y-4">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`
                  border-2 border-dashed rounded-xl p-8 text-center transition-colors
                  ${isDragging ? 'border-violet-500 bg-violet-50' : 'border-neutral-300 hover:border-violet-400'}
                `}
              >
                {isUploading ? (
                  <Loader2 className="w-12 h-12 mx-auto text-violet-600 animate-spin" />
                ) : (
                  <>
                    <Upload className="w-12 h-12 mx-auto text-neutral-400 mb-4" />
                    <p className="text-neutral-700 font-medium mb-2">
                      Drag and drop your Excel file here
                    </p>
                    <p className="text-neutral-500 text-sm mb-4">
                      or click to browse (.xlsx, .csv)
                    </p>
                    <label className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg font-medium cursor-pointer hover:bg-violet-700 transition-colors">
                      <FileSpreadsheet className="w-4 h-4" />
                      Select File
                      <input
                        type="file"
                        accept=".xlsx,.csv"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </label>
                  </>
                )}
              </div>

              <button
                onClick={downloadTemplate}
                className="flex items-center gap-2 mx-auto text-sm text-violet-600 hover:text-violet-700"
              >
                <Download className="w-4 h-4" />
                Download template
              </button>

              {error && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-lg p-3">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">{error}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {parsedRows.length > 0 && !syncResult && (
          <div className="border-t border-neutral-200 px-6 py-4">
            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-neutral-700 hover:bg-neutral-100 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSync}
                disabled={isSyncing}
                className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 transition-colors disabled:opacity-50"
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Sync {parsedRows.length} Organizations
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {syncResult && (
          <div className="border-t border-neutral-200 px-6 py-4">
            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
