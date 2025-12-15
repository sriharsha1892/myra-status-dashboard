'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { StatusResponse, ProviderStatus } from '@/lib/types';
import ServiceStatusCard from '@/components/ServiceStatusCard';
import HeroStatusBanner from '@/components/HeroStatusBanner';
import WorkflowStatus from '@/components/WorkflowStatus';
import { SkeletonCard } from '@/components/skeletons';
import AnimatedBackground from '@/components/AnimatedBackground';
import IncidentHistory from '@/components/IncidentHistory';
import StatusHistory from '@/components/StatusHistory';
import ServiceDependencies from '@/components/ServiceDependencies';
import ActiveIncidentsTimeline from '@/components/ActiveIncidentsTimeline';
import AnnouncementBanner from '@/components/AnnouncementBanner';
import SubscribeModal from '@/components/SubscribeModal';
import { useStatusNotifications } from '@/hooks/useStatusNotifications';
import { ViewModeProvider } from '@/contexts/ViewModeContext';
import { cn } from '@/lib/utils';

interface Announcement {
  id: string;
  type: 'feature' | 'update' | 'maintenance' | 'alert';
  priority: 'low' | 'normal' | 'high' | 'critical';
  status: string;
  title: string;
  message: string;
  created_at: string;
  updated_at: string;
}

// Lazy load NetworkDiagnostics for better initial load performance
const NetworkDiagnostics = dynamic(() => import('@/components/NetworkDiagnostics'), {
  loading: () => (
    <div className="py-5 text-center text-white/50">Loading diagnostics...</div>
  ),
  ssr: false,
});

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'warning' | 'error' | 'info';
  providerId?: string;
}

// Toast styling configuration
const TOAST_CONFIG = {
  success: {
    bgClass: 'bg-emerald-500/15',
    borderClass: 'border-emerald-500/40',
    iconBgClass: 'bg-emerald-500',
    icon: '✓',
  },
  error: {
    bgClass: 'bg-red-500/15',
    borderClass: 'border-red-500/40',
    iconBgClass: 'bg-red-500',
    icon: '✕',
  },
  warning: {
    bgClass: 'bg-amber-500/15',
    borderClass: 'border-amber-500/40',
    iconBgClass: 'bg-amber-500',
    icon: '⚠',
  },
  info: {
    bgClass: 'bg-blue-500/15',
    borderClass: 'border-blue-500/40',
    iconBgClass: 'bg-blue-500',
    icon: 'i',
  },
} as const;

// Section Header component
function SectionHeader({
  title,
  subtitle,
  accentColor = 'purple',
}: {
  title: string;
  subtitle: string;
  accentColor?: 'purple' | 'blue' | 'amber';
}) {
  const borderColors = {
    purple: 'border-purple-500/30',
    blue: 'border-blue-500/30',
    amber: 'border-amber-500/30',
  };

  return (
    <div className={cn('mb-5 pb-4 border-b-2', borderColors[accentColor])}>
      <h2 className="text-base font-bold text-white/95 mb-1.5 tracking-tight uppercase">
        {title}
      </h2>
      <p className="text-xs text-white/50 leading-relaxed">{subtitle}</p>
    </div>
  );
}

// Toast notification component
function ToastNotification({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: () => void;
}) {
  const config = TOAST_CONFIG[toast.type];

  return (
    <div
      className={cn(
        'px-4 py-3.5 rounded-xl backdrop-blur-xl border cursor-pointer',
        'shadow-[0_8px_32px_rgba(0,0,0,0.2)]',
        'animate-[slideInRight_0.3s_ease-out]',
        'transition-transform duration-200 hover:-translate-x-1',
        'flex items-center gap-3',
        config.bgClass,
        config.borderClass
      )}
      onClick={onDismiss}
    >
      <div
        className={cn(
          'w-6 h-6 rounded-full flex items-center justify-center text-white text-[13px] font-bold flex-shrink-0',
          config.iconBgClass
        )}
      >
        {config.icon}
      </div>
      <div className="flex-1">
        <div className="text-[13px] font-semibold text-white/95">{toast.message}</div>
      </div>
    </div>
  );
}

