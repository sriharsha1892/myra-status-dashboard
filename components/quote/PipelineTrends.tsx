'use client';

import { useState, useMemo } from 'react';
import { X, TrendingUp, TrendingDown, Minus, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { STAGE_LABELS, STAGE_HEX_COLORS, PipelineStage } from '@/lib/quote/pipeline-types';
import { usePipelineSnapshots, useCaptureSnapshot } from '@/hooks/usePipelineSnapshots';

interface PipelineTrendsProps {
  isOpen: boolean;
  onClose: () => void;
  inline?: boolean;
}

interface SnapshotData {
  date: string;
  [key: string]: string | number;
}

interface StageComparison {
  stage: PipelineStage;
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  currentValue: number;
  previousValue: number;
  valueChange: number;
}

const STAGE_ORDER: PipelineStage[] = [
  'intro',
  'demo',
  'pending_trial',
  'trial',
  'feedback',
  'proposal',
  'nego',
  'won',
  'lost',
];

export default function PipelineTrends({ isOpen, onClose, inline = false }: PipelineTrendsProps) {
  const [days, setDays] = useState(30);
  // React Query hooks
  const {
    data: chartData = [],
    isLoading: loading,
    error: queryError,
    refetch,
  } = usePipelineSnapshots(days, { enabled: isOpen || inline });

  const captureMutation = useCaptureSnapshot();
  const isCapturing = captureMutation.isPending;
  const error = queryError?.message || (captureMutation.error as Error)?.message || null;

  // Calculate comparisons from chart data
  const comparisons = useMemo<StageComparison[]>(() => {
    if (chartData.length < 2) {
      return [];
    }

    const latest = chartData[chartData.length - 1];
    const weekAgoIndex = Math.max(0, chartData.length - 8);
    const weekAgo = chartData[weekAgoIndex];

    return STAGE_ORDER.map((stage) => {
      const currentCount = (latest[`${stage}_count`] as number) || 0;
      const previousCount = (weekAgo[`${stage}_count`] as number) || 0;
      const change = currentCount - previousCount;
      const changePercent = previousCount > 0 ? (change / previousCount) * 100 : 0;

      const currentValue = (latest[`${stage}_value`] as number) || 0;
      const previousValue = (weekAgo[`${stage}_value`] as number) || 0;
      const valueChange = currentValue - previousValue;

      return {
        stage,
        current: currentCount,
        previous: previousCount,
        change,
        changePercent,
        currentValue,
        previousValue,
        valueChange,
      };
    });
  }, [chartData]);

  const captureSnapshot = () => {
    captureMutation.mutate();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  if (!isOpen && !inline) return null;

  // Select which stages to show in the chart (exclude lost for cleaner visualization)
  const chartStages: PipelineStage[] = ['intro', 'demo', 'trial', 'proposal', 'won'];

  // Inline content (for embedding in pages)
  const content = (
    <>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
            </div>
          ) : isCapturing ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
              <p className="mt-3 text-sm text-neutral-500">
                Capturing snapshot...
              </p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="w-10 h-10 text-red-300 mb-3" />
              <p className="text-neutral-600">{error}</p>
              <button
                onClick={() => refetch()}
                className="mt-4 text-sm text-violet-600 hover:underline"
              >
                Try again
              </button>
            </div>
          ) : chartData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <TrendingUp className="w-10 h-10 text-neutral-300 mb-3" />
              <p className="text-neutral-500 mb-2">No snapshot data available</p>
              <p className="text-sm text-neutral-400 mb-4">
                Capture your first snapshot to start tracking trends
              </p>
              <button
                onClick={captureSnapshot}
                disabled={isCapturing}
                className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${isCapturing ? 'animate-spin' : ''}`} />
                Capture Snapshot
              </button>
            </div>
          ) : (
            <>
              {/* Chart */}
              <div className="bg-neutral-50 rounded-lg p-4 mb-6">
                <h3 className="text-sm font-medium text-neutral-700 mb-4">
                  Pipeline Counts Over Time
                </h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={formatDate}
                        tick={{ fontSize: 12, fill: '#6b7280' }}
                      />
                      <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} />
                      <Tooltip
                        labelFormatter={(label) => formatDate(label as string)}
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                        }}
                      />
                      <Legend />
                      {chartStages.map((stage) => (
                        <Line
                          key={stage}
                          type="monotone"
                          dataKey={`${stage}_count`}
                          name={STAGE_LABELS[stage]}
                          stroke={STAGE_HEX_COLORS[stage]}
                          strokeWidth={2}
                          dot={{ r: 3 }}
                          activeDot={{ r: 5 }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Week-over-Week Comparison */}
              <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
                <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-200">
                  <h3 className="text-sm font-medium text-neutral-700">
                    Week-over-Week Comparison
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-neutral-50 text-neutral-600">
                        <th className="px-4 py-2 text-left font-medium">Stage</th>
                        <th className="px-4 py-2 text-right font-medium">This Week</th>
                        <th className="px-4 py-2 text-right font-medium">Last Week</th>
                        <th className="px-4 py-2 text-right font-medium">Change</th>
                        <th className="px-4 py-2 text-right font-medium">Value (This)</th>
                        <th className="px-4 py-2 text-right font-medium">Value (Last)</th>
                        <th className="px-4 py-2 text-right font-medium">Value Change</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparisons.map((comp) => (
                        <tr key={comp.stage} className="border-t border-neutral-100">
                          <td className="px-4 py-2">
                            <span
                              className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full"
                              style={{
                                backgroundColor: `${STAGE_HEX_COLORS[comp.stage]}20`,
                                color: STAGE_HEX_COLORS[comp.stage],
                              }}
                            >
                              {STAGE_LABELS[comp.stage]}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-right font-medium">
                            {comp.current}
                          </td>
                          <td className="px-4 py-2 text-right text-neutral-500">
                            {comp.previous}
                          </td>
                          <td className="px-4 py-2 text-right">
                            <span
                              className={`inline-flex items-center gap-1 ${
                                comp.change > 0
                                  ? 'text-green-600'
                                  : comp.change < 0
                                    ? 'text-red-600'
                                    : 'text-neutral-500'
                              }`}
                            >
                              {comp.change > 0 ? (
                                <TrendingUp className="w-3 h-3" />
                              ) : comp.change < 0 ? (
                                <TrendingDown className="w-3 h-3" />
                              ) : (
                                <Minus className="w-3 h-3" />
                              )}
                              {comp.change > 0 ? '+' : ''}
                              {comp.change}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-right font-medium">
                            {comp.currentValue > 0 ? formatCurrency(comp.currentValue) : '-'}
                          </td>
                          <td className="px-4 py-2 text-right text-neutral-500">
                            {comp.previousValue > 0 ? formatCurrency(comp.previousValue) : '-'}
                          </td>
                          <td className="px-4 py-2 text-right">
                            {comp.valueChange !== 0 && (
                              <span
                                className={`inline-flex items-center gap-1 ${
                                  comp.valueChange > 0
                                    ? 'text-green-600'
                                    : 'text-red-600'
                                }`}
                              >
                                {comp.valueChange > 0 ? '+' : ''}
                                {formatCurrency(comp.valueChange)}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
    </>
  );

  // Inline mode - render content directly
  if (inline) {
    return (
      <div className="space-y-4">
        {/* Inline header with controls */}
        <div className="flex items-center justify-between">
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value))}
            className="px-3 py-1.5 text-sm bg-neutral-100 text-neutral-700 border border-neutral-200 rounded-lg focus:outline-none"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button
            onClick={captureSnapshot}
            disabled={isCapturing}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-violet-100 hover:bg-violet-200 text-violet-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isCapturing ? 'animate-spin' : ''}`} />
            Snapshot Now
          </button>
        </div>
        {content}
      </div>
    );
  }

  // Modal mode
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-5xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-600 to-violet-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Pipeline Trends</h2>
            <p className="text-violet-100 text-sm">Track pipeline changes over time</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value))}
              className="px-3 py-1.5 text-sm bg-white/10 text-white border border-white/20 rounded-lg focus:outline-none"
            >
              <option value={7} className="text-neutral-800">Last 7 days</option>
              <option value={30} className="text-neutral-800">Last 30 days</option>
              <option value={90} className="text-neutral-800">Last 90 days</option>
            </select>
            <button
              onClick={captureSnapshot}
              disabled={isCapturing}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isCapturing ? 'animate-spin' : ''}`} />
              Snapshot Now
            </button>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {content}
        </div>
      </div>
    </div>
  );
}
