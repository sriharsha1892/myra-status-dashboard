'use client';

import { useState, useCallback } from 'react';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Eye,
  ClipboardPaste,
  FileUp,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import ExcelReviewModal from './ExcelReviewModal';
import type { ReviewRow } from '@/app/api/sync/excel-import/route';
import type { DbRecord } from '@/lib/sync/fuzzy-matcher';

interface CommitResult {
  success: boolean;
  summary: {
    created: number;
    updated: number;
    skipped: number;
    errors: string[];
  };
}

interface AnalyzeResponse {
  success: boolean;
  reviewRows: ReviewRow[];
  summary: {
    totalRows: number;
    exactMatches: number;
    fuzzyMatches: number;
    noMatches: number;
    totalDiffs: number;
  };
  dbRecords: DbRecord[];
}

interface ParsedData {
  rows: Record<string, unknown>[];
  columns: string[];
  fileName: string;
  source: 'file' | 'paste';
}

// Fixed column order for copy-paste (no headers)
const FIXED_COLUMNS = [
  'external_id',      // ID (Don't Edit)
  'demo_date',        // Date
  'demo_time',        // Time
  'sales_poc',        // Sales POC
  'contact_email',    // Email
  'company_name',     // Company Name
  'contact_title',    // Title/Role
  'domain',           // Domain
  'demo_status',      // Demo Status
  'stage',            // Stage
  'arr',              // ARR
  'deal_value',       // Deal Value
  'expected_close',   // Closing Month
];

// Expected column names for validation (case-insensitive matching)
const EXPECTED_COLUMN_KEYWORDS = [
  'company', 'email', 'stage', 'deal', 'value', 'poc', 'sales', 'demo', 'date', 'status'
];

// Helper to check if detected columns seem reasonable
export function validateDetectedColumns(columns: string[]): { valid: boolean; warning: string | null } {
  if (columns.length === 0) {
    return { valid: false, warning: 'No columns detected in the data' };
  }

  // Check if at least some expected keywords are present in column names
  const columnNamesLower = columns.map(c => c.toLowerCase());
  const matchedKeywords = EXPECTED_COLUMN_KEYWORDS.filter(keyword =>
    columnNamesLower.some(col => col.includes(keyword))
  );

  if (matchedKeywords.length < 3) {
    return {
      valid: true, // Still allow import, but warn
      warning: `Column headers may not match expected format. Found columns: ${columns.slice(0, 5).join(', ')}${columns.length > 5 ? '...' : ''}. Expected columns like: company_name, email, stage, deal_value, etc.`,
    };
  }

  // Check for key required columns
  const hasCompany = columnNamesLower.some(c => c.includes('company'));
  const hasEmailOrContact = columnNamesLower.some(c => c.includes('email') || c.includes('contact'));

  if (!hasCompany) {
    return {
      valid: true,
      warning: 'Warning: No "company" column detected. Import may not work correctly.',
    };
  }

  return { valid: true, warning: null };
}

