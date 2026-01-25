'use client';

import { useState, useMemo } from 'react';
import {
  X,
  CheckCircle,
  AlertTriangle,
  PlusCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Check,
  SkipForward,
  Save,
  Building,
  ArrowRight,
} from 'lucide-react';
import type { ReviewRow } from '@/app/api/sync/excel-import/route';
import type { DbRecord, FieldDiff } from '@/lib/sync/fuzzy-matcher';

interface ExcelReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  reviewRows: ReviewRow[];
  dbRecords: DbRecord[];
  summary: {
    totalRows: number;
    exactMatches: number;
    fuzzyMatches: number;
    noMatches: number;
    totalDiffs: number;
  };
  onCommit: (
    rows: Array<{
      rowIndex: number;
      excelData: Record<string, unknown>;
      selectedMatchId: string | null;
      fieldResolutions: Record<string, 'keep_db' | 'use_excel'>;
      status: 'matched' | 'new' | 'skipped';
    }>
  ) => Promise<void>;
  isCommitting: boolean;
}

interface EditableReviewRow extends ReviewRow {
  fieldResolutions: Record<string, 'keep_db' | 'use_excel'>;
}

export default function ExcelReviewModal({
  isOpen,
  onClose,
  reviewRows,
  dbRecords,
  summary,
  onCommit,
  isCommitting,
}: ExcelReviewModalProps) {
  // Initialize editable rows with default resolutions
  const [editableRows, setEditableRows] = useState<EditableReviewRow[]>(() =>
    reviewRows.map((row) => ({
      ...row,
      fieldResolutions: Object.fromEntries(
        row.fieldDiffs.map((diff) => [
          diff.field,
          row.status === 'matched' ? 'keep_db' : 'use_excel',
        ])
      ),
    }))
  );

  const [expandedRows, setExpandedRows] = useState<Set<number>>(() => {
    // Auto-expand fuzzy matches and new records
    const expanded = new Set<number>();
    reviewRows.forEach((row, index) => {
      if (row.status === 'fuzzy' || row.status === 'new') {
        expanded.add(index);
      }
    });
    return expanded;
  });

  const [filter, setFilter] = useState<'all' | 'matched' | 'fuzzy' | 'new' | 'skipped'>('all');

  // Filter rows based on selection
  const filteredRows = useMemo(() => {
    if (filter === 'all') return editableRows;
    return editableRows.filter((row) => row.status === filter);
  }, [editableRows, filter]);

  // Handle company selection change
  const handleCompanyChange = (rowIndex: number, matchId: string | null) => {
    setEditableRows((prev) =>
      prev.map((row, i) => {
        if (i !== rowIndex) return row;

        const newStatus: EditableReviewRow['status'] =
          matchId === null ? 'new' : matchId === 'skip' ? 'skipped' : 'matched';

        // Find the new match to recalculate diffs
        let newFieldDiffs: FieldDiff[] = [];
        if (matchId && matchId !== 'skip') {
          const matchedRecord = dbRecords.find((r) => r.id === matchId);
          if (matchedRecord) {
            // Recalculate diffs for the new match
            // This is a simplified version - in production, call the API
            newFieldDiffs = row.fieldDiffs; // Keep existing for now
          }
        }

        return {
          ...row,
          selectedMatchId: matchId === 'skip' ? null : matchId,
          status: newStatus,
          fieldDiffs: newFieldDiffs,
          fieldResolutions:
            newStatus === 'new'
              ? Object.fromEntries(row.fieldDiffs.map((d) => [d.field, 'use_excel' as const]))
              : row.fieldResolutions,
        };
      })
    );
  };

  // Handle field resolution change
  const handleFieldResolution = (
    rowIndex: number,
    field: string,
    resolution: 'keep_db' | 'use_excel'
  ) => {
    setEditableRows((prev) =>
      prev.map((row, i) => {
        if (i !== rowIndex) return row;
        return {
          ...row,
          fieldResolutions: {
            ...row.fieldResolutions,
            [field]: resolution,
          },
        };
      })
    );
  };

  // Toggle row expansion
  const toggleRowExpansion = (index: number) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  // Skip row
  const handleSkipRow = (rowIndex: number) => {
    setEditableRows((prev) =>
      prev.map((row, i) => {
        if (i !== rowIndex) return row;
        return { ...row, status: 'skipped' };
      })
    );
  };

  // Handle commit
  const handleCommit = async () => {
    const rowsToCommit = editableRows
      .filter((row) => row.status !== 'skipped')
      .map((row) => ({
        rowIndex: row.rowIndex,
        excelData: row.excelData,
        selectedMatchId: row.selectedMatchId,
        fieldResolutions: row.fieldResolutions,
        status: row.status === 'fuzzy' ? ('matched' as const) : (row.status as 'matched' | 'new'),
      }));

    await onCommit(rowsToCommit);
  };

  // Stats
  const stats = useMemo(() => {
    const toCreate = editableRows.filter((r) => r.status === 'new').length;
    const toUpdate = editableRows.filter(
      (r) => (r.status === 'matched' || r.status === 'fuzzy') && r.fieldDiffs.length > 0
    ).length;
    const toSkip = editableRows.filter((r) => r.status === 'skipped').length;
    const unchanged = editableRows.filter(
      (r) => (r.status === 'matched' || r.status === 'fuzzy') && r.fieldDiffs.length === 0
    ).length;
    return { toCreate, toUpdate, toSkip, unchanged };
  }, [editableRows]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-[95vw] max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
          <div>
            <h2 className="text-xl font-semibold text-neutral-900">Review Import Data</h2>
            <p className="text-sm text-neutral-500 mt-1">
              Review and resolve conflicts before importing
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Summary Bar */}
        <div className="px-6 py-3 bg-neutral-50 border-b border-neutral-200">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span className="text-sm text-neutral-600">
                <strong className="text-emerald-700">{summary.exactMatches}</strong> exact matches
              </span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span className="text-sm text-neutral-600">
                <strong className="text-amber-700">{summary.fuzzyMatches}</strong> fuzzy matches
              </span>
            </div>
            <div className="flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-neutral-600">
                <strong className="text-blue-700">{summary.noMatches}</strong> new records
              </span>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm text-neutral-600">
                <strong>{summary.totalDiffs}</strong> field differences
              </span>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="px-6 py-2 border-b border-neutral-200 flex items-center gap-2">
          {(['all', 'matched', 'fuzzy', 'new', 'skipped'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                filter === f
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              <span className="ml-1.5 text-xs opacity-70">
                (
                {f === 'all'
                  ? editableRows.length
                  : editableRows.filter((r) => r.status === f).length}
                )
              </span>
            </button>
          ))}
        </div>

        {/* Rows List */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {filteredRows.length === 0 ? (
            <div className="text-center py-12 text-neutral-500">
              No rows match the selected filter
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRows.map((row, displayIndex) => {
                const actualIndex = editableRows.findIndex((r) => r.rowIndex === row.rowIndex);
                const isExpanded = expandedRows.has(actualIndex);
                const companyName = row.excelData.company_name as string;

                return (
                  <div
                    key={row.rowIndex}
                    className={`border rounded-xl overflow-hidden transition-all ${
                      row.status === 'matched'
                        ? 'border-emerald-200 bg-emerald-50/30'
                        : row.status === 'fuzzy'
                          ? 'border-amber-200 bg-amber-50/30'
                          : row.status === 'new'
                            ? 'border-blue-200 bg-blue-50/30'
                            : 'border-neutral-200 bg-neutral-50/50 opacity-60'
                    }`}
                  >
                    {/* Row Header */}
                    <div
                      className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-white/50 transition-colors"
                      onClick={() => toggleRowExpansion(actualIndex)}
                    >
                      {/* Status Icon */}
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          row.status === 'matched'
                            ? 'bg-emerald-100 text-emerald-600'
                            : row.status === 'fuzzy'
                              ? 'bg-amber-100 text-amber-600'
                              : row.status === 'new'
                                ? 'bg-blue-100 text-blue-600'
                                : 'bg-neutral-200 text-neutral-500'
                        }`}
                      >
                        {row.status === 'matched' ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : row.status === 'fuzzy' ? (
                          <AlertTriangle className="w-4 h-4" />
                        ) : row.status === 'new' ? (
                          <PlusCircle className="w-4 h-4" />
                        ) : (
                          <SkipForward className="w-4 h-4" />
                        )}
                      </div>

                      {/* Company Name */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-neutral-900 truncate">{companyName}</p>
                        <p className="text-xs text-neutral-500">
                          {row.status === 'matched' && 'Exact match found'}
                          {row.status === 'fuzzy' &&
                            `Similar: ${row.matchResult.suggestedMatch?.company_name} (${row.matchResult.matches[0]?.similarity}%)`}
                          {row.status === 'new' && 'No match - will create new record'}
                          {row.status === 'skipped' && 'Skipped - will not import'}
                        </p>
                      </div>

                      {/* Diff Count */}
                      {row.fieldDiffs.length > 0 && row.status !== 'skipped' && (
                        <div className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded">
                          {row.fieldDiffs.length} diff{row.fieldDiffs.length !== 1 ? 's' : ''}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        {row.status !== 'skipped' && (
                          <button
                            onClick={() => handleSkipRow(actualIndex)}
                            className="px-2 py-1 text-xs text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded transition-colors"
                          >
                            Skip
                          </button>
                        )}
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-neutral-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-neutral-400" />
                        )}
                      </div>
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && row.status !== 'skipped' && (
                      <div className="px-4 pb-4 pt-2 border-t border-neutral-200/50">
                        {/* Company Match Selection */}
                        <div className="mb-4">
                          <label className="block text-xs font-medium text-neutral-500 mb-2">
                            <Building className="w-3 h-3 inline mr-1" />
                            Match to existing company
                          </label>
                          <select
                            value={row.selectedMatchId || 'new'}
                            onChange={(e) => {
                              const val = e.target.value;
                              handleCompanyChange(
                                actualIndex,
                                val === 'new' ? null : val === 'skip' ? 'skip' : val
                              );
                            }}
                            className={`w-full px-3 py-2 text-sm border rounded-lg ${
                              row.status === 'matched'
                                ? 'border-emerald-300 bg-emerald-50'
                                : row.status === 'fuzzy'
                                  ? 'border-amber-300 bg-amber-50'
                                  : 'border-blue-300 bg-blue-50'
                            }`}
                          >
                            <option value="new">➕ Create new company: {companyName}</option>
                            <option value="skip">⏭️ Skip this row</option>
                            <optgroup label="Top Matches">
                              {row.matchResult.matches.slice(0, 5).map((match) => (
                                <option key={match.dbRecord.id} value={match.dbRecord.id}>
                                  {match.similarity === 100 ? '✓' : '~'}{' '}
                                  {match.dbRecord.company_name} ({match.similarity}% match
                                  {match.matchedBy === 'email'
                                    ? ' by email'
                                    : match.matchedBy === 'both'
                                      ? ' by name+email'
                                      : ''}
                                  )
                                </option>
                              ))}
                            </optgroup>
                            {dbRecords.length > 0 && (
                              <optgroup label="All Companies">
                                {dbRecords
                                  .filter(
                                    (r) => !row.matchResult.matches.find((m) => m.dbRecord.id === r.id)
                                  )
                                  .slice(0, 20)
                                  .map((record) => (
                                    <option key={record.id} value={record.id}>
                                      {record.company_name}
                                    </option>
                                  ))}
                              </optgroup>
                            )}
                          </select>
                        </div>

                        {/* Field Diffs */}
                        {row.fieldDiffs.length > 0 && row.status !== 'new' && (
                          <div>
                            <label className="block text-xs font-medium text-neutral-500 mb-2">
                              Field Differences
                            </label>
                            <div className="space-y-2">
                              {row.fieldDiffs.map((diff) => (
                                <div
                                  key={diff.field}
                                  className="flex items-center gap-3 p-3 bg-white rounded-lg border border-neutral-200"
                                >
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-neutral-500 mb-1">
                                      {diff.label}
                                    </p>
                                    <div className="flex items-center gap-2 text-sm">
                                      <span
                                        className={`px-2 py-0.5 rounded ${
                                          row.fieldResolutions[diff.field] === 'keep_db'
                                            ? 'bg-emerald-100 text-emerald-700 font-medium'
                                            : 'bg-neutral-100 text-neutral-600'
                                        }`}
                                      >
                                        DB: {formatValue(diff.dbValue)}
                                      </span>
                                      <ArrowRight className="w-3 h-3 text-neutral-400 flex-shrink-0" />
                                      <span
                                        className={`px-2 py-0.5 rounded ${
                                          row.fieldResolutions[diff.field] === 'use_excel'
                                            ? 'bg-blue-100 text-blue-700 font-medium'
                                            : 'bg-neutral-100 text-neutral-600'
                                        }`}
                                      >
                                        Excel: {formatValue(diff.excelValue)}
                                      </span>
                                    </div>
                                  </div>
                                  <select
                                    value={row.fieldResolutions[diff.field] || 'keep_db'}
                                    onChange={(e) =>
                                      handleFieldResolution(
                                        actualIndex,
                                        diff.field,
                                        e.target.value as 'keep_db' | 'use_excel'
                                      )
                                    }
                                    className="px-3 py-1.5 text-sm border border-neutral-200 rounded-lg bg-white"
                                  >
                                    <option value="keep_db">Keep DB value</option>
                                    <option value="use_excel">Use Excel value</option>
                                  </select>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* New Record Preview */}
                        {row.status === 'new' && (
                          <div>
                            <label className="block text-xs font-medium text-neutral-500 mb-2">
                              New Record Data
                            </label>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              {Object.entries(row.excelData)
                                .filter(
                                  ([key]) =>
                                    !['extra_data', 'raw_row'].includes(key) &&
                                    row.excelData[key] != null
                                )
                                .map(([key, value]) => (
                                  <div
                                    key={key}
                                    className="flex items-center gap-2 px-3 py-2 bg-white rounded border border-neutral-200"
                                  >
                                    <span className="text-xs text-neutral-500 w-24 truncate">
                                      {formatFieldName(key)}:
                                    </span>
                                    <span className="text-neutral-900 truncate">
                                      {formatValue(value)}
                                    </span>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-200 bg-neutral-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm text-neutral-600">
              <span>
                <strong className="text-blue-700">{stats.toCreate}</strong> to create
              </span>
              <span>
                <strong className="text-emerald-700">{stats.toUpdate}</strong> to update
              </span>
              <span>
                <strong className="text-neutral-500">{stats.unchanged}</strong> unchanged
              </span>
              <span>
                <strong className="text-neutral-400">{stats.toSkip}</strong> skipped
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-neutral-600 hover:text-neutral-800 hover:bg-neutral-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCommit}
                disabled={isCommitting || stats.toCreate + stats.toUpdate === 0}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isCommitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Commit Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper functions
function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '(empty)';
  if (typeof value === 'number') {
    if (value > 1000) return `$${(value / 1000).toFixed(1)}K`;
    return value.toString();
  }
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function formatFieldName(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
