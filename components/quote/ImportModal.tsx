'use client';

import { useState, useCallback, useRef } from 'react';
import { X, Upload, FileSpreadsheet, ArrowRight, ArrowLeft, Check, AlertCircle, Loader2, Save, ChevronDown } from 'lucide-react';
import {
  parseDelimitedData,
  autoDetectMappings,
  applyMappings,
  detectStage,
  validateEntry,
} from '@/lib/quote/import-mapper';
import type {
  ColumnMapping,
  ImportPreviewRow,
  PipelineStage,
  SalesPipelineEntry,
} from '@/lib/quote/pipeline-types';
import { PIPELINE_FIELDS, STAGE_LABELS, STAGE_COLORS } from '@/lib/quote/pipeline-types';

// Extended preview row type with duplicate tracking
interface ExtendedPreviewRow extends ImportPreviewRow {
  isDuplicate: boolean;
}

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (entries: Partial<SalesPipelineEntry>[]) => Promise<void>;
}

type ImportStep = 1 | 2 | 3;

export default function ImportModal({ isOpen, onClose, onImport }: ImportModalProps) {
  const [step, setStep] = useState<ImportStep>(1);
  const [pastedData, setPastedData] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [previewRows, setPreviewRows] = useState<ExtendedPreviewRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [defaultStage, setDefaultStage] = useState<PipelineStage | 'auto'>('auto');
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = useCallback(() => {
    setStep(1);
    setPastedData('');
    setHeaders([]);
    setRows([]);
    setMappings([]);
    setPreviewRows([]);
    setError(null);
    setDefaultStage('auto');
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [resetState, onClose]);

  // Step 1: Parse data and move to step 2
  const handleParseData = useCallback(() => {
    if (!pastedData.trim()) {
      setError('Please paste some data or upload a file');
      return;
    }

    try {
      const { headers: parsedHeaders, rows: parsedRows } = parseDelimitedData(pastedData);

      if (parsedHeaders.length === 0) {
        setError('Could not detect column headers');
        return;
      }

      if (parsedRows.length === 0) {
        setError('No data rows found');
        return;
      }

      setHeaders(parsedHeaders);
      setRows(parsedRows);
      setMappings(autoDetectMappings(parsedHeaders));
      setError(null);
      setStep(2);
    } catch (err) {
      setError('Failed to parse data: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  }, [pastedData]);

  // Step 2: Generate preview and move to step 3
  const handleGeneratePreview = useCallback(async () => {
    setCheckingDuplicates(true);
    setError(null);

    try {
      // First, collect all emails to check for duplicates
      const emailsToCheck: string[] = [];
      const tempPreview: ExtendedPreviewRow[] = rows.map((row, index) => {
        const { mapped, extra } = applyMappings(row, mappings);

        // Use validateEntry for comprehensive validation
        const validation = validateEntry(mapped);
        const errors = [...validation.errors];
        const warnings = [...validation.warnings];

        // Detect stage
        const detectedStage = defaultStage === 'auto' ? detectStage(mapped) : defaultStage;

        // Add extra_data warning
        if (Object.keys(extra).length > 0) {
          mapped.extra_data = extra;
          warnings.push(`${Object.keys(extra).length} unmapped field(s) will be stored in extra_data`);
        }

        // Collect valid emails for duplicate check
        if (mapped.primary_email && validation.isValid) {
          emailsToCheck.push(mapped.primary_email.toLowerCase());
        }

        return {
          rowIndex: index,
          data: row,
          mappedData: mapped,
          detectedStage,
          errors,
          warnings,
          isDuplicate: false, // Will be updated after API check
        };
      });

      // Check for duplicates via API
      let existingEmails: string[] = [];
      if (emailsToCheck.length > 0) {
        try {
          // Check in batches if needed (URL length limit)
          const batchSize = 50;
          for (let i = 0; i < emailsToCheck.length; i += batchSize) {
            const batch = emailsToCheck.slice(i, i + batchSize);
            const response = await fetch(
              `/api/quote/pipeline?checkEmails=${encodeURIComponent(batch.join(','))}`
            );
            if (response.ok) {
              const data = await response.json();
              existingEmails.push(...(data.existing || []));
            }
          }
        } catch (err) {
          console.warn('Failed to check for duplicates:', err);
          // Continue without duplicate detection
        }
      }

      // Mark duplicates in preview
      const existingSet = new Set(existingEmails.map(e => e.toLowerCase()));
      const finalPreview = tempPreview.map(row => ({
        ...row,
        isDuplicate: row.mappedData.primary_email
          ? existingSet.has(row.mappedData.primary_email.toLowerCase())
          : false,
      }));

      setPreviewRows(finalPreview);
      setStep(3);
    } catch (err) {
      setError('Failed to generate preview: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setCheckingDuplicates(false);
    }
  }, [rows, mappings, defaultStage]);

  // Step 3: Import data
  const handleImport = useCallback(async () => {
    // Filter out rows with errors AND duplicates
    const validRows = previewRows.filter(row => row.errors.length === 0 && !row.isDuplicate);

    if (validRows.length === 0) {
      setError('No valid rows to import (all rows have errors or are duplicates)');
      return;
    }

    setImporting(true);
    setError(null);

    try {
      const entries = validRows.map(row => ({
        ...row.mappedData,
        stage: row.detectedStage,
      }));

      await onImport(entries);
      handleClose();
    } catch (err) {
      setError('Import failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setImporting(false);
    }
  }, [previewRows, onImport, handleClose]);

  // File upload handler
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setPastedData(text);
    };
    reader.onerror = () => {
      setError('Failed to read file');
    };
    reader.readAsText(file);

    // Reset file input
    e.target.value = '';
  }, []);

  // Update single mapping
  const updateMapping = useCallback((sourceColumn: string, targetField: string) => {
    setMappings(prev => prev.map(m =>
      m.sourceColumn === sourceColumn
        ? { ...m, targetField, isManualOverride: true, confidence: targetField ? 1 : 0 }
        : m
    ));
  }, []);

  if (!isOpen) return null;

  const validRowCount = previewRows.filter(r => r.errors.length === 0 && !r.isDuplicate).length;
  const errorRowCount = previewRows.filter(r => r.errors.length > 0).length;
  const warningRowCount = previewRows.filter(r => r.warnings.length > 0 && r.errors.length === 0 && !r.isDuplicate).length;
  const duplicateCount = previewRows.filter(r => r.isDuplicate).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">Import Data</h2>
            <p className="text-sm text-neutral-500">Step {step} of 3</p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="flex px-6 py-3 bg-neutral-50 border-b border-neutral-200">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex-1 flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  s < step
                    ? 'bg-green-500 text-white'
                    : s === step
                    ? 'bg-violet-600 text-white'
                    : 'bg-neutral-200 text-neutral-500'
                }`}
              >
                {s < step ? <Check className="w-4 h-4" /> : s}
              </div>
              <span className={`ml-2 text-sm ${s === step ? 'font-medium text-neutral-900' : 'text-neutral-500'}`}>
                {s === 1 ? 'Upload Data' : s === 2 ? 'Map Columns' : 'Preview & Import'}
              </span>
              {s < 3 && <div className={`flex-1 h-0.5 mx-4 ${s < step ? 'bg-green-500' : 'bg-neutral-200'}`} />}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Step 1: Upload/Paste Data */}
          {step === 1 && (
            <div className="space-y-6">
              {/* File upload area */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-neutral-300 rounded-lg p-8 text-center cursor-pointer hover:border-violet-400 hover:bg-violet-50/50 transition-colors"
              >
                <Upload className="w-12 h-12 mx-auto text-neutral-400 mb-3" />
                <p className="text-neutral-700 font-medium">Drop CSV/Excel file here or click to browse</p>
                <p className="text-sm text-neutral-500 mt-1">Supports .csv, .tsv, .txt files</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.tsv,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-neutral-200" />
                <span className="text-sm text-neutral-500">or paste data</span>
                <div className="flex-1 h-px bg-neutral-200" />
              </div>

              {/* Paste area */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Paste CSV/Tab-separated data
                </label>
                <textarea
                  value={pastedData}
                  onChange={(e) => setPastedData(e.target.value)}
                  placeholder="Paste your data here (including headers)..."
                  className="w-full h-48 p-3 border border-neutral-300 rounded-lg text-sm font-mono resize-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                />
                <p className="mt-2 text-xs text-neutral-500">
                  First row should contain column headers. Data can be comma or tab separated.
                </p>
              </div>

              {pastedData && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-700">
                    {pastedData.split('\n').filter(l => l.trim()).length} lines detected
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Column Mapping */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-neutral-900">Map Columns</h3>
                  <p className="text-sm text-neutral-500">
                    Review and adjust column mappings. Unmapped columns will be stored in extra_data.
                  </p>
                </div>
                <div className="text-sm text-neutral-500">
                  {mappings.filter(m => m.targetField).length} of {mappings.length} mapped
                </div>
              </div>

              <div className="border border-neutral-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-neutral-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Your Column</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Maps To</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase w-24">Confidence</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {mappings.map((mapping) => (
                      <tr key={mapping.sourceColumn} className="hover:bg-neutral-50">
                        <td className="px-4 py-3">
                          <span className="font-mono text-sm text-neutral-700">{mapping.sourceColumn}</span>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={mapping.targetField}
                            onChange={(e) => updateMapping(mapping.sourceColumn, e.target.value)}
                            className="w-full px-3 py-1.5 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500"
                          >
                            <option value="">-- Skip / Store in extra_data --</option>
                            {PIPELINE_FIELDS.map((field) => (
                              <option key={field.field} value={field.field}>
                                {field.label} {field.required ? '*' : ''}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          {mapping.targetField && (
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                mapping.confidence >= 0.9
                                  ? 'bg-green-100 text-green-700'
                                  : mapping.confidence >= 0.7
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-neutral-100 text-neutral-600'
                              }`}
                            >
                              {mapping.isManualOverride ? 'Manual' : `${Math.round(mapping.confidence * 100)}%`}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Default stage selector */}
              <div className="flex items-center gap-4 p-4 bg-neutral-50 rounded-lg">
                <label className="text-sm font-medium text-neutral-700">Default Stage:</label>
                <select
                  value={defaultStage}
                  onChange={(e) => setDefaultStage(e.target.value as PipelineStage | 'auto')}
                  className="px-3 py-1.5 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500"
                >
                  <option value="auto">Auto-detect from data</option>
                  {Object.entries(STAGE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                <span className="text-xs text-neutral-500">
                  Auto-detect uses payment, dates, and invoice data to determine stage
                </span>
              </div>
            </div>
          )}

          {/* Step 3: Preview & Import */}
          {step === 3 && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-4 gap-3">
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-green-600" />
                    <span className="text-2xl font-bold text-green-700">{validRowCount}</span>
                  </div>
                  <p className="text-sm text-green-600 mt-1">Ready to import</p>
                </div>
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                    <span className="text-2xl font-bold text-amber-700">{warningRowCount}</span>
                  </div>
                  <p className="text-sm text-amber-600 mt-1">With warnings</p>
                </div>
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <X className="w-5 h-5 text-red-600" />
                    <span className="text-2xl font-bold text-red-700">{errorRowCount}</span>
                  </div>
                  <p className="text-sm text-red-600 mt-1">Errors (skipped)</p>
                </div>
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-orange-600" />
                    <span className="text-2xl font-bold text-orange-700">{duplicateCount}</span>
                  </div>
                  <p className="text-sm text-orange-600 mt-1">Duplicates (skipped)</p>
                </div>
              </div>

              {/* Preview table */}
              <div className="border border-neutral-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-80">
                  <table className="w-full">
                    <thead className="bg-neutral-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Company</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Email</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Value</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Stage</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {previewRows.slice(0, 50).map((row) => (
                        <tr
                          key={row.rowIndex}
                          className={
                            row.errors.length > 0
                              ? 'bg-red-50'
                              : row.isDuplicate
                              ? 'bg-orange-50'
                              : row.warnings.length > 0
                              ? 'bg-amber-50'
                              : ''
                          }
                        >
                          <td className="px-4 py-3">
                            {row.errors.length > 0 ? (
                              <span className="text-red-600 text-xs" title={row.errors.join(', ')}>
                                <X className="w-4 h-4" />
                              </span>
                            ) : row.isDuplicate ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700">
                                Already exists
                              </span>
                            ) : row.warnings.length > 0 ? (
                              <span className="text-amber-600 text-xs" title={row.warnings.join(', ')}>
                                <AlertCircle className="w-4 h-4" />
                              </span>
                            ) : (
                              <span className="text-green-600">
                                <Check className="w-4 h-4" />
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-neutral-700">
                            {row.mappedData.company_name || <span className="text-red-500">Missing</span>}
                          </td>
                          <td className="px-4 py-3 text-sm text-neutral-600 font-mono">
                            {row.mappedData.primary_email || <span className="text-red-500">Missing</span>}
                          </td>
                          <td className="px-4 py-3 text-sm text-neutral-600">
                            {row.mappedData.deal_value
                              ? `$${row.mappedData.deal_value.toLocaleString()}`
                              : '-'}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                                STAGE_COLORS[row.detectedStage].bg
                              } ${STAGE_COLORS[row.detectedStage].text}`}
                            >
                              {STAGE_LABELS[row.detectedStage]}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {previewRows.length > 50 && (
                  <div className="px-4 py-2 bg-neutral-50 text-sm text-neutral-500 text-center">
                    Showing first 50 rows of {previewRows.length}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-200 bg-neutral-50">
          <div>
            {step === 1 && (
              <span className="text-sm text-neutral-500">{rows.length} rows detected</span>
            )}
            {step === 2 && (
              <span className="text-sm text-neutral-500">
                {rows.length} rows • {mappings.filter(m => m.targetField).length} columns mapped
              </span>
            )}
            {step === 3 && (
              <span className="text-sm text-neutral-500">
                {validRowCount} of {previewRows.length} rows will be imported
                {duplicateCount > 0 && ` (${duplicateCount} duplicate${duplicateCount > 1 ? 's' : ''} skipped)`}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {step > 1 && (
              <button
                onClick={() => setStep((step - 1) as ImportStep)}
                className="px-4 py-2 text-neutral-700 hover:bg-neutral-100 rounded-lg flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            )}
            {step === 1 && (
              <button
                onClick={handleParseData}
                disabled={!pastedData.trim()}
                className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
            {step === 2 && (
              <button
                onClick={handleGeneratePreview}
                disabled={checkingDuplicates}
                className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {checkingDuplicates ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    Preview
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            )}
            {step === 3 && (
              <button
                onClick={handleImport}
                disabled={importing || validRowCount === 0}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {importing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Import {validRowCount} Records
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