export default function ExcelImportSection() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [commitResult, setCommitResult] = useState<CommitResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [columnWarning, setColumnWarning] = useState<string | null>(null);

  // Review modal state
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [analyzeResponse, setAnalyzeResponse] = useState<AnalyzeResponse | null>(null);

  // Input mode state
  const [inputMode, setInputMode] = useState<'file' | 'paste'>('file');
  const [pasteText, setPasteText] = useState('');

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const parseExcelFile = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);
    setCommitResult(null);
    setColumnWarning(null);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });

      // Get first sheet
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      // Convert to JSON
      const jsonData = XLSX.utils.sheet_to_json(sheet, {
        raw: false,
        defval: '',
      }) as Record<string, unknown>[];

      if (jsonData.length === 0) {
        setError('No data found in Excel file');
        return;
      }

      const columns = Object.keys(jsonData[0]);

      // Validate detected columns
      const { warning } = validateDetectedColumns(columns);
      if (warning) {
        setColumnWarning(warning);
      }

      setParsedData({
        rows: jsonData,
        columns,
        fileName: file.name,
        source: 'file',
      });
    } catch (err) {
      setError(
        `Failed to parse Excel file: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Parse tab-separated text from copy-paste
  const parseTabSeparatedText = useCallback((text: string) => {
    setIsLoading(true);
    setError(null);
    setCommitResult(null);
    setColumnWarning(null);

    try {
      const lines = text.trim().split('\n').filter(line => line.trim());

      if (lines.length === 0) {
        setError('No data found in pasted text');
        setIsLoading(false);
        return;
      }

      // Check if first row looks like headers or data
      const firstRow = lines[0].split('\t');

      // Improved header detection:
      // 1. Check for common header keywords
      // 2. Check for ID pattern (DEMO-XXXX-X)
      // 3. Check if it looks like a date or number
      const firstCellLower = firstRow[0]?.toLowerCase() || '';
      const looksLikeHeaderKeyword = ['id', 'date', 'company', 'email', 'name', 'poc', 'status'].some(
        keyword => firstCellLower.includes(keyword)
      );
      const looksLikeDataId = /^DEMO-\d{4}-\d+$/.test(firstRow[0] || '');
      const looksLikeDate = /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(firstRow[0] || '');

      const hasHeaders = looksLikeHeaderKeyword || (!looksLikeDataId && !looksLikeDate && isNaN(Number(firstRow[0])));

      let dataLines = lines;
      let columns = FIXED_COLUMNS;

      if (hasHeaders) {
        // First row is headers - use them
        columns = firstRow.map(h => h.trim());
        dataLines = lines.slice(1);
      }

      const rows: Record<string, unknown>[] = dataLines.map(line => {
        const values = line.split('\t');
        const row: Record<string, unknown> = {};

        columns.forEach((col, index) => {
          row[col] = values[index]?.trim() || '';
        });

        return row;
      });

      if (rows.length === 0) {
        setError('No data rows found in pasted text');
        setIsLoading(false);
        return;
      }

      // Validate columns
      const { warning } = validateDetectedColumns(columns);
      if (warning) {
        setColumnWarning(warning);
      }

      setParsedData({
        rows,
        columns,
        fileName: `Pasted data (${rows.length} rows)`,
        source: 'paste',
      });
    } catch (err) {
      setError(
        `Failed to parse pasted data: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handlePasteSubmit = useCallback(() => {
    if (pasteText.trim()) {
      parseTabSeparatedText(pasteText);
    }
  }, [pasteText, parseTabSeparatedText]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (
        file &&
        (file.name.endsWith('.xlsx') ||
          file.name.endsWith('.xls') ||
          file.name.endsWith('.csv'))
      ) {
        parseExcelFile(file);
      } else {
        setError('Please upload an Excel file (.xlsx, .xls) or CSV file');
      }
    },
    [parseExcelFile]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        parseExcelFile(file);
      }
    },
    [parseExcelFile]
  );

  // Step 1: Analyze data and show review modal
  const handleAnalyze = async () => {
    if (!parsedData) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch('/api/sync/excel-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: parsedData.rows,
          action: 'analyze',
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Analysis failed');
      }

      setAnalyzeResponse(result);
      setShowReviewModal(true);
    } catch (err) {
      setError(
        `Analysis failed: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Step 2: Commit reviewed changes
  const handleCommit = async (
    rows: Array<{
      rowIndex: number;
      excelData: Record<string, unknown>;
      selectedMatchId: string | null;
      fieldResolutions: Record<string, 'keep_db' | 'use_excel'>;
      status: 'matched' | 'new' | 'skipped';
    }>
  ) => {
    setIsCommitting(true);
    setError(null);

    try {
      const response = await fetch('/api/sync/excel-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'commit',
          reviewRows: rows,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Commit failed');
      }

      setCommitResult(result);
      setShowReviewModal(false);
      setAnalyzeResponse(null);
      setParsedData(null);
    } catch (err) {
      setError(
        `Commit failed: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    } finally {
      setIsCommitting(false);
    }
  };

  const reset = () => {
    setParsedData(null);
    setCommitResult(null);
    setAnalyzeResponse(null);
    setShowReviewModal(false);
    setError(null);
    setColumnWarning(null);
    setPasteText('');
  };

  return (
    <div className="bg-white rounded-2xl border border-neutral-200/60 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-neutral-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <FileSpreadsheet className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-neutral-900">Excel Data Import</h3>
            <p className="text-sm text-neutral-500">
              Import demos and pipeline data from Excel
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-neutral-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-neutral-400" />
        )}
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-6 pb-6 border-t border-neutral-100">
          {/* Error Display */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">Import Error</p>
                <p className="text-sm text-red-600">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-400 hover:text-red-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Column Warning Display */}
          {columnWarning && (
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">Column Header Warning</p>
                <p className="text-sm text-amber-600">{columnWarning}</p>
              </div>
              <button
                onClick={() => setColumnWarning(null)}
                className="ml-auto text-amber-400 hover:text-amber-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Commit Result */}
          {commitResult && (
            <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <p className="font-medium text-emerald-800">Import Complete</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-emerald-600">Created</p>
                  <p className="text-lg font-semibold text-emerald-800">
                    {commitResult.summary.created}
                  </p>
                </div>
                <div>
                  <p className="text-emerald-600">Updated</p>
                  <p className="text-lg font-semibold text-emerald-800">
                    {commitResult.summary.updated}
                  </p>
                </div>
                <div>
                  <p className="text-emerald-600">Skipped</p>
                  <p className="text-lg font-semibold text-emerald-800">
                    {commitResult.summary.skipped}
                  </p>
                </div>
                <div>
                  <p className="text-emerald-600">Errors</p>
                  <p className="text-lg font-semibold text-emerald-800">
                    {commitResult.summary.errors.length}
                  </p>
                </div>
              </div>
              {commitResult.summary.errors.length > 0 && (
                <div className="mt-3 pt-3 border-t border-emerald-200">
                  <p className="text-sm font-medium text-emerald-700 mb-2">
                    Errors:
                  </p>
                  <ul className="text-xs text-emerald-600 space-y-1 max-h-24 overflow-y-auto">
                    {commitResult.summary.errors.slice(0, 10).map((err, i) => (
                      <li key={i}>• {err}</li>
                    ))}
                    {commitResult.summary.errors.length > 10 && (
                      <li>
                        ... and {commitResult.summary.errors.length - 10} more
                      </li>
                    )}
                  </ul>
                </div>
              )}
              <button
                onClick={reset}
                className="mt-4 text-sm text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
              >
                <RefreshCw className="w-4 h-4" />
                Import Another File
              </button>
            </div>
          )}

          {/* Input Mode Toggle */}
          {!parsedData && !commitResult && (
            <div className="mt-4">
              {/* Mode Tabs */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setInputMode('file')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    inputMode === 'file'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  <FileUp className="w-4 h-4" />
                  Upload File
                </button>
                <button
                  onClick={() => setInputMode('paste')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    inputMode === 'paste'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  <ClipboardPaste className="w-4 h-4" />
                  Copy & Paste
                </button>
              </div>

              {/* File Upload Mode */}
              {inputMode === 'file' && (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                    isDragging
                      ? 'border-blue-400 bg-blue-50'
                      : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  {isLoading ? (
                    <div className="flex flex-col items-center">
                      <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
                      <p className="text-neutral-600">Parsing file...</p>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-10 h-10 text-neutral-400 mx-auto mb-3" />
                      <p className="text-neutral-600 mb-2">
                        Drag & drop your Excel file here
                      </p>
                      <p className="text-sm text-neutral-400 mb-4">
                        or click to browse
                      </p>
                      <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors">
                        <FileSpreadsheet className="w-4 h-4" />
                        Select File
                        <input
                          type="file"
                          accept=".xlsx,.xls,.csv"
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                      </label>
                    </>
                  )}
                </div>
              )}

              {/* Copy-Paste Mode */}
              {inputMode === 'paste' && (
                <div className="space-y-3">
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-sm text-amber-800">
                      <strong>Tip:</strong> Copy rows from Excel (Ctrl+A → Ctrl+C) and paste below.
                      The system will auto-detect if headers are included.
                    </p>
                  </div>
                  <textarea
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    placeholder="Paste your Excel data here (tab-separated)..."
                    className="w-full h-48 px-4 py-3 border border-neutral-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-neutral-500">
                      {pasteText.trim().split('\n').filter(l => l.trim()).length} lines detected
                    </p>
                    <button
                      onClick={handlePasteSubmit}
                      disabled={!pasteText.trim() || isLoading}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                      Parse Data
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Preview */}
          {parsedData && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-medium text-neutral-900">
                    {parsedData.fileName}
                  </p>
                  <p className="text-sm text-neutral-500">
                    {parsedData.rows.length} rows · {parsedData.columns.length}{' '}
                    columns
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={reset}
                    className="px-3 py-1.5 text-sm text-neutral-600 hover:text-neutral-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {isAnalyzing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                    Review & Import
                  </button>
                </div>
              </div>

              {/* Column Preview */}
              <div className="bg-neutral-50 rounded-lg p-3 mb-3">
                <p className="text-xs font-medium text-neutral-500 mb-2">
                  Detected Columns:
                </p>
                <div className="flex flex-wrap gap-1">
                  {parsedData.columns.map((col) => (
                    <span
                      key={col}
                      className="px-2 py-0.5 bg-white border border-neutral-200 rounded text-xs text-neutral-700"
                    >
                      {col}
                    </span>
                  ))}
                </div>
              </div>

              {/* Data Preview Table */}
              <div className="border border-neutral-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-60">
                  <table className="w-full text-sm">
                    <thead className="bg-neutral-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500">
                          #
                        </th>
                        {parsedData.columns.slice(0, 6).map((col) => (
                          <th
                            key={col}
                            className="px-3 py-2 text-left text-xs font-medium text-neutral-500 truncate max-w-32"
                          >
                            {col}
                          </th>
                        ))}
                        {parsedData.columns.length > 6 && (
                          <th className="px-3 py-2 text-left text-xs font-medium text-neutral-400">
                            +{parsedData.columns.length - 6} more
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {parsedData.rows.slice(0, 5).map((row, i) => (
                        <tr key={i} className="border-t border-neutral-100">
                          <td className="px-3 py-2 text-neutral-400">{i + 1}</td>
                          {parsedData.columns.slice(0, 6).map((col) => (
                            <td
                              key={col}
                              className="px-3 py-2 text-neutral-700 truncate max-w-32"
                            >
                              {String(row[col] || '-')}
                            </td>
                          ))}
                          {parsedData.columns.length > 6 && (
                            <td className="px-3 py-2 text-neutral-400">...</td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {parsedData.rows.length > 5 && (
                  <div className="px-3 py-2 bg-neutral-50 text-xs text-neutral-500 border-t border-neutral-200">
                    Showing 5 of {parsedData.rows.length} rows
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Review Modal */}
          {analyzeResponse && (
            <ExcelReviewModal
              isOpen={showReviewModal}
              onClose={() => {
                setShowReviewModal(false);
                setAnalyzeResponse(null);
              }}
              reviewRows={analyzeResponse.reviewRows}
              dbRecords={analyzeResponse.dbRecords}
              summary={analyzeResponse.summary}
              onCommit={handleCommit}
              isCommitting={isCommitting}
            />
          )}
        </div>
      )}
    </div>
  );
}
