'use client';

import { ProviderStatus } from '@/lib/types';

interface ImpactSummaryProps {
  providers: ProviderStatus[];
}

const getImpactBadge = (hasIssues: boolean) => {
  return hasIssues
    ? { bg: '#ef4444', color: '#ffffff', text: 'ISSUE' }
    : { bg: '#10b981', color: '#ffffff', text: 'OK' };
};

const getImpactMessage = (provider: ProviderStatus) => {
  const { status } = provider;

  switch (status) {
    case 'operational':
      return 'Working normally';
    case 'degraded_performance':
      return 'Experiencing slowdowns';
    case 'partial_outage':
      return 'Partially unavailable';
    case 'major_outage':
      return 'Currently unavailable';
    case 'under_maintenance':
      return 'Under maintenance';
    default:
      return 'Status unknown';
  }
};

export default function ImpactSummary({ providers }: ImpactSummaryProps) {
  const primaryProviders = providers.filter((p) => p.provider.priority === 'primary');
  const secondaryProviders = providers.filter((p) => p.provider.priority === 'secondary');

  const hasAnyIssues = providers.some((p) => p.status !== 'operational');
  const hasCriticalIssues = primaryProviders.some(
    (p) => p.status === 'major_outage' || p.status === 'partial_outage'
  );

  return (
    <div
      style={{
        background: hasAnyIssues
          ? 'rgba(239, 68, 68, 0.08)'
          : 'rgba(16, 185, 129, 0.08)',
        backdropFilter: 'blur(10px) saturate(150%)',
        border: `1px solid ${
          hasAnyIssues ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'
        }`,
        borderRadius: '12px',
        padding: '20px',
        marginTop: '24px',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '16px' }}>
        <h3
          style={{
            fontSize: '18px',
            fontWeight: 600,
            color: 'rgba(255, 255, 255, 0.95)',
            marginBottom: '8px',
          }}
        >
          {hasCriticalIssues
            ? 'Service Impact Summary'
            : hasAnyIssues
            ? 'Minor Issues Detected'
            : 'All Systems Operational'}
        </h3>
        <p
          style={{
            fontSize: '14px',
            color: 'rgba(255, 255, 255, 0.6)',
            lineHeight: '1.5',
          }}
        >
          {hasCriticalIssues
            ? 'Some capabilities may be temporarily unavailable or degraded.'
            : hasAnyIssues
            ? 'Minor issues detected with some services, but core functionality is available.'
            : 'All AI capabilities and services are functioning normally.'}
        </p>
      </div>

      {/* Primary Services Impact */}
      <div style={{ marginBottom: secondaryProviders.length > 0 ? '20px' : '0' }}>
        <h4
          style={{
            fontSize: '14px',
            fontWeight: 600,
            color: 'rgba(255, 255, 255, 0.7)',
            marginBottom: '12px',
          }}
        >
          Core Capabilities
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {primaryProviders.map((provider) => {
            const hasIssues = provider.status !== 'operational';
            const badge = getImpactBadge(hasIssues);
            return (
              <div
                key={provider.provider.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 14px',
                  background: 'rgba(0, 0, 0, 0.2)',
                  borderRadius: '8px',
                  border: hasIssues
                    ? '1px solid rgba(239, 68, 68, 0.3)'
                    : '1px solid rgba(16, 185, 129, 0.2)',
                }}
              >
                <span
                  style={{
                    fontSize: '9px',
                    fontWeight: 800,
                    padding: '4px 8px',
                    borderRadius: '4px',
                    background: badge.bg,
                    color: badge.color,
                    letterSpacing: '0.5px',
                  }}
                >
                  {badge.text}
                </span>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: '14px',
                      fontWeight: 500,
                      color: 'rgba(255, 255, 255, 0.9)',
                      marginBottom: '2px',
                    }}
                  >
                    {provider.provider.enables}
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: hasIssues
                        ? 'rgba(239, 68, 68, 0.8)'
                        : 'rgba(16, 185, 129, 0.8)',
                    }}
                  >
                    {getImpactMessage(provider)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Secondary Services Impact - only show if there are issues or if expanded */}
      {secondaryProviders.length > 0 && secondaryProviders.some((p) => p.status !== 'operational') && (
        <div>
          <h4
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: 'rgba(255, 255, 255, 0.7)',
              marginBottom: '12px',
            }}
          >
            Supplemental Services
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {secondaryProviders
              .filter((p) => p.status !== 'operational')
              .map((provider) => {
                const hasIssues = provider.status !== 'operational';
                const badge = getImpactBadge(hasIssues);
                return (
                  <div
                    key={provider.provider.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 14px',
                      background: 'rgba(0, 0, 0, 0.2)',
                      borderRadius: '8px',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '9px',
                        fontWeight: 800,
                        padding: '4px 8px',
                        borderRadius: '4px',
                        background: badge.bg,
                        color: badge.color,
                        letterSpacing: '0.5px',
                      }}
                    >
                      {badge.text}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: '14px',
                          fontWeight: 500,
                          color: 'rgba(255, 255, 255, 0.9)',
                          marginBottom: '2px',
                        }}
                      >
                        {provider.provider.enables}
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: 'rgba(239, 68, 68, 0.8)',
                        }}
                      >
                        {getImpactMessage(provider)}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Overall Status Message */}
      {!hasAnyIssues && (
        <div
          style={{
            marginTop: '16px',
            padding: '12px 16px',
            background: 'rgba(16, 185, 129, 0.1)',
            borderRadius: '8px',
            border: '1px solid rgba(16, 185, 129, 0.2)',
          }}
        >
          <p
            style={{
              fontSize: '13px',
              color: 'rgba(16, 185, 129, 0.9)',
              margin: 0,
              textAlign: 'center',
            }}
          >
            All capabilities are functioning as expected. You should experience normal performance across all features.
          </p>
        </div>
      )}
    </div>
  );
}
