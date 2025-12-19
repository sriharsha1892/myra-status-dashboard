'use client';

import { useMemo } from 'react';
import type { PipelineStage } from '@/lib/quote/pipeline-types';
import {
  STAGE_LABELS,
  STAGE_HEX_COLORS,
  STAGE_ORDER,
} from '@/lib/quote/pipeline-types';

interface PipelineFunnelProps {
  counts: Record<PipelineStage, number>;
  values: Record<PipelineStage, number>;
  onStageClick?: (stage: PipelineStage | 'all') => void;
  selectedStage?: PipelineStage | 'all';
}

export default function PipelineFunnel({
  counts,
  values,
  onStageClick,
  selectedStage = 'all',
}: PipelineFunnelProps) {
  // Calculate conversion rates between stages
  const funnelData = useMemo(() => {
    const data: Array<{
      stage: PipelineStage;
      count: number;
      value: number;
      conversionRate: number | null;
      cumulativeDropoff: number;
    }> = [];

    const stages = STAGE_ORDER;
    let previousCount = 0;

    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];
      const count = counts[stage] || 0;
      const value = values[stage] || 0;

      // Conversion rate from previous stage
      let conversionRate: number | null = null;
      if (i > 0 && previousCount > 0) {
        conversionRate = Math.round((count / previousCount) * 100);
      }

      // Cumulative dropoff from first stage
      const firstStageCount = counts[stages[0]] || 0;
      const cumulativeDropoff =
        firstStageCount > 0
          ? Math.round(((firstStageCount - count) / firstStageCount) * 100)
          : 0;

      data.push({
        stage,
        count,
        value,
        conversionRate,
        cumulativeDropoff,
      });

      previousCount = count > 0 ? count : previousCount;
    }

    return data;
  }, [counts, values]);

  // Get lost count
  const lostCount = counts['lost'] || 0;
  const lostValue = values['lost'] || 0;

  // Calculate totals
  const totalPipeline = useMemo(() => {
    return Object.entries(values)
      .filter(([stage]) => stage !== 'won' && stage !== 'lost')
      .reduce((sum, [, val]) => sum + (val || 0), 0);
  }, [values]);

  const wonValue = values['won'] || 0;

  // Get max count for width calculation
  const maxCount = useMemo(() => {
    return Math.max(...STAGE_ORDER.map((s) => counts[s] || 0), 1);
  }, [counts]);

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
    return `$${amount.toFixed(0)}`;
  };

  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-neutral-700">Sales Funnel</h3>
        <div className="flex items-center gap-4 text-xs text-neutral-500">
          <span>
            Pipeline:{' '}
            <span className="font-semibold text-neutral-700">
              {formatCurrency(totalPipeline)}
            </span>
          </span>
          <span>
            Won:{' '}
            <span className="font-semibold text-green-600">
              {formatCurrency(wonValue)}
            </span>
          </span>
        </div>
      </div>

      {/* Funnel Stages */}
      <div className="space-y-2">
        {funnelData.map((item, index) => {
          const widthPercent = Math.max(
            20,
            Math.round((item.count / maxCount) * 100)
          );
          const isSelected = selectedStage === item.stage;

          return (
            <div key={item.stage} className="flex items-center gap-3">
              {/* Funnel Bar */}
              <button
                onClick={() => onStageClick?.(item.stage)}
                className={`group flex items-center transition-all rounded-lg ${
                  isSelected ? 'ring-2 ring-violet-500 ring-offset-2' : ''
                }`}
                style={{
                  width: `${widthPercent}%`,
                  minWidth: '180px',
                }}
              >
                <div
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all group-hover:ring-2 group-hover:ring-neutral-300"
                  style={{
                    backgroundColor: `${STAGE_HEX_COLORS[item.stage]}15`,
                    borderLeft: `4px solid ${STAGE_HEX_COLORS[item.stage]}`,
                  }}
                >
                  <span
                    className="text-sm font-medium"
                    style={{ color: STAGE_HEX_COLORS[item.stage] }}
                  >
                    {STAGE_LABELS[item.stage]}
                  </span>
                  <span className="text-sm font-bold text-neutral-800">
                    {item.count}
                  </span>
                </div>
              </button>

              {/* Conversion Rate Arrow */}
              <div className="flex items-center gap-2 min-w-[120px]">
                {item.conversionRate !== null && (
                  <>
                    <svg
                      className="w-4 h-4 text-neutral-300"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 14l-7 7m0 0l-7-7m7 7V3"
                      />
                    </svg>
                    <span
                      className={`text-xs font-medium ${
                        item.conversionRate >= 70
                          ? 'text-green-600'
                          : item.conversionRate >= 50
                            ? 'text-amber-600'
                            : 'text-red-600'
                      }`}
                    >
                      {item.conversionRate}%
                    </span>
                  </>
                )}
                {item.value > 0 && (
                  <span className="text-xs text-neutral-500 ml-auto">
                    {formatCurrency(item.value)}
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {/* Lost Row */}
        {lostCount > 0 && (
          <div className="flex items-center gap-3 pt-2 mt-2 border-t border-neutral-100">
            <button
              onClick={() => onStageClick?.('lost')}
              className={`group flex items-center transition-all rounded-lg ${
                selectedStage === 'lost' ? 'ring-2 ring-violet-500 ring-offset-2' : ''
              }`}
              style={{ minWidth: '180px' }}
            >
              <div className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-red-50 border-l-4 border-red-500 group-hover:ring-2 group-hover:ring-neutral-300">
                <span className="text-sm font-medium text-red-600">Lost</span>
                <span className="text-sm font-bold text-red-800">
                  {lostCount}
                </span>
              </div>
            </button>
            <div className="flex items-center min-w-[120px]">
              {lostValue > 0 && (
                <span className="text-xs text-neutral-500 ml-auto">
                  {formatCurrency(lostValue)}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Clear Filter */}
      {selectedStage !== 'all' && (
        <button
          onClick={() => onStageClick?.('all')}
          className="mt-4 text-xs text-violet-600 hover:text-violet-800 underline"
        >
          Clear filter (showing all)
        </button>
      )}
    </div>
  );
}
