'use client';

import { ProviderStatus } from '@/lib/types';
import { useViewMode } from '@/contexts/ViewModeContext';
import { getProviderDisplayName } from '@/lib/view-utils';
import { getTimeSinceGMT, formatShortGMT } from '@/lib/time-utils';

interface HeroStatusBannerProps {
  providers: ProviderStatus[];
  lastUpdated: string;
}

export default function HeroStatusBanner({ providers, lastUpdated }: HeroStatusBannerProps) {
  const { isAdminView } = useViewMode();
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
        subtext: 'myRA AI services and infrastructure partners are functioning normally',
      };
    }
    if (criticalIssues.length > 0) {
      return {
        bg: 'rgba(239, 68, 68, 0.12)',
        border: 'rgba(239, 68, 68, 0.35)',
        statusBadge: 'DEGRADED',
        statusBadgeBg: '#ef4444',
        message: 'Service Disruption Detected',
        subtext: `Infrastructure partner issues affecting ${issuesCount} ${issuesCount === 1 ? 'service' : 'services'}. Some capabilities may be temporarily unavailable.`,
      };
    }
    return {
      bg: 'rgba(245, 158, 11, 0.12)',
      border: 'rgba(245, 158, 11, 0.35)',
      statusBadge: 'DEGRADED',
      statusBadgeBg: '#f59e0b',
      message: 'Performance Issues Detected',
      subtext: `Infrastructure partner issues affecting ${issuesCount} ${issuesCount === 1 ? 'service' : 'services'}. Core functionality remains available.`,
    };
  };

  const style = getBannerStyle();

  return (
    <div
      style={{
        background: style.bg,
        border: `2px solid ${style.border}`,
        borderRadius: '12px',
        padding: '16px 20px',
        marginBottom: '16px',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 2px 12px rgba(0, 0, 0, 0.1)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '250px' }}>
          {/* Status Badge */}
          <div style={{ marginBottom: '10px' }}>
            <span
              style={{
                display: 'inline-block',
                fontSize: '10px',
                fontWeight: 900,
                padding: '6px 12px',
                borderRadius: '6px',
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
              fontSize: '18px',
              fontWeight: 700,
              color: 'rgba(255, 255, 255, 0.98)',
              marginBottom: '6px',
              lineHeight: '1.3',
              letterSpacing: '-0.01em',
            }}
          >
            {style.message}
          </div>

          {/* Subtext - only show when there are issues */}
          {!allOperational && (
            <div
              style={{
                fontSize: '13px',
                color: 'rgba(255, 255, 255, 0.7)',
                marginBottom: '10px',
                lineHeight: '1.4',
              }}
            >
              {style.subtext}
            </div>
          )}

          {/* Timestamp */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '11px',
              color: 'rgba(255, 255, 255, 0.5)',
            }}
          >
            <span>Last checked: {getTimeSinceGMT(lastUpdated)}</span>
          </div>
        </div>

        {/* Affected Services */}
        {!allOperational && (
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.2)',
              padding: '12px 16px',
              borderRadius: '8px',
              minWidth: '200px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <div
              style={{
                fontSize: '10px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                color: 'rgba(255, 255, 255, 0.5)',
                marginBottom: '8px',
              }}
            >
              Affected Partners
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {criticalIssues.length > 0 &&
                criticalIssues.map((p) => (
                  <div
                    key={p.provider.id}
                    style={{
                      fontSize: '12px',
                      fontWeight: 500,
                      color: 'rgba(255, 255, 255, 0.85)',
                    }}
                  >
                    • {getProviderDisplayName(p.provider, isAdminView)}
                  </div>
                ))}
              {degradedServices.length > 0 &&
                criticalIssues.length === 0 &&
                degradedServices.map((p) => (
                  <div
                    key={p.provider.id}
                    style={{
                      fontSize: '12px',
                      fontWeight: 500,
                      color: 'rgba(255, 255, 255, 0.85)',
                    }}
                  >
                    • {getProviderDisplayName(p.provider, isAdminView)}
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
