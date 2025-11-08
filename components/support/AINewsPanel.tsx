'use client';

import React, { useState } from 'react';
import { Sparkles, ExternalLink, Calendar, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { getAINewsForOrg, getRandomEmptyMessage, getRandomSectorInsight, type AINewsItem } from '@/lib/ai-news-data';

interface AINewsPanelProps {
  orgId: string;
  orgName: string;
}

const CATEGORY_LABELS = {
  partnership: { label: 'Partnership', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  internal_ai_use: { label: 'Internal AI Use', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  executive_hire: { label: 'Executive Hire', color: 'bg-green-100 text-green-700 border-green-200' },
  product_launch: { label: 'Product Launch', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  research: { label: 'Research', color: 'bg-pink-100 text-pink-700 border-pink-200' },
  other: { label: 'Other', color: 'bg-gray-100 text-gray-700 border-gray-200' },
};

export default function AINewsPanel({ orgId, orgName }: AINewsPanelProps) {
  const [showAll, setShowAll] = useState(false);
  const newsItems = getAINewsForOrg(orgId, orgName);
  const displayItems = showAll ? newsItems : newsItems.slice(0, 3);
  const hasMore = newsItems.length > 3;

  return (
    <div className="opacity-0 animate-fade-in" style={{ animationDelay: '150ms', animationFillMode: 'forwards' }}>
      <div className="backdrop-blur-xl bg-white/70 border border-white/40 rounded-2xl shadow-lg p-6">
        {/* Compact Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">AI & LLM Activity</h3>
              <p className="text-xs text-gray-500">Context for your conversation</p>
            </div>
          </div>
          {newsItems.length > 0 && (
            <div className="px-2 py-1 rounded-md bg-violet-50 border border-violet-200 text-violet-700 text-xs font-medium">
              {newsItems.length}
            </div>
          )}
        </div>

        {/* News Items or Empty State */}
        {newsItems.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-4">
            {displayItems.map((item, index) => (
              <NewsCard key={item.source_url} item={item} index={index} />
            ))}

            {/* View More Button */}
            {hasMore && (
              <button
                onClick={() => setShowAll(!showAll)}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white/60 backdrop-blur-sm border border-gray-200/60 hover:bg-white hover:shadow-md transition-all duration-200 text-sm font-medium text-gray-700"
              >
                {showAll ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    Show less
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    View {newsItems.length - 3} more update{newsItems.length - 3 !== 1 ? 's' : ''}
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function NewsCard({ item, index }: { item: AINewsItem; index: number }) {
  const categoryConfig = CATEGORY_LABELS[item.category];

  return (
    <div
      className="group p-3 rounded-xl bg-white/60 border border-gray-200/60 hover:bg-white hover:shadow-md transition-all duration-150"
    >
      {/* Header - Compact */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <a
          href={item.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 text-xs font-semibold text-gray-900 hover:text-blue-600 transition-colors leading-tight line-clamp-2"
        >
          {item.headline}
        </a>
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border flex-shrink-0 ${categoryConfig.color}`}>
          {categoryConfig.label}
        </span>
      </div>

      {/* Summary - Condensed */}
      <p className="text-xs text-gray-600 leading-snug mb-2 line-clamp-2">{item.summary}</p>

      {/* Footer - Single Line */}
      <div className="flex items-center justify-between text-[10px] text-gray-500">
        <div className="flex items-center gap-1">
          <Calendar className="w-2.5 h-2.5" />
          <span>{format(new Date(item.date), 'MMM d, yyyy')}</span>
        </div>
        <a href={item.source_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-0.5 hover:text-blue-600">
          <span>Read</span>
          <ExternalLink className="w-2.5 h-2.5" />
        </a>
      </div>

      {/* Internal Note - Compact (if present) */}
      {item.internal_note && (
        <div className="mt-2 pt-2 border-t border-gray-200/50">
          <div className="flex items-start gap-1.5">
            <TrendingUp className="w-3 h-3 text-violet-600 flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-gray-600 leading-snug">
              <span className="font-semibold text-violet-600">Angle:</span> {item.internal_note}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  const emptyMessage = getRandomEmptyMessage();
  const sectorInsight = getRandomSectorInsight();

  return (
    <div className="text-center py-12 px-6">
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center">
        <Sparkles className="w-8 h-8 text-violet-600" />
      </div>

      <p className="text-sm text-gray-600 leading-relaxed mb-6 max-w-md mx-auto">{emptyMessage}</p>

      {/* Sector Insight */}
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200/60">
        <TrendingUp className="w-4 h-4 text-violet-600" />
        <p className="text-xs font-medium text-gray-700">{sectorInsight}</p>
      </div>
    </div>
  );
}
