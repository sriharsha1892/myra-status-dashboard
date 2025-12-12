'use client';

import { useEffect, useState } from 'react';
import { ResearchStatusResponse } from '@/lib/research-status';
import ResearchStatusHero from '@/components/ResearchStatusHero';
import AuthStatusSection from '@/components/AuthStatusSection';
import PipelineStages from '@/components/PipelineStages';
import StatusIncidentTimeline from '@/components/StatusIncidentTimeline';
import UptimeStats from '@/components/UptimeStats';
import AnimatedBackground from '@/components/AnimatedBackground';
import SubscribeModal from '@/components/SubscribeModal';
import { cn } from '@/lib/utils';

// Map research engine status to AnimatedBackground status
function mapToBackgroundStatus(status: string): 'operational' | 'degraded_performance' | 'major_outage' {
  switch (status) {
    case 'operational':
      return 'operational';
    case 'delayed':
      return 'degraded_performance';
    case 'unavailable':
      return 'major_outage';
    default:
      return 'operational';
  }
}

export default function StatusPage() {
  const [statusData, setStatusData] = useState<ResearchStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);

  const fetchStatus = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);

    try {
      const timestamp = Date.now();
      const response = await fetch(`/api/status/current?_t=${timestamp}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });

      if (!response.ok) throw new Error('Failed to fetch status');
      const data: ResearchStatusResponse = await response.json();

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

    // Keyboard shortcut for refresh
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.key === 'r' || e.key === 'R') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        fetchStatus(true);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => {
      clearInterval(interval);
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, []);

  // Fast retry when data is stale or cold start
  useEffect(() => {
    if (!statusData) return;

    const needsRefresh = (statusData as any).isStale || (statusData as any).isColdStart;

    if (needsRefresh) {
      const fastRetry = setTimeout(() => fetchStatus(), 1500);
      return () => clearTimeout(fastRetry);
    }
  }, [statusData]);

  // Loading state
  if (loading && !statusData) {
    return (
      <div className="min-h-screen pb-10">
        <AnimatedBackground />
        <header className="sticky top-0 z-50 border-b border-white/10 bg-gradient-to-b from-purple-500/[0.04] to-slate-900/95 backdrop-blur-xl shadow-sm">
          <div className="max-w-4xl mx-auto px-4 sm:px-8">
            <div className="h-16 flex items-center justify-between">
              <h1 className="text-base font-semibold text-white/90 tracking-tight">
                myRA AI Status
              </h1>
              <span className="text-sm text-white/60">Checking status...</span>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-8 py-8">
          {/* Loading skeleton */}
          <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-6 mb-6">
            <div className="h-6 w-32 bg-white/10 rounded animate-pulse mb-4" />
            <div className="h-8 w-3/4 bg-white/5 rounded animate-pulse mb-2" />
            <div className="h-4 w-1/2 bg-white/5 rounded animate-pulse" />
          </div>
        </main>
      </div>
    );
  }

  // Error state
  if (error || !statusData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-5">
        <AnimatedBackground status="major_outage" />
        <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-8 max-w-md text-center">
          <h2 className="text-lg font-semibold text-white mb-2">Unable to load status</h2>
          <p className="text-sm text-white/60 mb-6">{error || 'An unknown error occurred'}</p>
          <button
            onClick={() => fetchStatus(true)}
            className="px-6 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-10 relative">
      <AnimatedBackground status={mapToBackgroundStatus(statusData.researchEngine.status)} />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-gradient-to-b from-purple-500/[0.04] to-slate-900/95 backdrop-blur-xl shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-8">
          <div className="h-16 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h1 className="text-base font-semibold text-white/90 tracking-tight">
                myRA AI Status
              </h1>
              <a
                href="https://ask-myra.ai"
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold text-white',
                  'bg-gradient-to-r from-purple-600 to-violet-600',
                  'hover:opacity-90 transition-opacity'
                )}
              >
                myRA AI
              </a>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSubscribeModal(true)}
                className={cn(
                  'px-4 py-2 rounded-lg text-xs font-semibold',
                  'bg-blue-500/20 border border-blue-500/40 text-blue-300',
                  'hover:bg-blue-500/30 transition-colors'
                )}
              >
                Subscribe
              </button>
              <button
                onClick={() => fetchStatus(true)}
                disabled={refreshing}
                className={cn(
                  'px-4 py-2 rounded-lg text-xs font-semibold',
                  'border border-white/20 text-white/90',
                  'transition-colors',
                  refreshing
                    ? 'bg-white/5 opacity-60 cursor-not-allowed'
                    : 'bg-white/10 hover:bg-white/15'
                )}
              >
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-8 py-6 sm:py-8 space-y-6">
        {/* Hero Status Card */}
        <ResearchStatusHero
          status={statusData.researchEngine.status}
          message={statusData.researchEngine.message}
          affectedStages={statusData.researchEngine.affectedStages}
          lastUpdated={statusData.lastUpdated}
          onNotifyClick={() => setShowSubscribeModal(true)}
        />

        {/* Auth Status */}
        <AuthStatusSection
          google={statusData.authentication.google}
          microsoft={statusData.authentication.microsoft}
        />

        {/* Pipeline Stages */}
        <PipelineStages stages={statusData.pipeline.stages} />

        {/* Incident Timeline (only shows if there are incidents) */}
        <StatusIncidentTimeline incidents={statusData.incidents} />

        {/* Uptime Stats */}
        <UptimeStats
          thirtyDayUptime={statusData.uptimeStats.thirtyDayUptime}
          incidentsThisMonth={statusData.uptimeStats.incidentsThisMonth}
        />
      </main>

      {/* Subscribe Modal */}
      <SubscribeModal
        isOpen={showSubscribeModal}
        onClose={() => setShowSubscribeModal(false)}
        providers={[]}
      />

      {/* Footer */}
      <footer className="border-t border-white/10 mt-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 text-center">
          <p className="text-sm text-white/70 mb-1">
            <strong className="font-bold">myRA AI</strong> Status
          </p>
          <p className="text-xs text-white/50">
            A joint undertaking of Mordor Intelligence and Prodgain
          </p>
        </div>
      </footer>
    </div>
  );
}
