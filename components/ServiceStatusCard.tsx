'use client';

import React from 'react';
import { ProviderStatus } from '@/lib/types';
import { useViewMode } from '@/contexts/ViewModeContext';
import { getProviderDisplayName, shouldShowSensitiveInfo } from '@/lib/view-utils';
import { cn } from '@/lib/utils';

interface ServiceStatusCardProps {
  providerStatus: ProviderStatus;
  onNotificationSubscribe?: (message: string) => void;
}

// Status configurations
const STATUS_CONFIG = {
  operational: {
    text: 'Operational',
    badgeClass: 'bg-emerald-500 text-white',
    stripClass: 'bg-emerald-500',
    cardClass: 'bg-white/[0.03] border-white/10 hover:bg-white/[0.05] hover:border-white/15',
  },
  degraded_performance: {
    text: 'Degraded',
    badgeClass: 'bg-amber-500 text-white',
    stripClass: 'bg-amber-500',
    cardClass: 'bg-amber-500/[0.08] border-amber-500/30 hover:bg-amber-500/[0.12] hover:border-amber-500/40',
  },
  partial_outage: {
    text: 'Partial Outage',
    badgeClass: 'bg-orange-500 text-white',
    stripClass: 'bg-orange-500',
    cardClass: 'bg-orange-500/[0.08] border-orange-500/30 hover:bg-orange-500/[0.12] hover:border-orange-500/40',
  },
  major_outage: {
    text: 'Major Outage',
    badgeClass: 'bg-red-500 text-white',
    stripClass: 'bg-red-500',
    cardClass: 'bg-red-500/[0.08] border-red-500/30 hover:bg-red-500/[0.12] hover:border-red-500/40',
  },
  under_maintenance: {
    text: 'Maintenance',
    badgeClass: 'bg-blue-500 text-white',
    stripClass: 'bg-blue-500',
    cardClass: 'bg-blue-500/[0.08] border-blue-500/30 hover:bg-blue-500/[0.12] hover:border-blue-500/40',
  },
  unknown: {
    text: 'Checking...',
    badgeClass: 'bg-slate-500/80 text-white animate-pulse',
    stripClass: 'bg-slate-400 animate-pulse',
    cardClass: 'bg-white/[0.02] border-white/8 hover:bg-white/[0.04] hover:border-white/12',
  },
} as const;

const getUserFriendlyMessage = (status: string, enables?: string) => {
  switch (status) {
    case 'degraded_performance':
      return enables
        ? `This service is experiencing slowdowns. You can still use ${enables.toLowerCase()}, but expect some delays.`
        : `This service is experiencing slowdowns. Some delays may occur.`;
    case 'partial_outage':
      return `This service is partially unavailable. Some capabilities may be temporarily limited.`;
    case 'major_outage':
      return `This service is currently unavailable. Our service provider is working to restore it.`;
    case 'under_maintenance':
      return `This service is undergoing scheduled maintenance.`;
    case 'unknown':
      return `Checking service status...`;
    default:
      return '';
  }
};

const getTimeSince = (dateString: string) => {
  const now = new Date();
  const then = new Date(dateString);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
};

// Mini progress ring for uptime
function UptimeRing({ percentage }: { percentage: number }) {
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const color = percentage >= 99 ? '#10b981' : percentage >= 95 ? '#f59e0b' : '#ef4444';

  return (
    <div className="relative w-10 h-10 flex items-center justify-center">
      <svg className="w-10 h-10 -rotate-90">
        <circle
          cx="20"
          cy="20"
          r={radius}
          strokeWidth="3"
          fill="none"
          className="stroke-white/10"
        />
        <circle
          cx="20"
          cy="20"
          r={radius}
          strokeWidth="3"
          fill="none"
          stroke={color}
          strokeLinecap="round"
          style={{
            strokeDasharray: circumference,
            strokeDashoffset,
            transition: 'stroke-dashoffset 0.5s ease',
          }}
        />
      </svg>
      <span className="absolute text-[10px] font-semibold text-white/80">
        {percentage.toFixed(0)}%
      </span>
    </div>
  );
}