function StatusPageContent() {
  const [statusData, setStatusData] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdateText, setLastUpdateText] = useState('Just now');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);

  // Enable status change notifications
  useStatusNotifications(statusData?.providers || []);

  const addToast = (message: string, type: Toast['type'], providerId?: string) => {
    const id = Date.now().toString();
    const newToast: Toast = { id, message, type, providerId };
    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  const fetchStatus = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);

    try {
      const timestamp = Date.now();
      const statusResponse = await fetch(`/api/status/current?_t=${timestamp}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });

      if (!statusResponse.ok) throw new Error('Failed to fetch status');
      const data: StatusResponse = await statusResponse.json();

      // Detect status changes and show toasts
      if (statusData && !isManualRefresh) {
        data.providers.forEach((newProvider: ProviderStatus) => {
          const oldProvider = statusData.providers.find(
            (p: ProviderStatus) => p.provider.id === newProvider.provider.id
          );
          if (oldProvider && oldProvider.status !== newProvider.status) {
            const statusMap: Record<string, string> = {
              operational: '✅',
              degraded_performance: '⚠️',
              partial_outage: '🔴',
              major_outage: '🚨',
              under_maintenance: '🔧',
            };
            const icon = statusMap[newProvider.status] || '📊';
            const statusText = newProvider.status.replace(/_/g, ' ');
            addToast(
              `${icon} ${newProvider.provider.displayName}: ${statusText}`,
              newProvider.status === 'operational'
                ? 'success'
                : newProvider.status.includes('outage')
                ? 'error'
                : 'warning',
              newProvider.provider.id
            );
          }
        });
      }

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

  const fetchAnnouncements = async () => {
    try {
      const timestamp = Date.now();
      const response = await fetch(`/api/announcements?_t=${timestamp}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      const data = await response.json();
      if (data.success && data.announcements) {
        setAnnouncements(data.announcements);
      }
    } catch (err) {
      console.error('Failed to fetch announcements:', err);
    }
  };

  // Update relative time text
  useEffect(() => {
    if (!statusData) return;

    const updateTimeText = () => {
      const seconds = Math.floor(
        (Date.now() - new Date(statusData.lastUpdated).getTime()) / 1000
      );
      if (seconds < 10) setLastUpdateText('Just now');
      else if (seconds < 60) setLastUpdateText(`${seconds}s ago`);
      else if (seconds < 3600) setLastUpdateText(`${Math.floor(seconds / 60)}m ago`);
      else setLastUpdateText(`${Math.floor(seconds / 3600)}h ago`);
    };

    updateTimeText();
    const interval = setInterval(updateTimeText, 5000);
    return () => clearInterval(interval);
  }, [statusData]);

  useEffect(() => {
    fetchStatus();
    fetchAnnouncements();
    const statusInterval = setInterval(() => fetchStatus(), 60000);
    const announcementsInterval = setInterval(() => fetchAnnouncements(), 120000); // Check announcements every 2 minutes

    // Keyboard shortcuts
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') {
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          fetchStatus(true);
          fetchAnnouncements();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => {
      clearInterval(statusInterval);
      clearInterval(announcementsInterval);
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, []);

  // Fast retry when data is stale or cold start (get real data quickly)
  useEffect(() => {
    if (!statusData) return;

    // Use the isStale flag from API, or fallback to checking for unknown status
    const needsRefresh = statusData.isStale || statusData.isColdStart ||
      statusData.providers.some((p: ProviderStatus) => p.status === 'unknown');

    if (needsRefresh) {
      // Retry quickly to get real data (1.5s instead of 3s)
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
          <div className="max-w-6xl mx-auto px-4 sm:px-8">
            <div className="h-16 flex items-center justify-between">
              <h1 className="text-[15px] font-semibold text-white/90 tracking-tight">
                myRA AI System Status
              </h1>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
                </span>
                <span className="text-[13px] text-white/60 font-medium">Checking status...</span>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 sm:px-8 py-8">
          {/* Hero skeleton */}
          <div className="mb-6 p-6 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-white/10 animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-6 w-48 bg-white/10 rounded animate-pulse" />
                <div className="h-4 w-64 bg-white/5 rounded animate-pulse" />
              </div>
            </div>
          </div>

          {/* Service cards skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="p-5 rounded-xl bg-white/[0.02] border border-white/10 backdrop-blur-sm"
              >
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-white/10 animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-5 w-32 bg-white/10 rounded animate-pulse" />
                    <div className="h-3 w-20 bg-white/5 rounded animate-pulse" />
                  </div>
                  <div className="w-16 h-6 bg-white/5 rounded-full animate-pulse" />
                </div>
                <div className="space-y-2">
                  <div className="h-3 w-full bg-white/5 rounded animate-pulse" />
                  <div className="h-3 w-3/4 bg-white/5 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  // Error state
  if (error || !statusData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-5">
        <div className="glass-card-dark p-8 rounded-2xl max-w-md text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-lg font-semibold text-white mb-2">Unable to load status</h2>
          <p className="text-sm text-white/80 mb-6">{error || 'An unknown error occurred'}</p>
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
      <AnimatedBackground status={statusData?.overallStatus} />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-gradient-to-b from-purple-500/[0.04] to-slate-900/95 backdrop-blur-xl shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-8">
          <div className="h-16 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-[15px] font-semibold text-white/90 tracking-tight">
                myRA AI System Status
              </h1>
              <a
                href="https://ask-myra.ai"
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'px-3.5 py-1.5 rounded-lg text-[13px] font-semibold text-white',
                  'bg-gradient-to-r from-purple-600 to-violet-600',
                  'shadow-[0_2px_8px_rgba(102,126,234,0.3)]',
                  'hover:shadow-[0_4px_12px_rgba(102,126,234,0.4)]',
                  'hover:-translate-y-0.5 transition-all duration-200',
                  'flex items-center gap-1.5 whitespace-nowrap'
                )}
              >
                myRA AI
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[13px] text-white/60 font-medium">{lastUpdateText}</span>
              <button
                onClick={() => setShowSubscribeModal(true)}
                className={cn(
                  'px-4 py-2 rounded-lg text-[13px] font-semibold',
                  'bg-blue-500/20 border border-blue-500/40 text-blue-300',
                  'hover:bg-blue-500/30 hover:border-blue-500/50',
                  'flex items-center gap-1.5 transition-all duration-200'
                )}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                <span className="hidden sm:inline">Subscribe</span>
              </button>
              <button
                onClick={() => fetchStatus(true)}
                disabled={refreshing}
                className={cn(
                  'px-4 py-2 rounded-lg text-[13px] font-semibold',
                  'border border-white/20 text-white/90',
                  'flex items-center gap-1.5 transition-all duration-200',
                  refreshing
                    ? 'bg-white/5 opacity-60 cursor-not-allowed'
                    : 'bg-white/10 hover:bg-white/15 hover:border-white/30'
                )}
              >
                <span className={cn(refreshing && 'animate-spin')}>↻</span>
                Refresh
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-6 sm:py-8">
        {/* Team Communications Section */}
        <section className="mb-8">
          <SectionHeader
            title="Team Communications"
            subtitle="Official updates and announcements from the myRA AI operations team"
            accentColor="purple"
          />

          {/* Announcements from Database */}
          {announcements.length > 0 ? (
            <AnnouncementBanner announcements={announcements} />
          ) : (
            // Default operational message when no announcements
            <div className="bg-emerald-500/15 border-2 border-emerald-500/40 rounded-xl p-4 sm:p-5 backdrop-blur-xl shadow-sm">
              <div className="flex items-start gap-3">
                <span className="text-2xl flex-shrink-0">✅</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <h3 className="text-sm font-bold text-white">All Systems Operational</h3>
                    <span className="text-[9px] font-extrabold px-2 py-0.5 rounded bg-emerald-500 text-white uppercase tracking-wider">
                      Normal
                    </span>
                  </div>
                  <p className="text-[13px] text-white/85 leading-relaxed mb-2">
                    All myRA AI services are operating normally. No scheduled maintenance or known issues at this time.
                  </p>
                  <div className="text-[11px] text-white/50">
                    No active announcements
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Infrastructure Status Section */}
        <section className="mb-8">
          <SectionHeader
            title="Infrastructure Status"
            subtitle="Real-time monitoring of infrastructure partner health and service dependencies that power myRA AI operations"
            accentColor="blue"
          />

          <div className="p-4 sm:p-6 bg-blue-500/[0.03] border-2 border-blue-500/20 rounded-2xl">
            {/* Hero Status Banner */}
            <HeroStatusBanner
              providers={statusData.providers}
              lastUpdated={statusData.lastUpdated}
            />

            {/* Workflow Status - Primary View */}
            <WorkflowStatus providers={statusData.providers} />

            {/* Active Incidents Timeline */}
            <ActiveIncidentsTimeline providers={statusData.providers} />

            {/* Impact Radius */}
            <ServiceDependencies providers={statusData.providers} />

            {/* Incident History */}
            <IncidentHistory providers={statusData.providers} />

            {/* Infrastructure Partners Cards */}
            <div className="mt-6">
              <div className="mb-4">
                <h3 className="text-[13px] font-semibold text-white/90 mb-1 tracking-tight">
                  Service Status Details
                </h3>
                <p className="text-[11px] text-white/50 leading-snug">
                  Detailed status of individual infrastructure partner services
                </p>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {statusData.providers
                  .filter((p: ProviderStatus) => p.provider.priority === 'primary')
                  .map((providerStatus: ProviderStatus) => (
                    <ServiceStatusCard
                      key={providerStatus.provider.id}
                      providerStatus={providerStatus}
                      onNotificationSubscribe={(message) => addToast(message, 'success')}
                    />
                  ))}
              </div>
            </div>
          </div>
        </section>

        {/* Diagnostic Tools Section */}
        <section className="mb-8">
          <SectionHeader
            title="Diagnostic Tools"
            subtitle="Connectivity testing and network diagnostics to isolate performance issues between your environment and myRA AI services"
            accentColor="amber"
          />

          <details
            open={showDiagnostics}
            onToggle={(e: React.SyntheticEvent<HTMLDetailsElement>) =>
              setShowDiagnostics(e.currentTarget.open)
            }
          >
            <summary
              className={cn(
                'text-[13px] font-semibold text-white/85 cursor-pointer',
                'flex items-center gap-2 list-none',
                'px-4 py-3.5 rounded-xl transition-all duration-200',
                'bg-amber-500/8 border-2 border-amber-500/20',
                'hover:bg-amber-500/12 hover:border-amber-500/30'
              )}
            >
              <span
                className={cn(
                  'transition-transform duration-200',
                  showDiagnostics && 'rotate-90'
                )}
              >
                ▸
              </span>
              Run Network Tests
              <span className="text-[11px] font-normal text-white/40 ml-auto">
                {showDiagnostics ? 'Hide' : 'Show'} detailed diagnostics
              </span>
            </summary>
            <div className="mt-3 p-5 bg-amber-500/[0.03] border-2 border-amber-500/15 rounded-xl">
              <NetworkDiagnostics />
            </div>
          </details>
        </section>

        {/* Status History */}
        <StatusHistory providers={statusData.providers} />
      </main>

      {/* Toast Notifications */}
      <div className="fixed top-[90px] right-4 sm:right-5 z-[200] flex flex-col gap-3 max-w-[400px] w-full sm:w-auto">
        {toasts.map((toast) => (
          <ToastNotification
            key={toast.id}
            toast={toast}
            onDismiss={() => {
              setToasts((prev) => prev.filter((t) => t.id !== toast.id));
              if (toast.providerId) {
                document
                  .getElementById(`provider-${toast.providerId}`)
                  ?.scrollIntoView({ behavior: 'smooth' });
              }
            }}
          />
        ))}
      </div>

      {/* Subscribe Modal */}
      <SubscribeModal
        isOpen={showSubscribeModal}
        onClose={() => setShowSubscribeModal(false)}
        providers={statusData.providers.map((p: ProviderStatus) => ({
          name: p.provider.id,
          displayName: p.provider.displayName,
        }))}
      />

      {/* Footer */}
      <footer className="glass-card-dark border-t border-white/20 mt-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 text-center">
          <p className="text-sm text-white mb-1.5">
            <strong className="font-bold">myRA AI</strong> Status Dashboard
          </p>
          <p className="text-xs text-white/60 mb-3">
            A joint undertaking of Mordor Intelligence and Prodgain
          </p>
          <div className="flex gap-4 items-center justify-center">
            <a
              href="/widget-demo"
              className="text-xs text-blue-400 hover:underline flex items-center gap-1"
            >
              Embed Widget
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                />
              </svg>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Wrap with ViewModeProvider for admin/user view switching
export default function StatusPage() {
  return (
    <ViewModeProvider>
      <StatusPageContent />
    </ViewModeProvider>
  );
}
