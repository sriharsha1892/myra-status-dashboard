'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Copy,
  Trash2,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  FileText,
  Calendar,
  DollarSign,
  Check,
  Loader2,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface DuplicateQuote {
  id: string;
  quoteReference: string;
  version: number;
  totalValue: number;
  createdAt: string;
  isLatest: boolean;
}

interface DuplicateGroup {
  groupKey: string;
  companyName: string;
  contactEmail: string;
  totalVersions: number;
  quotes: DuplicateQuote[];
}

interface DuplicatesData {
  groups: DuplicateGroup[];
  stats: {
    totalGroups: number;
    totalDuplicates: number;
    totalQuotes: number;
  };
}

export default function DuplicatesManager() {
  const [data, setData] = useState<DuplicatesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [selectedForDeletion, setSelectedForDeletion] = useState<Set<string>>(new Set());

  const fetchDuplicates = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/quote/duplicates');
      if (!response.ok) throw new Error('Failed to fetch');
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Failed to fetch duplicates:', error);
      toast.error('Failed to load duplicates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDuplicates();
  }, [fetchDuplicates]);

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const toggleSelection = (quoteId: string) => {
    setSelectedForDeletion((prev) => {
      const next = new Set(prev);
      if (next.has(quoteId)) {
        next.delete(quoteId);
      } else {
        next.add(quoteId);
      }
      return next;
    });
  };

  const handleDelete = async (quoteIds: string[]) => {
    if (quoteIds.length === 0) return;

    setActionLoading('delete');
    try {
      const response = await fetch('/api/quote/duplicates', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quoteIds }),
      });

      if (!response.ok) throw new Error('Delete failed');

      const result = await response.json();
      toast.success(`Deleted ${result.deleted} quote${result.deleted !== 1 ? 's' : ''}`);
      setSelectedForDeletion(new Set());
      await fetchDuplicates();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete quotes');
    } finally {
      setActionLoading(null);
    }
  };

  const handleKeepLatest = async (groupKey: string) => {
    setActionLoading(groupKey);
    try {
      const response = await fetch('/api/quote/duplicates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'keep-latest', groupKey }),
      });

      if (!response.ok) throw new Error('Action failed');

      const result = await response.json();
      toast.success(`Cleaned up ${result.deleted} duplicate${result.deleted !== 1 ? 's' : ''}`);
      await fetchDuplicates();
    } catch (error) {
      console.error('Keep latest error:', error);
      toast.error('Failed to clean duplicates');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCleanAll = async () => {
    setActionLoading('clean-all');
    try {
      const response = await fetch('/api/quote/duplicates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clean-all' }),
      });

      if (!response.ok) throw new Error('Action failed');

      const result = await response.json();
      toast.success(result.message || `Cleaned up ${result.deleted} duplicates`);
      await fetchDuplicates();
    } catch (error) {
      console.error('Clean all error:', error);
      toast.error('Failed to clean all duplicates');
    } finally {
      setActionLoading(null);
    }
  };

  const formatCurrency = (value: number): string => {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-neutral-200/60 p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-violet-600 animate-spin" />
        </div>
      </div>
    );
  }

  if (!data || data.stats.totalGroups === 0) {
    return (
      <div className="bg-white rounded-2xl border border-neutral-200/60 p-6">
        <div className="flex flex-col items-center justify-center py-8">
          <Check className="w-12 h-12 text-emerald-500 mb-3" />
          <h3 className="font-semibold text-neutral-900 mb-1">No Duplicates</h3>
          <p className="text-sm text-neutral-500 text-center">
            All quotes are unique. No duplicate versions detected.
          </p>
          <button
            onClick={fetchDuplicates}
            className="mt-4 flex items-center gap-2 text-sm text-violet-600 hover:text-violet-700"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-neutral-200/60 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-neutral-100 bg-amber-50/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Copy className="w-5 h-5 text-amber-600" />
            <h3 className="font-semibold text-neutral-900">
              Duplicate Versions
            </h3>
            <span className="px-2 py-0.5 text-xs bg-amber-200 text-amber-800 rounded-full">
              {data.stats.totalGroups} group{data.stats.totalGroups !== 1 ? 's' : ''}
            </span>
            <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">
              {data.stats.totalDuplicates} to clean
            </span>
          </div>
          <div className="flex items-center gap-2">
            {selectedForDeletion.size > 0 && (
              <button
                onClick={() => handleDelete(Array.from(selectedForDeletion))}
                disabled={actionLoading !== null}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                {actionLoading === 'delete' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Delete Selected ({selectedForDeletion.size})
              </button>
            )}
            <button
              onClick={fetchDuplicates}
              disabled={loading}
              className="p-1.5 hover:bg-amber-100 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 text-amber-600 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Info banner */}
      <div className="px-5 py-3 bg-amber-50 border-b border-amber-100">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            These are quotes with identical content created multiple times.
            Click "Keep Latest Only" to remove older duplicates, or select specific versions to delete.
          </p>
        </div>
      </div>

      {/* Duplicate groups */}
      <div className="divide-y divide-neutral-100 max-h-[500px] overflow-y-auto">
        {data.groups.map((group) => {
          const isExpanded = expandedGroups.has(group.groupKey);
          const latestQuote = group.quotes[0];
          const isGroupLoading = actionLoading === group.groupKey;

          return (
            <div key={group.groupKey}>
              {/* Group header */}
              <button
                onClick={() => toggleGroup(group.groupKey)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-neutral-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-neutral-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-neutral-400" />
                  )}
                  <div className="text-left">
                    <h4 className="font-medium text-neutral-900">
                      {group.companyName}
                    </h4>
                    <p className="text-sm text-neutral-500">
                      {group.contactEmail}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-neutral-500">
                    {group.totalVersions} version{group.totalVersions !== 1 ? 's' : ''}
                  </span>
                  <span className="text-sm font-medium text-neutral-700">
                    Latest: {formatCurrency(latestQuote.totalValue)}
                  </span>
                </div>
              </button>

              {/* Expanded versions */}
              {isExpanded && (
                <div className="px-5 pb-4">
                  <div className="ml-7 space-y-2">
                    {group.quotes.map((quote) => {
                      const isSelected = selectedForDeletion.has(quote.id);

                      return (
                        <div
                          key={quote.id}
                          className={`flex items-center justify-between p-3 rounded-xl border ${
                            quote.isLatest
                              ? 'bg-emerald-50 border-emerald-200'
                              : isSelected
                                ? 'bg-red-50 border-red-200'
                                : 'bg-neutral-50 border-neutral-200'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {!quote.isLatest && (
                              <button
                                onClick={() => toggleSelection(quote.id)}
                                className={`w-5 h-5 rounded border flex items-center justify-center ${
                                  isSelected
                                    ? 'bg-red-500 border-red-500 text-white'
                                    : 'border-neutral-300 hover:border-neutral-400'
                                }`}
                              >
                                {isSelected && <Check className="w-3 h-3" />}
                              </button>
                            )}
                            <FileText
                              className={`w-4 h-4 ${
                                quote.isLatest ? 'text-emerald-600' : 'text-neutral-400'
                              }`}
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-neutral-900">
                                  {quote.quoteReference || `Version ${quote.version}`}
                                </span>
                                {quote.isLatest && (
                                  <span className="px-1.5 py-0.5 text-xs bg-emerald-200 text-emerald-800 rounded">
                                    Latest
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-xs text-neutral-500">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {formatDate(quote.createdAt)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <DollarSign className="w-3 h-3" />
                                  {formatCurrency(quote.totalValue)}
                                </span>
                              </div>
                            </div>
                          </div>
                          {!quote.isLatest && (
                            <button
                              onClick={() => handleDelete([quote.id])}
                              disabled={actionLoading !== null}
                              className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Delete this version"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Group actions */}
                  <div className="ml-7 mt-3 flex items-center gap-2">
                    <button
                      onClick={() => handleKeepLatest(group.groupKey)}
                      disabled={actionLoading !== null}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-50 transition-colors disabled:opacity-50"
                    >
                      {isGroupLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      Keep Latest Only
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bulk actions footer */}
      {data.stats.totalGroups > 1 && (
        <div className="px-5 py-3 border-t border-neutral-100 bg-neutral-50/50">
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-500">
              {data.stats.totalDuplicates} older versions across {data.stats.totalGroups} groups
            </span>
            <button
              onClick={handleCleanAll}
              disabled={actionLoading !== null}
              className="flex items-center gap-1.5 text-sm text-violet-600 hover:text-violet-700 font-medium disabled:opacity-50"
            >
              {actionLoading === 'clean-all' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              Auto-Clean All (Keep Latest)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