export default function ServiceStatusCard({ providerStatus, onNotificationSubscribe }: ServiceStatusCardProps) {
  const { provider, status, incidents } = providerStatus;
  const [isExpanded, setIsExpanded] = React.useState(false);
  const { isAdminView } = useViewMode();

  const isOperational = status === 'operational';
  const hasIssues = !isOperational;
  const displayName = getProviderDisplayName(provider, isAdminView);
  const showSensitive = shouldShowSensitiveInfo(isAdminView);

  const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.unknown;

  // Get most recent active incident
  const activeIncident = incidents?.find(
    (i) => i.status !== 'resolved' && i.status !== 'postmortem'
  );

  // Determine if there's additional info to show
  const hasAdditionalInfo = (showSensitive && (provider.models || provider.regions || provider.services)) || provider.impacts || provider.role;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border backdrop-blur-xl transition-all duration-200',
        config.cardClass
      )}
    >
      {/* Status indicator strip on left edge */}
      <div className={cn('absolute left-0 top-0 bottom-0 w-1', config.stripClass)} />

      <div className="pl-4 pr-4 py-3">
        {/* Header Row */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="text-base font-semibold text-white/95">
              {displayName}
            </h3>
            {provider.role && (
              <span
                className={cn(
                  'text-[9px] font-bold px-2 py-1 rounded uppercase tracking-wider',
                  provider.role === 'fallback'
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-white/10 text-white/60'
                )}
              >
                {provider.role}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Uptime Ring */}
            {providerStatus.uptimePercentage !== undefined && (
              <UptimeRing percentage={providerStatus.uptimePercentage} />
            )}

            {/* Status Badge */}
            <span
              className={cn(
                'text-[10px] font-bold px-3 py-1.5 rounded-md uppercase tracking-wider whitespace-nowrap',
                config.badgeClass
              )}
            >
              {config.text}
            </span>
          </div>
        </div>

        {/* Incident timing - subtle */}
        {incidents && incidents.length > 0 && (
          <div className="flex items-center gap-2 text-[11px] text-white/40 mb-2">
            {activeIncident ? (
              <span>Issue started {getTimeSince(activeIncident.created_at)}</span>
            ) : (
              <span>Last issue {getTimeSince(incidents[0].created_at)}</span>
            )}
          </div>
        )}

        {/* Description / User-friendly message */}
        <p className={cn(
          'text-[13px] leading-relaxed mb-2',
          isOperational ? 'text-white/60' : 'text-white/80'
        )}>
          {hasIssues ? getUserFriendlyMessage(status, provider.enables) : provider.enables}
        </p>

        {/* Impact Statement when there are issues */}
        {hasIssues && provider.impacts && (
          <div className="p-3 bg-red-500/15 border border-red-500/25 rounded-lg mb-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-red-400 mb-1">
              Impact
            </div>
            <div className="text-xs text-white/85 leading-relaxed">
              {provider.impacts}
            </div>
          </div>
        )}

        {/* Expandable Details Section */}
        {hasAdditionalInfo && (
          <>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-2 px-3 py-1.5 mt-1 text-[11px] font-semibold text-white/70 bg-white/5 border border-white/10 rounded-md hover:bg-white/8 hover:border-white/15 transition-all duration-200"
            >
              <span>{isExpanded ? 'Hide Details' : 'Show Details'}</span>
              <span
                className={cn(
                  'transition-transform duration-200',
                  isExpanded && 'rotate-180'
                )}
              >
                ▼
              </span>
            </button>

            {isExpanded && (
              <div className="mt-3 p-4 bg-black/20 rounded-lg border border-white/8 space-y-4 animate-fade-in">
                {/* Models (admin only) */}
                {showSensitive && provider.models && provider.models.length > 0 && (
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-white/50 mb-2">
                      Available Models
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {provider.models.map((model, idx) => (
                        <span
                          key={idx}
                          className="text-[11px] px-2.5 py-1 bg-white/8 border border-white/12 rounded-md text-white/80"
                        >
                          {model}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Regions (admin only) */}
                {showSensitive && provider.regions && provider.regions.length > 0 && (
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-white/50 mb-2">
                      Regions
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {provider.regions.map((region, idx) => (
                        <span
                          key={idx}
                          className="text-[11px] px-2.5 py-1 bg-white/8 border border-white/12 rounded-md text-white/80"
                        >
                          {region}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Services (admin only) */}
                {showSensitive && provider.services && provider.services.length > 0 && (
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-white/50 mb-2">
                      Services Used
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {provider.services.map((service, idx) => (
                        <span
                          key={idx}
                          className="text-[11px] px-2.5 py-1 bg-white/8 border border-white/12 rounded-md text-white/80"
                        >
                          {service}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Notification button */}
        {hasIssues && typeof window !== 'undefined' && (
          <div className="mt-3">
            <NotificationButtonWrapper
              serviceName={provider.displayName}
              currentStatus={status}
              onSubscribe={onNotificationSubscribe}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// Wrapper to handle dynamic import
function NotificationButtonWrapper({ serviceName, currentStatus, onSubscribe }: { serviceName: string; currentStatus: string; onSubscribe?: (message: string) => void }) {
  const [NotificationButton, setNotificationButton] = React.useState<any>(null);

  React.useEffect(() => {
    import('./NotificationButton').then((mod) => {
      setNotificationButton(() => mod.default);
    });
  }, []);

  if (!NotificationButton) return null;

  return <NotificationButton serviceName={serviceName} currentStatus={currentStatus} onSubscribe={onSubscribe} />;
}
