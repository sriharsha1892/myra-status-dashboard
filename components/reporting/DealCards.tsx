'use client';

import { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Clock,
  DollarSign,
  User,
  SkipForward,
  Flag,
  Mail,
  CheckCircle,
} from 'lucide-react';

interface Deal {
  id: string;
  companyName: string;
  contactEmail: string;
  value: number;
  status: string;
  lastActivity: string;
  daysSinceActivity: number;
  salesPoc: string;
  type: 'quote' | 'msa' | 'deal';
}

interface DealCardsProps {
  deals: Deal[];
  onAction?: (action: { type: string; dealId: string; data?: Record<string, unknown> }) => void;
}

const statusColors: Record<string, string> = {
  proposal: 'bg-amber-100 text-amber-700',
  trial: 'bg-blue-100 text-blue-700',
  demo: 'bg-purple-100 text-purple-700',
  pending: 'bg-neutral-100 text-neutral-700',
  stalled: 'bg-red-100 text-red-700',
};

export default function DealCards({ deals, onAction }: DealCardsProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set());

  // Filter out skipped deals
  const activeDeals = useMemo(
    () => deals.filter((d) => !skippedIds.has(d.id)),
    [deals, skippedIds]
  );

  const currentDeal = activeDeals[currentIndex];
  const hasNext = currentIndex < activeDeals.length - 1;
  const hasPrev = currentIndex > 0;

  const handleNext = () => {
    if (hasNext) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (hasPrev) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    if (currentDeal) {
      setSkippedIds((prev) => new Set(prev).add(currentDeal.id));
      // Stay at same index if there are more deals, otherwise go back
      if (currentIndex >= activeDeals.length - 1 && currentIndex > 0) {
        setCurrentIndex((prev) => prev - 1);
      }
    }
  };

  const handleAction = (actionType: string) => {
    if (currentDeal && onAction) {
      onAction({
        type: actionType,
        dealId: currentDeal.id,
        data: { companyName: currentDeal.companyName },
      });
    }
    // Move to next deal after action
    handleNext();
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
    });
  };

  if (activeDeals.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-neutral-200/60 p-6">
        <div className="flex flex-col items-center justify-center py-8">
          <CheckCircle className="w-12 h-12 text-emerald-500 mb-3" />
          <h3 className="font-semibold text-neutral-900 mb-1">All caught up!</h3>
          <p className="text-sm text-neutral-500 text-center">
            {skippedIds.size > 0
              ? `${skippedIds.size} deal${skippedIds.size !== 1 ? 's' : ''} skipped. `
              : 'No deals need attention right now.'}
          </p>
          {skippedIds.size > 0 && (
            <button
              onClick={() => {
                setSkippedIds(new Set());
                setCurrentIndex(0);
              }}
              className="mt-3 text-sm text-violet-600 hover:text-violet-700"
            >
              Review skipped deals
            </button>
          )}
        </div>
      </div>
    );
  }

  const isStalled = currentDeal.daysSinceActivity > 7;

  return (
    <div className="bg-white rounded-2xl border border-neutral-200/60 overflow-hidden">
      {/* Header with counter */}
      <div className="px-5 py-3 border-b border-neutral-100 bg-neutral-50/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            <h3 className="font-semibold text-neutral-900">Deals Needing Attention</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-neutral-500">
              {currentIndex + 1} of {activeDeals.length}
            </span>
            <div className="flex items-center">
              <button
                onClick={handlePrev}
                disabled={!hasPrev}
                className="p-1.5 hover:bg-neutral-200 rounded-lg transition-colors disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4 text-neutral-600" />
              </button>
              <button
                onClick={handleNext}
                disabled={!hasNext}
                className="p-1.5 hover:bg-neutral-200 rounded-lg transition-colors disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4 text-neutral-600" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Deal Card */}
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h4 className="text-lg font-semibold text-neutral-900">
              {currentDeal.companyName}
            </h4>
            <p className="text-sm text-neutral-500">{currentDeal.contactEmail}</p>
          </div>
          <span
            className={`px-2.5 py-1 text-xs font-medium rounded-full ${
              isStalled ? statusColors.stalled : statusColors[currentDeal.status] || statusColors.pending
            }`}
          >
            {isStalled ? 'Stalled' : currentDeal.status}
          </span>
        </div>

        {/* Deal metrics */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-neutral-50 rounded-xl p-3">
            <div className="flex items-center gap-2 text-neutral-500 mb-1">
              <DollarSign className="w-4 h-4" />
              <span className="text-xs">Value</span>
            </div>
            <p className="text-lg font-semibold text-neutral-900">
              {formatCurrency(currentDeal.value)}
            </p>
          </div>
          <div className="bg-neutral-50 rounded-xl p-3">
            <div className="flex items-center gap-2 text-neutral-500 mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-xs">Last Activity</span>
            </div>
            <p className="text-lg font-semibold text-neutral-900">
              {currentDeal.daysSinceActivity}d ago
            </p>
          </div>
          <div className="bg-neutral-50 rounded-xl p-3">
            <div className="flex items-center gap-2 text-neutral-500 mb-1">
              <User className="w-4 h-4" />
              <span className="text-xs">Owner</span>
            </div>
            <p className="text-sm font-medium text-neutral-900 truncate">
              {currentDeal.salesPoc}
            </p>
          </div>
        </div>

        {/* Warning if stalled */}
        {isStalled && (
          <div className="flex items-center gap-2 mb-4 p-3 bg-red-50 rounded-xl border border-red-100">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">
              No activity for {currentDeal.daysSinceActivity} days. Consider following up.
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSkip}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-neutral-200 text-neutral-700 rounded-xl hover:bg-neutral-50 transition-colors"
          >
            <SkipForward className="w-4 h-4" />
            Skip
          </button>
          <button
            onClick={() => handleAction('mark_stalled')}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-amber-200 text-amber-700 rounded-xl hover:bg-amber-50 transition-colors"
          >
            <Flag className="w-4 h-4" />
            Mark Stalled
          </button>
          <button
            onClick={() => handleAction('send_follow_up')}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-colors"
          >
            <Mail className="w-4 h-4" />
            Follow Up
          </button>
        </div>
      </div>

      {/* Progress indicator */}
      <div className="px-5 pb-4">
        <div className="flex gap-1">
          {activeDeals.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full ${
                i === currentIndex
                  ? 'bg-violet-500'
                  : i < currentIndex
                    ? 'bg-violet-200'
                    : 'bg-neutral-200'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
