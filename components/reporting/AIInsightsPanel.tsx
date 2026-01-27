'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Info,
  Bell,
  ChevronRight,
  Loader2,
} from 'lucide-react';

interface Insight {
  id: string;
  type: 'warning' | 'success' | 'info' | 'alert';
  title: string;
  description: string;
  metric?: string;
  change?: string;
  action?: {
    label: string;
    type: 'view' | 'send_reminder' | 'follow_up';
    data?: Record<string, unknown>;
  };
  priority: number;
}

interface AIInsightsPanelProps {
  onAction?: (action: { type: string; data?: Record<string, unknown> }) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const insightTypeConfig = {
  warning: {
    icon: AlertTriangle,
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    iconColor: 'text-amber-600',
    textColor: 'text-amber-800',
  },
  success: {
    icon: TrendingUp,
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    iconColor: 'text-emerald-600',
    textColor: 'text-emerald-800',
  },
  info: {
    icon: Info,
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    iconColor: 'text-blue-600',
    textColor: 'text-blue-800',
  },
  alert: {
    icon: Bell,
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    iconColor: 'text-red-600',
    textColor: 'text-red-800',
  },
};

export default function AIInsightsPanel({
  onAction,
  collapsed = false,
  onToggleCollapse,
}: AIInsightsPanelProps) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchInsights = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/reporting/insights');
      if (!response.ok) {
        throw new Error('Failed to fetch insights');
      }

      const data = await response.json();
      setInsights(data.insights || []);
      setLastUpdated(new Date(data.generatedAt));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  const handleAction = (insight: Insight) => {
    if (insight.action && onAction) {
      onAction({
        type: insight.action.type,
        data: insight.action.data,
      });
    }
  };

  if (collapsed) {
    return (
      <button
        onClick={onToggleCollapse}
        className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-violet-50 to-violet-100/50 rounded-xl border border-violet-200 hover:from-violet-100 hover:to-violet-150 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-violet-600" />
          <span className="font-medium text-violet-900">AI Insights</span>
          {insights.length > 0 && (
            <span className="px-2 py-0.5 text-xs bg-violet-200 text-violet-800 rounded-full">
              {insights.length}
            </span>
          )}
        </div>
        <ChevronRight className="w-4 h-4 text-violet-500" />
      </button>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-neutral-200/60 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 bg-gradient-to-r from-violet-50/50 to-white">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-violet-600" />
          <h3 className="font-semibold text-neutral-900">AI Insights</h3>
          {insights.length > 0 && (
            <span className="px-2 py-0.5 text-xs bg-violet-100 text-violet-700 rounded-full">
              {insights.length} insights
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-xs text-neutral-400">
              {lastUpdated.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          )}
          <button
            onClick={fetchInsights}
            disabled={loading}
            className="p-1.5 hover:bg-neutral-100 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh insights"
          >
            <RefreshCw
              className={`w-4 h-4 text-neutral-500 ${loading ? 'animate-spin' : ''}`}
            />
          </button>
        </div>
      </div>

      <div className="p-4">
        {loading && insights.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-violet-600 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
            <p className="text-sm text-neutral-500">{error}</p>
            <button
              onClick={fetchInsights}
              className="mt-2 text-sm text-violet-600 hover:text-violet-700"
            >
              Try again
            </button>
          </div>
        ) : insights.length === 0 ? (
          <div className="text-center py-8">
            <Sparkles className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
            <p className="text-sm text-neutral-500">
              No insights available right now
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {insights.map((insight) => {
              const config = insightTypeConfig[insight.type];
              const Icon = config.icon;

              return (
                <div
                  key={insight.id}
                  className={`p-4 rounded-xl ${config.bgColor} border ${config.borderColor}`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg bg-white/80 flex items-center justify-center flex-shrink-0`}
                    >
                      <Icon className={`w-4 h-4 ${config.iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className={`font-medium ${config.textColor}`}>
                          {insight.title}
                        </h4>
                        {insight.change && (
                          <span
                            className={`text-sm font-medium flex items-center gap-0.5 ${
                              insight.change.startsWith('+')
                                ? 'text-emerald-600'
                                : insight.change.startsWith('-')
                                  ? 'text-red-600'
                                  : 'text-neutral-600'
                            }`}
                          >
                            {insight.change.startsWith('+') ? (
                              <TrendingUp className="w-3 h-3" />
                            ) : insight.change.startsWith('-') ? (
                              <TrendingDown className="w-3 h-3" />
                            ) : null}
                            {insight.change}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-neutral-600 mt-0.5">
                        {insight.description}
                      </p>
                      {(insight.action || insight.metric) && (
                        <div className="flex items-center justify-between mt-3">
                          {insight.metric && (
                            <span className="text-lg font-semibold text-neutral-900">
                              {insight.metric}
                            </span>
                          )}
                          {insight.action && (
                            <button
                              onClick={() => handleAction(insight)}
                              className={`text-sm font-medium ${config.iconColor} hover:underline flex items-center gap-1`}
                            >
                              {insight.action.label}
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
