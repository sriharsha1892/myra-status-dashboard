'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, History, Trash2, ArrowUpRight, Calendar, Building2 } from 'lucide-react';
import type { QuoteFormData, QuoteHistoryEntry, Currency } from '@/lib/quote/types';
import { getHistory, deleteFromHistory } from '@/lib/quote/storage';
import { CURRENCY_SYMBOLS } from '@/lib/quote/types';

interface QuoteHistoryProps {
  email: string;
  onLoadQuote: (formData: QuoteFormData) => void;
  refreshTrigger?: number;
}

function formatCurrencyDisplay(value: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency as Currency] || '$';
  if (currency === 'INR') {
    return symbol + value.toLocaleString('en-IN');
  }
  return symbol + value.toLocaleString('en-US');
}

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function QuoteHistory({ email, onLoadQuote, refreshTrigger }: QuoteHistoryProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [history, setHistory] = useState<QuoteHistoryEntry[]>(() => getHistory(email));

  // Refresh history when email changes or refreshTrigger updates
  React.useEffect(() => {
    setHistory(getHistory(email));
  }, [email, refreshTrigger]);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this quote from history?')) {
      deleteFromHistory(email, id);
      setHistory(getHistory(email));
    }
  };

  const handleLoad = (entry: QuoteHistoryEntry) => {
    onLoadQuote(entry.formData);
    setIsExpanded(false);
  };

  if (!email || history.length === 0) {
    return null;
  }

  return (
    <div className="border border-neutral-200 rounded-lg bg-white overflow-hidden">
      {/* Header - clickable to expand/collapse */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-neutral-50 hover:bg-neutral-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-violet-600" />
          <span className="font-medium text-neutral-700">Quote History</span>
          <span className="text-xs text-neutral-500 bg-neutral-200 px-2 py-0.5 rounded-full">
            {history.length}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-neutral-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-neutral-500" />
        )}
      </button>

      {/* History list */}
      {isExpanded && (
        <div className="divide-y divide-neutral-100 max-h-80 overflow-y-auto">
          {history.map((entry) => (
            <div
              key={entry.id}
              className="px-4 py-3 hover:bg-violet-50/50 transition-colors cursor-pointer group"
              onClick={() => handleLoad(entry)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                    <span className="font-medium text-neutral-800 truncate">
                      {entry.companyName}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-neutral-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(entry.date)}
                    </span>
                    <span className="font-medium text-violet-600">
                      {formatCurrencyDisplay(entry.totalValue, entry.currency)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={(e) => handleDelete(entry.id, e)}
                    className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete from history"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <div className="p-1.5 text-violet-500 opacity-0 group-hover:opacity-100">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
