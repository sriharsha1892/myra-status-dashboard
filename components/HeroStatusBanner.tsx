'use client';

import { ProviderStatus } from '@/lib/types';

interface HeroStatusBannerProps {
  providers: ProviderStatus[];
  lastUpdated: string;
}

const getTimeSince = (dateString: string) => {
  const now = new Date();
  const then = new Date(dateString);
  const diffMs = now.getTime() - then.getTime();
  const diffSecs = Math.floor(diffMs / 1000);

  if (diffSecs < 60) return `${diffSecs} seconds ago`;
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
};

const formatTimestamp = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
};

export default function HeroStatusBanner({ providers, lastUpdated }: HeroStatusBannerProps) {
  const primaryProviders = providers.filter((p) => p.provider.priority === 'primary');
  const issuesCount = primaryProviders.filter((p) => p.status !== 'operational').length;
  const allOperational = issuesCount === 0;

  const criticalIssues = primaryProviders.filter(
    (p) => p.status === 'major_outage' || p.status === 'partial_outage'
  );
  const degradedServices = primaryProviders.filter((p) => p.status === 'degraded_performance');

  // Determine banner color and message
  const getBannerStyle = () => {
    if (allOperational) {
      return {
        bg: 'rgba(16, 185, 129, 0.12)',
        border: 'rgba(16, 185, 129, 0.35)',
        statusBadge: 'OPERATIONAL',
        statusBadgeBg: '#10b981',
        message: 'All Systems Operational',
        subtext: 'All AI services and infrastructure are functioning normally',
      };
    }
    if (criticalIssues.length > 0) {
      return {
        bg: 'rgba(239, 68, 68, 0.12)',
        border: 'rgba(239, 68, 68, 0.35)',
        statusBadge: 'DEGRADED',
        statusBadgeBg: '#ef4444',
        message: 'Service Disruption',
        subtext: `${issuesCount} ${issuesCount === 1 ? 'service is' : 'services are'} experiencing issues. Some capabilities may be temporarily unavailable.`,
      };
    }
    return {
      bg: 'rgba(245, 158, 11, 0.12)',
      border: 'rgba(245, 158, 11, 0.35)',
      statusBadge: 'DEGRADED',
      statusBadgeBg: '#f59e0b',
      message: 'Performance Issues',
      subtext: `${issuesCount} ${issuesCount === 1 ? 'service is' : 'services are'} experiencing slowdowns. Core functionality remains available.`,
    };
  };

  const style = getBannerStyle();

  return (
    <div
      style={{
        background: style.bg,
        border: `2px solid ${style.border}`,
        borderRadius: '16px',
        padding: '32px 36px',
        marginBottom: '32px',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.15)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '24px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '300px' }}>
          {/* Status Badge */}
          <div style={{ marginBottom: '16px' }}>
            <span
              style={{
                display: 'inline-block',
                fontSize: '11px',
                fontWeight: 900,
                padding: '8px 16px',
                borderRadius: '8px',
                background: style.statusBadgeBg,
                color: '#ffffff',
                letterSpacing: '1px',
                textTransform: 'uppercase',
                boxShadow: `0 2px 8px ${style.statusBadgeBg}40`,
              }}
            >
              {style.statusBadge}
            </span>
          </div>

          {/* Main Message */}
          <div
            style={{
              fontSize: '28px',
              fontWeight: 700,
              color: 'rgba(255, 255, 255, 0.98)',
              marginBottom: '12px',
              lineHeight: '1.2',
              letterSpacing: '-0.02em',
            }}
          >
            {style.message}
          </div>

          {/* Subtext */}
          <div
            style={{
              fontSize: '15px',
              color: 'rgba(255, 255, 255, 0.7)',
              marginBottom: '16px',
              lineHeight: '1.5',
            }}
          >
            {style.subtext}
          </div>

          {/* Timestamp */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontSize: '13px',
              color: 'rgba(255, 255, 255, 0.5)',
            }}
          >
            <span>Last updated: {formatTimestamp(lastUpdated)}</span>
            <span>•</span>
            <span>{getTimeSince(lastUpdated)}</span>
          </div>
        </div>

        {/* Affected Services */}
        {!allOperational && (
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.2)',
              padding: '16px 20px',
              borderRadius: '12px',
              minWidth: '240px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <div
              style={{
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                color: 'rgba(255, 255, 255, 0.5)',
                marginBottom: '12px',
              }}
            >
              Affected Services
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {criticalIssues.length > 0 &&
                criticalIssues.map((p) => (
                  <div
                    key={p.provider.id}
                    style={{
                      fontSize: '13px',
                      fontWeight: 500,
                      color: 'rgba(255, 255, 255, 0.85)',
                    }}
                  >
                    • {p.provider.displayName}
                  </div>
                ))}
              {degradedServices.length > 0 &&
                criticalIssues.length === 0 &&
                degradedServices.map((p) => (
                  <div
                    key={p.provider.id}
                    style={{
                      fontSize: '13px',
                      fontWeight: 500,
                      color: 'rgba(255, 255, 255, 0.85)',
                    }}
                  >
                    • {p.provider.displayName}
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
