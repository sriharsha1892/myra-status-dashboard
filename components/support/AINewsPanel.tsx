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
      <div className="backdrop-blur-xl bg-white/70 border border-white/40 rounded-3xl shadow-xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Recent AI & LLM Developments</h3>
              <p className="text-xs text-gray-600">Signals and context for your next conversation</p>
            </div>
          </div>
          {newsItems.length > 0 && (
            <div className="px-3 py-1 rounded-lg bg-violet-100 border border-violet-200 text-violet-700 text-xs font-medium">
              {newsItems.length} update{newsItems.length !== 1 ? 's' : ''}
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
      className="group p-4 rounded-2xl backdrop-blur-xl bg-white/80 border border-white/40 hover:shadow-lg transition-all duration-200 hover:scale-[1.01]"
      style={{
        animationDelay: `${index * 100 + 200}ms`,
        animationFillMode: 'forwards',
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <a
          href={item.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 text-sm font-semibold text-gray-900 hover:text-blue-600 transition-colors leading-snug group-hover:underline"
        >
          {item.headline}
          <ExternalLink className="inline-block w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
        </a>
        <span className={`px-2 py-0.5 rounded-md text-xs font-medium border flex-shrink-0 ${categoryConfig.color}`}>
          {categoryConfig.label}
        </span>
      </div>

      {/* Summary */}
      <p className="text-sm text-gray-600 leading-relaxed mb-3">{item.summary}</p>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Calendar className="w-3 h-3" />
          <span>{format(new Date(item.date), 'MMM d, yyyy')}</span>
        </div>
      </div>

      {/* Internal Note (if present) */}
      {item.internal_note && (
        <div className="mt-3 pt-3 border-t border-gray-200/60">
          <div className="flex items-start gap-2">
            <TrendingUp className="w-3.5 h-3.5 text-violet-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-gray-600 italic leading-relaxed">
              <span className="font-medium text-violet-600">Pitch angle:</span> {item.internal_note}
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
