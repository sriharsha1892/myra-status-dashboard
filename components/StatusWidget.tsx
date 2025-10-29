'use client';

import { useEffect, useState } from 'react';
import { StatusResponse, ServiceStatus } from '@/lib/types';
import StatusIndicator from './StatusIndicator';

interface StatusWidgetProps {
  compact?: boolean;
  showProviders?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

/**
 * Embeddable Status Widget
 *
 * Usage in your main application:
 *
 * import StatusWidget from '@/components/StatusWidget';
 *
 * // Compact version (just overall status)
 * <StatusWidget compact />
 *
 * // Full version with provider list
 * <StatusWidget showProviders />
 *
 * // With custom refresh interval (in ms)
 * <StatusWidget autoRefresh refreshInterval={30000} />
 */
export default function StatusWidget({
  compact = false,
  showProviders = false,
  autoRefresh = true,
  refreshInterval = 60000,
}: StatusWidgetProps) {
  const [statusData, setStatusData] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch('/api/status/current');
        if (!response.ok) throw new Error('Failed to fetch status');
        const data: StatusResponse = await response.json();
        setStatusData(data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching status:', err);
        setLoading(false);
      }
    };

    fetchStatus();

    if (autoRefresh) {
      const interval = setInterval(fetchStatus, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  if (loading) {
    return (
      <div className="glass-effect rounded-lg p-3 animate-pulse">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-slate-300 rounded-full" />
          <div className="h-4 bg-slate-300 rounded w-32" />
        </div>
      </div>
    );
  }

  if (!statusData) {
    return null;
  }

  const operationalCount = statusData.providers.filter(p => p.status === 'operational').length;
  const hasIssues = statusData.overallStatus !== 'operational';

  if (compact) {
    return (
      <div
        className="glass-effect rounded-lg px-3 py-2 cursor-pointer hover:shadow-lg transition-all"
        onClick={() => window.open('/status', '_blank')}
      >
        <div className="flex items-center gap-2">
          <StatusIndicator
            status={statusData.overallStatus}
            showLabel={false}
            showPulse={hasIssues}
          />
          <span className="text-sm font-medium text-slate-700">
            {hasIssues ? 'Service Issues' : 'All Systems Operational'}
          </span>
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-effect rounded-xl overflow-hidden">
      {/* Header */}
      <div
        className="p-4 cursor-pointer hover:bg-slate-50/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <StatusIndicator
              status={statusData.overallStatus}
              showLabel={false}
              showPulse={hasIssues}
              size="lg"
            />
            <div>
              <h3 className="font-semibold text-slate-800">LLM Provider Status</h3>
              <p className="text-sm text-slate-600">
                {operationalCount}/{statusData.providers.length} operational
              </p>
            </div>
          </div>
          <button className="text-slate-400 hover:text-slate-600 transition-colors">
            <svg
              className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Provider List */}
      {(showProviders || isExpanded) && (
        <div className="border-t border-slate-200">
          <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
            {statusData.providers.map((provider) => (
              <div
                key={provider.provider.id}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: provider.provider.color }}
                  >
                    {provider.provider.name.substring(0, 2)}
                  </div>
                  <span className="text-sm font-medium text-slate-700">
                    {provider.provider.userFacingName}
                  </span>
                </div>
                <StatusIndicator
                  status={provider.status}
                  showLabel={false}
                  size="sm"
                  showPulse={provider.status !== 'operational'}
                />
              </div>
            ))}
          </div>
          <div className="p-3 bg-slate-50/50 border-t border-slate-200">
            <a
              href="/status"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-myra-primary hover:text-myra-secondary font-medium flex items-center justify-center gap-1 transition-colors"
            >
              View Full Status Dashboard
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
