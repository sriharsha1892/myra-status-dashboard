'use client';

import { FileText, ScrollText, TrendingUp, Clock, Loader2 } from 'lucide-react';
import { useQuoteMsaStats } from '@/hooks/useQuoteMsaStats';

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export default function QuoteMsaTracking() {
  const { data: stats, isLoading, error } = useQuoteMsaStats();

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-neutral-200/60 p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-violet-600 animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="bg-white rounded-2xl border border-neutral-200/60 p-6">
        <p className="text-neutral-500 text-center py-4">
          Unable to load quote/MSA statistics
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-neutral-200/60 p-6">
      <h3 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
        <FileText className="w-5 h-5 text-neutral-500" />
        Documents Generated
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Quotes Card */}
        <div className="bg-gradient-to-br from-violet-50 to-violet-100/50 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-violet-500 flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-violet-600 font-medium">Quotes</p>
              <p className="text-2xl font-bold text-violet-900">
                {stats.quotes.total}
              </p>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-violet-600/70">This week</span>
              <span className="font-medium text-violet-800">
                {stats.quotes.thisWeek}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-violet-600/70">This month</span>
              <span className="font-medium text-violet-800">
                {stats.quotes.thisMonth}
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t border-violet-200">
              <span className="text-violet-600/70">Total value</span>
              <span className="font-semibold text-violet-800">
                {formatCurrency(stats.quotes.totalValue)}
              </span>
            </div>
          </div>
        </div>

        {/* MSAs Card */}
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center">
              <ScrollText className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-emerald-600 font-medium">MSAs</p>
              <p className="text-2xl font-bold text-emerald-900">
                {stats.msas.total}
              </p>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-emerald-600/70">This week</span>
              <span className="font-medium text-emerald-800">
                {stats.msas.thisWeek}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-emerald-600/70">This month</span>
              <span className="font-medium text-emerald-800">
                {stats.msas.thisMonth}
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t border-emerald-200">
              <span className="text-emerald-600/70">Total value</span>
              <span className="font-semibold text-emerald-800">
                {formatCurrency(stats.msas.totalValue)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      {(stats.quotes.recent.length > 0 || stats.msas.recent.length > 0) && (
        <div className="mt-6">
          <h4 className="text-sm font-medium text-neutral-700 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Recent Activity
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {[...stats.quotes.recent, ...stats.msas.recent]
              .sort(
                (a, b) =>
                  new Date(b.createdAt).getTime() -
                  new Date(a.createdAt).getTime()
              )
              .slice(0, 5)
              .map((item) => {
                const isQuote = item.reference.startsWith('MQ-');
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between py-2 px-3 bg-neutral-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          isQuote ? 'bg-violet-100' : 'bg-emerald-100'
                        }`}
                      >
                        {isQuote ? (
                          <FileText
                            className={`w-4 h-4 ${
                              isQuote ? 'text-violet-600' : 'text-emerald-600'
                            }`}
                          />
                        ) : (
                          <ScrollText className="w-4 h-4 text-emerald-600" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-neutral-900">
                          {item.companyName}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {item.reference} · {item.preparedBy}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-neutral-900">
                        {formatCurrency(item.totalValue)}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {formatDate(item.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* By AM Breakdown */}
      {Object.keys(stats.byPreparedBy).length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-medium text-neutral-700 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            By Account Manager
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {Object.entries(stats.byPreparedBy)
              .sort(
                (a, b) =>
                  b[1].quotes + b[1].msas - (a[1].quotes + a[1].msas)
              )
              .slice(0, 6)
              .map(([name, data]) => (
                <div
                  key={name}
                  className="bg-neutral-50 rounded-lg p-3 text-center"
                >
                  <p className="text-xs text-neutral-500 truncate">{name}</p>
                  <p className="text-lg font-semibold text-neutral-900">
                    {data.quotes + data.msas}
                  </p>
                  <p className="text-xs text-neutral-400">
                    {data.quotes}Q / {data.msas}M
                  </p>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
