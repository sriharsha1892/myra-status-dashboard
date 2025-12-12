'use client';

import { ProviderStatus } from '@/lib/types';
import { getProviderDisplayName } from '@/lib/view-utils';
import { getTimeSinceGMT } from '@/lib/time-utils';
import { cn } from '@/lib/utils';

interface HeroStatusBannerProps {
  providers: ProviderStatus[];
  lastUpdated: string;
}

// Status indicator with animated glow
function StatusIndicator({ status }: { status: 'operational' | 'degraded' | 'critical' }) {
  const config = {
    operational: {
      color: 'bg-emerald-500',
      glow: 'shadow-[0_0_30px_rgba(16,185,129,0.5)]',
      pulse: 'animate-pulse-slow',
    },
    degraded: {
      color: 'bg-amber-500',
      glow: 'shadow-[0_0_30px_rgba(245,158,11,0.5)]',
      pulse: 'animate-pulse',
    },
    critical: {
      color: 'bg-red-500',
      glow: 'shadow-[0_0_30px_rgba(239,68,68,0.5)]',
      pulse: 'animate-pulse',
    },
  };

  const c = config[status];

  return (
    <div className="relative flex items-center justify-center">
      {/* Outer glow ring */}
      <div className={cn(
        'absolute w-20 h-20 rounded-full opacity-20',
        c.color,
        c.pulse
      )} />
      {/* Inner solid circle */}
      <div className={cn(
        'relative w-16 h-16 rounded-full flex items-center justify-center',
        c.color,
        c.glow,
        'transition-all duration-500'
      )}>
        {status === 'operational' ? (
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : status === 'degraded' ? (
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        ) : (
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
      </div>
    </div>
  );
}

export default function HeroStatusBanner({ providers, lastUpdated }: HeroStatusBannerProps) {
  // Note: Admin view is now handled via /status/admin route instead of context toggle
  const isAdminView = false;
  const primaryProviders = providers.filter((p) => p.provider.priority === 'primary');
  const issuesCount = primaryProviders.filter((p) => p.status !== 'operational').length;
  const allOperational = issuesCount === 0;

  const criticalIssues = primaryProviders.filter(
    (p) => p.status === 'major_outage' || p.status === 'partial_outage'
  );
  const degradedServices = primaryProviders.filter((p) => p.status === 'degraded_performance');

  // Determine status level
  const statusLevel = allOperational ? 'operational' : criticalIssues.length > 0 ? 'critical' : 'degraded';

  // Status configuration
  const statusConfig = {
    operational: {
      badge: 'ALL SYSTEMS OPERATIONAL',
      badgeClass: 'bg-emerald-500',
      cardClass: 'bg-emerald-500/[0.08] border-emerald-500/30',
      headline: 'All Systems Operational',
      subtext: 'myRA AI services and all infrastructure partners are functioning normally.',
    },
    degraded: {
      badge: 'PERFORMANCE ISSUES',
      badgeClass: 'bg-amber-500',
      cardClass: 'bg-amber-500/[0.08] border-amber-500/30',
      headline: 'Performance Issues Detected',
      subtext: `${issuesCount} infrastructure ${issuesCount === 1 ? 'partner is' : 'partners are'} experiencing issues. Core functionality remains available.`,
    },
    critical: {
      badge: 'SERVICE DISRUPTION',
      badgeClass: 'bg-red-500',
      cardClass: 'bg-red-500/[0.08] border-red-500/30',
      headline: 'Service Disruption Detected',
      subtext: `${issuesCount} infrastructure ${issuesCount === 1 ? 'partner is' : 'partners are'} experiencing issues. Some capabilities may be temporarily unavailable.`,
    },
  };

  const config = statusConfig[statusLevel];
  const affectedPartners = criticalIssues.length > 0 ? criticalIssues : degradedServices;

  return (
    <div className={cn(
      'relative overflow-hidden rounded-2xl border-2 backdrop-blur-xl mb-6 transition-all duration-300',
      config.cardClass
    )}>
      <div className="p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          {/* Status Indicator */}
          <div className="flex-shrink-0">
            <StatusIndicator status={statusLevel} />
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Status Badge */}
            <div className="mb-3">
              <span className={cn(
                'inline-block text-[10px] font-black px-3 py-1.5 rounded-md text-white uppercase tracking-widest',
                config.badgeClass,
                'shadow-lg'
              )}>
                {config.badge}
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 tracking-tight">
              {config.headline}
            </h1>

            {/* Subtext */}
            <p className="text-sm md:text-base text-white/70 leading-relaxed max-w-2xl">
              {config.subtext}
            </p>

            {/* Timestamp */}
            <div className="mt-4 flex items-center gap-2 text-xs text-white/50">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Last checked: {getTimeSinceGMT(lastUpdated)}</span>
            </div>
          </div>

          {/* Affected Services Panel */}
          {!allOperational && affectedPartners.length > 0 && (
            <div className="flex-shrink-0 w-full md:w-auto">
              <div className="bg-black/20 border border-white/10 rounded-xl p-4 min-w-[200px]">
                <div className="text-[10px] font-bold uppercase tracking-wider text-white/50 mb-3">
                  Affected Partners
                </div>
                <div className="space-y-2">
                  {affectedPartners.map((p) => (
                    <div
                      key={p.provider.id}
                      className="flex items-center gap-2"
                    >
                      <div className={cn(
                        'w-2 h-2 rounded-full',
                        p.status === 'major_outage' || p.status === 'partial_outage'
                          ? 'bg-red-500'
                          : 'bg-amber-500'
                      )} />
                      <span className="text-sm font-medium text-white/85">
                        {getProviderDisplayName(p.provider, isAdminView)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Decorative gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
    </div>
  );
}
