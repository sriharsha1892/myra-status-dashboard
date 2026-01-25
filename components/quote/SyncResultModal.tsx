'use client';

import { useState } from 'react';
import {
  X,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  PlusCircle,
  Edit3,
  SkipForward,
  XCircle,
} from 'lucide-react';

interface ChangeDetail {
  type: 'created' | 'updated' | 'skipped' | 'error';
  identifier: string; // Company name or user name
  fields?: Array<{
    field: string;
    oldValue?: string;
    newValue?: string;
  }>;
  error?: string;
}

interface SyncResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncAnother: () => void;
  title: string;
  summary: {
    created: number;
    updated: number;
    skipped: number;
    errors: number;
  };
  details?: ChangeDetail[];
}

export default function SyncResultModal({
  isOpen,
  onClose,
  onSyncAnother,
  title,
  summary,
  details = [],
}: SyncResultModalProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'created' | 'updated' | 'skipped' | 'error'>('all');

  const filteredDetails = filterType === 'all'
    ? details
    : details.filter(d => d.type === filterType);

  const hasErrors = summary.errors > 0;
  const isSuccess = !hasErrors && (summary.created > 0 || summary.updated > 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-[95vw] max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className={`px-6 py-4 border-b ${
          hasErrors ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {hasErrors ? (
                <AlertCircle className="w-6 h-6 text-amber-600" />
              ) : (
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              )}
              <div>
                <h2 className="text-lg font-semibold text-neutral-900">
                  {title} {isSuccess ? 'Complete' : 'Finished'}
                </h2>
                <p className="text-sm text-neutral-500">
                  {hasErrors
                    ? 'Completed with some errors'
                    : summary.created + summary.updated === 0
                      ? 'No changes were made'
                      : 'All changes applied successfully'
                  }
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-white/50 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="px-6 py-4 grid grid-cols-4 gap-4 border-b border-neutral-200">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <PlusCircle className="w-4 h-4 text-blue-500" />
              <span className="text-2xl font-bold text-blue-600">{summary.created}</span>
            </div>
            <p className="text-xs text-neutral-500">Created</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Edit3 className="w-4 h-4 text-emerald-500" />
              <span className="text-2xl font-bold text-emerald-600">{summary.updated}</span>
            </div>
            <p className="text-xs text-neutral-500">Updated</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <SkipForward className="w-4 h-4 text-neutral-400" />
              <span className="text-2xl font-bold text-neutral-500">{summary.skipped}</span>
            </div>
            <p className="text-xs text-neutral-500">Skipped</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <XCircle className="w-4 h-4 text-red-500" />
              <span className="text-2xl font-bold text-red-600">{summary.errors}</span>
            </div>
            <p className="text-xs text-neutral-500">Errors</p>
          </div>
        </div>

        {/* Details Toggle */}
        {details.length > 0 && (
          <div className="px-6 py-3 border-b border-neutral-200">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900"
            >
              {showDetails ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
              {showDetails ? 'Hide' : 'Show'} detailed changes ({details.length} items)
            </button>
          </div>
        )}

        {/* Details List */}
        {showDetails && details.length > 0 && (
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Filter Tabs */}
            <div className="px-6 py-2 border-b border-neutral-100 flex gap-2">
              {(['all', 'created', 'updated', 'skipped', 'error'] as const).map((type) => {
                const count = type === 'all' ? details.length : details.filter(d => d.type === type).length;
                if (count === 0 && type !== 'all') return null;
                return (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      filterType === type
                        ? 'bg-neutral-900 text-white'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)} ({count})
                  </button>
                );
              })}
            </div>

            {/* Scrollable List */}
            <div className="flex-1 overflow-y-auto px-6 py-3">
              <div className="space-y-2">
                {filteredDetails.map((detail, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border ${
                      detail.type === 'created'
                        ? 'bg-blue-50/50 border-blue-200'
                        : detail.type === 'updated'
                          ? 'bg-emerald-50/50 border-emerald-200'
                          : detail.type === 'error'
                            ? 'bg-red-50/50 border-red-200'
                            : 'bg-neutral-50/50 border-neutral-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {detail.type === 'created' && <PlusCircle className="w-4 h-4 text-blue-500" />}
                      {detail.type === 'updated' && <Edit3 className="w-4 h-4 text-emerald-500" />}
                      {detail.type === 'skipped' && <SkipForward className="w-4 h-4 text-neutral-400" />}
                      {detail.type === 'error' && <XCircle className="w-4 h-4 text-red-500" />}
                      <span className="font-medium text-neutral-900">{detail.identifier}</span>
                      <span className={`ml-auto text-xs px-2 py-0.5 rounded ${
                        detail.type === 'created'
                          ? 'bg-blue-100 text-blue-700'
                          : detail.type === 'updated'
                            ? 'bg-emerald-100 text-emerald-700'
                            : detail.type === 'error'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-neutral-200 text-neutral-600'
                      }`}>
                        {detail.type}
                      </span>
                    </div>

                    {/* Field Changes */}
                    {detail.fields && detail.fields.length > 0 && (
                      <div className="mt-2 pl-6 space-y-1">
                        {detail.fields.map((field, fIndex) => (
                          <div key={fIndex} className="text-xs text-neutral-600">
                            <span className="font-medium">{field.field}:</span>{' '}
                            {field.oldValue && (
                              <span className="line-through text-neutral-400">{field.oldValue}</span>
                            )}
                            {field.oldValue && field.newValue && ' → '}
                            {field.newValue && (
                              <span className="text-emerald-600">{field.newValue}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Error Message */}
                    {detail.error && (
                      <p className="mt-2 pl-6 text-xs text-red-600">{detail.error}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-200 bg-neutral-50 flex items-center justify-end gap-3">
          <button
            onClick={onSyncAnother}
            className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-600 hover:text-neutral-800 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Sync Another
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
