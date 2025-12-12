'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AnimatedBackground from '@/components/AnimatedBackground';
import { cn } from '@/lib/utils';

interface AdminProviderStatus {
  provider: {
    id: string;
    name: string;
    displayName: string;
    userFacingName: string;
    statusPageUrl?: string;
    color: string;
    priority?: string;
    models?: string[];
    role?: string;
    regions?: string[];
    services?: string[];
  };
  status: string;
  indicator: string;
  lastUpdated: string;
  components: any[];
  incidents: any[];
  uptimePercentage: number;
}

interface AdminStatusResponse {
  providers: AdminProviderStatus[];
  lastUpdated: string;
  overallStatus: string;
  isStale?: boolean;
  isColdStart?: boolean;
  error?: string;
}

// Status styling
const STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  operational: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  degraded_performance: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
  partial_outage: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30' },
  major_outage: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
  under_maintenance: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
  unknown: { bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/30' },
};

export default function AdminStatusPage() {
  const router = useRouter();
  const [statusData, setStatusData] = useState<AdminStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStatus = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);

    try {
      const response = await fetch('/api/status/admin', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });

      if (response.status === 401) {
        // Not authenticated - redirect to login
        router.push('/support/login');
        return;
      }

      if (response.status === 403) {
        setError('Admin access required');
        setLoading(false);
        return;
      }

      if (!response.ok) throw new Error('Failed to fetch status');

      const data: AdminStatusResponse = await response.json();
      setStatusData(data);
      setLoading(false);
      setError(null);
    } catch (err) {
      setError('Failed to load status data');
      setLoading(false);
    } finally {
      if (isManualRefresh) {
        setTimeout(() => setRefreshing(false), 500);
      }
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(() => fetchStatus(), 60000);
    return () => clearInterval(interval);
  }, []);

  // Loading state
  if (loading && !statusData) {
    return (
      <div className="min-h-screen pb-10">
        <AnimatedBackground />
        <header className="sticky top-0 z-50 border-b border-white/10 bg-gradient-to-b from-red-500/[0.04] to-slate-900/95 backdrop-blur-xl">
          <div className="max-w-6xl mx-auto px-4 sm:px-8">
            <div className="h-16 flex items-center justify-between">
              <h1 className="text-base font-semibold text-white/90">
                Admin Status Dashboard
              </h1>
              <span className="text-sm text-white/60">Loading...</span>
            </div>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-4 sm:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="rounded-xl bg-white/[0.03] border border-white/10 p-5 animate-pulse">
                <div className="h-5 w-32 bg-white/10 rounded mb-3" />
                <div className="h-4 w-24 bg-white/5 rounded" />
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-5">
        <AnimatedBackground status="major_outage" />
        <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-8 max-w-md text-center">
          <h2 className="text-lg font-semibold text-white mb-2">{error}</h2>
          <p className="text-sm text-white/60 mb-6">
            {error === 'Admin access required'
              ? 'You need admin privileges to view this page.'
              : 'An error occurred while loading the status.'}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => router.push('/status')}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-sm font-medium transition-colors"
            >
              View Public Status
            </button>
            <button
              onClick={() => fetchStatus(true)}
              className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!statusData) return null;

  const getStatusStyle = (status: string) => STATUS_STYLES[status] || STATUS_STYLES.unknown;

  return (
    <div className="min-h-screen pb-10">
      <AnimatedBackground status={statusData.overallStatus as any} />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-red-500/20 bg-gradient-to-b from-red-500/[0.08] to-slate-900/95 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-8">
          <div className="h-16 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h1 className="text-base font-semibold text-white/90">
                Admin Status Dashboard
              </h1>
              <span className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-400 font-medium uppercase">
                Admin Only
              </span>
            </div>

            <div className="flex items-center gap-2">
              <a
                href="/status"
                className="px-4 py-2 rounded-lg text-xs font-medium bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 transition-colors"
              >
                Public View
              </a>
              <button
                onClick={() => fetchStatus(true)}
                disabled={refreshing}
                className={cn(
                  'px-4 py-2 rounded-lg text-xs font-semibold',
                  'border border-white/20 text-white/90 transition-colors',
                  refreshing ? 'bg-white/5 opacity-60' : 'bg-white/10 hover:bg-white/15'
                )}
              >
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-6 space-y-6">
        {/* Overall Status */}
        <div className={cn(
          'rounded-xl border-2 p-5',
          getStatusStyle(statusData.overallStatus).bg,
          getStatusStyle(statusData.overallStatus).border
        )}>
          <div className="flex items-center justify-between">
            <div>
              <span className={cn(
                'text-xs font-bold uppercase tracking-wider',
                getStatusStyle(statusData.overallStatus).text
              )}>
                Overall: {statusData.overallStatus.replace(/_/g, ' ')}
              </span>
              <p className="text-sm text-white/60 mt-1">
                Last updated: {new Date(statusData.lastUpdated).toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-white/50">
                {statusData.providers.length} providers monitored
              </div>
            </div>
          </div>
        </div>

        {/* Provider Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {statusData.providers.map(provider => {
            const style = getStatusStyle(provider.status);
            return (
              <div
                key={provider.provider.id}
                className={cn(
                  'rounded-xl border p-5',
                  style.bg,
                  style.border
                )}
              >
                {/* Provider Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-base font-semibold text-white/90">
                      {provider.provider.name}
                    </h3>
                    <p className="text-xs text-white/50 mt-0.5">
                      {provider.provider.displayName}
                    </p>
                  </div>
                  <span className={cn(
                    'text-xs font-medium px-2 py-1 rounded uppercase',
                    style.bg,
                    style.text
                  )}>
                    {provider.status.replace(/_/g, ' ')}
                  </span>
                </div>

                {/* Provider Details */}
                <div className="space-y-2 text-xs">
                  {/* Uptime */}
                  <div className="flex justify-between text-white/60">
                    <span>Uptime (24h)</span>
                    <span className="font-medium text-white/80">
                      {provider.uptimePercentage}%
                    </span>
                  </div>

                  {/* Models */}
                  {provider.provider.models && provider.provider.models.length > 0 && (
                    <div className="flex justify-between text-white/60">
                      <span>Models</span>
                      <span className="font-medium text-white/70 text-right max-w-[60%] truncate">
                        {provider.provider.models.join(', ')}
                      </span>
                    </div>
                  )}

                  {/* Role */}
                  {provider.provider.role && (
                    <div className="flex justify-between text-white/60">
                      <span>Role</span>
                      <span className="font-medium text-white/70 capitalize">
                        {provider.provider.role}
                      </span>
                    </div>
                  )}

                  {/* Active Incidents */}
                  {provider.incidents.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <span className="text-white/50 block mb-2">
                        Active Incidents ({provider.incidents.length})
                      </span>
                      {provider.incidents.slice(0, 2).map(incident => (
                        <div
                          key={incident.id}
                          className="text-xs text-amber-400/80 mb-1 truncate"
                        >
                          {incident.name}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Status Page Link */}
                  {provider.provider.statusPageUrl && (
                    <a
                      href={provider.provider.statusPageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 transition-colors inline-block mt-2"
                    >
                      View Status Page
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 mt-10">
        <div className="max-w-6xl mx-auto px-4 py-6 text-center">
          <p className="text-xs text-white/40">
            Admin Status Dashboard - Provider details are confidential
          </p>
        </div>
      </footer>
    </div>
  );
}
