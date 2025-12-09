'use client';

import { useState, useEffect, useMemo } from 'react';
import { performanceStore } from '@/lib/monitoring/performanceStore';

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  status: 'good' | 'warning' | 'poor';
  subtitle?: string;
}

function MetricCard({ title, value, unit = 'ms', status, subtitle }: MetricCardProps) {
  const statusColors = {
    good: 'bg-green-50 border-green-200 text-green-700',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    poor: 'bg-red-50 border-red-200 text-red-700',
  };

  const dotColors = {
    good: 'bg-green-500',
    warning: 'bg-yellow-500',
    poor: 'bg-red-500',
  };

  return (
    <div className={`rounded-xl border p-4 ${statusColors[status]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium opacity-75">{title}</span>
        <span className={`w-2 h-2 rounded-full ${dotColors[status]}`} />
      </div>
      <div className="text-2xl font-bold">
        {value}
        <span className="text-sm font-normal opacity-75 ml-1">{unit}</span>
      </div>
      {subtitle && <p className="text-xs opacity-60 mt-1">{subtitle}</p>}
    </div>
  );
}

function getWebVitalStatus(metric: string, value: number): 'good' | 'warning' | 'poor' {
  // Based on Core Web Vitals thresholds
  switch (metric) {
    case 'lcp':
      if (value <= 2500) return 'good';
      if (value <= 4000) return 'warning';
      return 'poor';
    case 'fcp':
      if (value <= 1800) return 'good';
      if (value <= 3000) return 'warning';
      return 'poor';
    case 'cls':
      // CLS is stored as value * 1000
      const clsValue = value / 1000;
      if (clsValue <= 0.1) return 'good';
      if (clsValue <= 0.25) return 'warning';
      return 'poor';
    case 'page_load':
      if (value <= 3000) return 'good';
      if (value <= 5000) return 'warning';
      return 'poor';
    default:
      return 'good';
  }
}

export function PerformanceDashboard() {
  const [selectedPage, setSelectedPage] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<number>(3600000); // 1 hour
  const [, setUpdateTrigger] = useState(0);

  // Subscribe to store updates
  useEffect(() => {
    const unsubscribe = performanceStore.subscribe(() => {
      setUpdateTrigger(v => v + 1);
    });
    return unsubscribe;
  }, []);

  const pages = useMemo(() => ['all', ...performanceStore.getAllPages()], []);
  const since = useMemo(() => Date.now() - timeRange, [timeRange]);

  const metrics = useMemo(() => {
    if (selectedPage === 'all') {
      // Aggregate across all pages
      const entries = performanceStore.getEntries({ since });
      return {
        pageLoad: performanceStore.getStats(entries.filter(e => e.metric === 'page_load')),
        fcp: performanceStore.getStats(entries.filter(e => e.metric === 'first_contentful_paint')),
        lcp: performanceStore.getStats(entries.filter(e => e.metric === 'largest_contentful_paint')),
        cls: performanceStore.getStats(entries.filter(e => e.metric === 'cumulative_layout_shift')),
      };
    }
    return performanceStore.getPageMetrics(selectedPage, since);
  }, [selectedPage, since]);

  const apiMetrics = useMemo(() => {
    return performanceStore.getApiMetrics(since);
  }, [since]);

  const recentEntries = useMemo(() => {
    return performanceStore.getEntries({ since }).slice(-20).reverse();
  }, [since]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Performance Dashboard</h2>
          <p className="text-sm text-gray-600">Core Web Vitals and page performance metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(Number(e.target.value))}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value={900000}>Last 15 min</option>
            <option value={3600000}>Last 1 hour</option>
            <option value={86400000}>Last 24 hours</option>
          </select>
          <select
            value={selectedPage}
            onChange={(e) => setSelectedPage(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {pages.map(page => (
              <option key={page} value={page}>
                {page === 'all' ? 'All Pages' : page}
              </option>
            ))}
          </select>
          <button
            onClick={() => performanceStore.clear()}
            className="text-sm px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            Clear Data
          </button>
        </div>
      </div>

      {/* Core Web Vitals */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
          Core Web Vitals
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            title="Page Load (p50)"
            value={metrics.pageLoad?.p50 ?? '-'}
            status={metrics.pageLoad ? getWebVitalStatus('page_load', metrics.pageLoad.p50) : 'good'}
            subtitle={metrics.pageLoad ? `${metrics.pageLoad.count} samples` : 'No data'}
          />
          <MetricCard
            title="FCP (p50)"
            value={metrics.fcp?.p50 ?? '-'}
            status={metrics.fcp ? getWebVitalStatus('fcp', metrics.fcp.p50) : 'good'}
            subtitle="First Contentful Paint"
          />
          <MetricCard
            title="LCP (p50)"
            value={metrics.lcp?.p50 ?? '-'}
            status={metrics.lcp ? getWebVitalStatus('lcp', metrics.lcp.p50) : 'good'}
            subtitle="Largest Contentful Paint"
          />
          <MetricCard
            title="CLS"
            value={metrics.cls ? (metrics.cls.p50 / 1000).toFixed(3) : '-'}
            unit=""
            status={metrics.cls ? getWebVitalStatus('cls', metrics.cls.p50) : 'good'}
            subtitle="Cumulative Layout Shift"
          />
        </div>
      </div>

      {/* Percentile Breakdown */}
      {metrics.pageLoad && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
            Page Load Distribution
          </h3>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Metric</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-600">Min</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-600">p50</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-600">p90</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-600">p99</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-600">Max</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {metrics.pageLoad && (
                  <tr>
                    <td className="px-4 py-2 font-medium">Page Load</td>
                    <td className="px-4 py-2 text-right text-gray-600">{metrics.pageLoad.min}ms</td>
                    <td className="px-4 py-2 text-right text-gray-600">{metrics.pageLoad.p50}ms</td>
                    <td className="px-4 py-2 text-right text-gray-600">{metrics.pageLoad.p90}ms</td>
                    <td className="px-4 py-2 text-right text-gray-600">{metrics.pageLoad.p99}ms</td>
                    <td className="px-4 py-2 text-right text-gray-600">{metrics.pageLoad.max}ms</td>
                  </tr>
                )}
                {metrics.fcp && (
                  <tr>
                    <td className="px-4 py-2 font-medium">FCP</td>
                    <td className="px-4 py-2 text-right text-gray-600">{metrics.fcp.min}ms</td>
                    <td className="px-4 py-2 text-right text-gray-600">{metrics.fcp.p50}ms</td>
                    <td className="px-4 py-2 text-right text-gray-600">{metrics.fcp.p90}ms</td>
                    <td className="px-4 py-2 text-right text-gray-600">{metrics.fcp.p99}ms</td>
                    <td className="px-4 py-2 text-right text-gray-600">{metrics.fcp.max}ms</td>
                  </tr>
                )}
                {metrics.lcp && (
                  <tr>
                    <td className="px-4 py-2 font-medium">LCP</td>
                    <td className="px-4 py-2 text-right text-gray-600">{metrics.lcp.min}ms</td>
                    <td className="px-4 py-2 text-right text-gray-600">{metrics.lcp.p50}ms</td>
                    <td className="px-4 py-2 text-right text-gray-600">{metrics.lcp.p90}ms</td>
                    <td className="px-4 py-2 text-right text-gray-600">{metrics.lcp.p99}ms</td>
                    <td className="px-4 py-2 text-right text-gray-600">{metrics.lcp.max}ms</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* API Performance */}
      {apiMetrics.size > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
            API Response Times
          </h3>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Endpoint</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-600">Calls</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-600">Avg</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-600">p90</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-600">Max</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {Array.from(apiMetrics.entries()).map(([endpoint, stats]) => (
                  stats && (
                    <tr key={endpoint}>
                      <td className="px-4 py-2 font-mono text-xs">{endpoint}</td>
                      <td className="px-4 py-2 text-right text-gray-600">{stats.count}</td>
                      <td className="px-4 py-2 text-right text-gray-600">{stats.avg}ms</td>
                      <td className="px-4 py-2 text-right text-gray-600">{stats.p90}ms</td>
                      <td className="px-4 py-2 text-right text-gray-600">{stats.max}ms</td>
                    </tr>
                  )
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Events */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
          Recent Performance Events
        </h3>
        {recentEntries.length === 0 ? (
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-8 text-center">
            <p className="text-gray-500">No performance data collected yet.</p>
            <p className="text-sm text-gray-400 mt-1">Navigate to different pages to collect metrics.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden max-h-[300px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Time</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Page</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Metric</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-600">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentEntries.map((entry, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-500 text-xs">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-2 font-medium">{entry.page}</td>
                    <td className="px-4 py-2 text-gray-600">
                      {entry.metric.replace(/_/g, ' ')}
                    </td>
                    <td className="px-4 py-2 text-right font-mono">
                      {entry.metric === 'cumulative_layout_shift'
                        ? (entry.value / 1000).toFixed(3)
                        : `${Math.round(entry.value)}ms`
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
        <h4 className="font-medium text-blue-800 mb-2">About Core Web Vitals</h4>
        <div className="text-sm text-blue-700 space-y-1">
          <p><strong>LCP (Largest Contentful Paint):</strong> Should be ≤2.5s for good UX</p>
          <p><strong>FCP (First Contentful Paint):</strong> Should be ≤1.8s for good UX</p>
          <p><strong>CLS (Cumulative Layout Shift):</strong> Should be ≤0.1 for good UX</p>
        </div>
      </div>
    </div>
  );
}

export default PerformanceDashboard;
