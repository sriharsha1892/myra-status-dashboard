'use client';

import React from 'react';
import { ProviderStatus } from '@/lib/types';
import UptimeSparkline from './UptimeSparkline';
import { useViewMode } from '@/contexts/ViewModeContext';
import { getProviderDisplayName, shouldShowSensitiveInfo } from '@/lib/view-utils';

interface ServiceStatusCardProps {
  providerStatus: ProviderStatus;
  onNotificationSubscribe?: (message: string) => void;
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'operational':
      return {
        text: 'Operational',
        bg: '#10b981',
        color: '#ffffff',
      };
    case 'degraded_performance':
      return {
        text: 'Degraded',
        bg: '#f59e0b',
        color: '#ffffff',
      };
    case 'partial_outage':
      return {
        text: 'Partial Outage',
        bg: '#f97316',
        color: '#ffffff',
      };
    case 'major_outage':
      return {
        text: 'Major Outage',
        bg: '#ef4444',
        color: '#ffffff',
      };
    case 'under_maintenance':
      return {
        text: 'Maintenance',
        bg: '#3b82f6',
        color: '#ffffff',
      };
    default:
      return {
        text: 'Unknown',
        bg: '#6b7280',
        color: '#ffffff',
      };
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'operational':
      return '#10b981';
    case 'degraded_performance':
      return '#f59e0b';
    case 'partial_outage':
      return '#f59e0b';
    case 'major_outage':
      return '#ef4444';
    case 'under_maintenance':
      return '#3b82f6';
    default:
      return '#6b7280';
  }
};

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

export default function ServiceStatusCard({ providerStatus, onNotificationSubscribe }: ServiceStatusCardProps) {
  const { provider, status, incidents, components } = providerStatus;
  const [isExpanded, setIsExpanded] = React.useState(false);
  const { isAdminView } = useViewMode();

  const isOperational = status === 'operational';
  const hasIssues = !isOperational;
  const displayName = getProviderDisplayName(provider, isAdminView);
  const showSensitive = shouldShowSensitiveInfo(isAdminView);

  // Get most recent active incident
  const activeIncident = incidents?.find(
    (i) => i.status !== 'resolved' && i.status !== 'postmortem'
  );

  // Determine if there's additional info to show
  const hasAdditionalInfo = (showSensitive && (provider.models || provider.regions || provider.services)) || provider.impacts || provider.role;

  return (
    <div
      style={{
        background: hasIssues
          ? 'rgba(239, 68, 68, 0.08)'
          : 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(10px) saturate(150%)',
        border: `1px solid ${
          hasIssues ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255, 255, 255, 0.1)'
        }`,
        borderRadius: '12px',
        padding: hasIssues ? '18px 22px' : '16px 22px',
        marginBottom: '12px',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = hasIssues
          ? 'rgba(239, 68, 68, 0.12)'
          : 'rgba(255, 255, 255, 0.05)';
        e.currentTarget.style.borderColor = hasIssues
          ? 'rgba(239, 68, 68, 0.4)'
          : 'rgba(255, 255, 255, 0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = hasIssues
          ? 'rgba(239, 68, 68, 0.08)'
          : 'rgba(255, 255, 255, 0.03)';
        e.currentTarget.style.borderColor = hasIssues
          ? 'rgba(239, 68, 68, 0.3)'
          : 'rgba(255, 255, 255, 0.1)';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0' }}>
        <div style={{ flex: 1 }}>
          {/* Header Row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  fontSize: '17px',
                  fontWeight: 600,
                  color: 'rgba(255, 255, 255, 0.95)',
                }}
              >
                {displayName}
              </div>
              {provider.role && (
                <span
                  style={{
                    fontSize: '9px',
                    fontWeight: 700,
                    padding: '4px 8px',
                    borderRadius: '4px',
                    background: provider.role === 'fallback' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                    color: provider.role === 'fallback' ? '#60a5fa' : 'rgba(255, 255, 255, 0.6)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  {provider.role}
                </span>
              )}
            </div>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '6px 12px',
                borderRadius: '6px',
                background: getStatusBadge(status).bg,
                color: getStatusBadge(status).color,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                whiteSpace: 'nowrap',
              }}
            >
              {getStatusBadge(status).text}
            </span>
          </div>

          {/* Description / Enables */}
          <div
            style={{
              fontSize: '13px',
              color: isOperational ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.8)',
              marginBottom: hasIssues ? '10px' : '8px',
              lineHeight: '1.5',
            }}
          >
            {hasIssues ? getUserFriendlyMessage(status, provider.enables) : provider.enables}
          </div>

          {/* Impact Statement when there are issues */}
          {hasIssues && provider.impacts && (
            <div
              style={{
                padding: '10px 14px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: '8px',
                marginBottom: '10px',
              }}
            >
              <div
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: 'rgba(239, 68, 68, 0.9)',
                  marginBottom: '4px',
                }}
              >
                Impact
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: 'rgba(255, 255, 255, 0.85)',
                  lineHeight: '1.4',
                }}
              >
                {provider.impacts}
              </div>
            </div>
          )}

          {/* Incident Timing */}
          {hasIssues && activeIncident && (
            <div
              style={{
                fontSize: '11px',
                color: 'rgba(255, 255, 255, 0.5)',
                marginBottom: '10px',
              }}
            >
              Issue started {getTimeSince(activeIncident.created_at)}
              {activeIncident.updated_at !== activeIncident.created_at &&
                ` • Updated ${getTimeSince(activeIncident.updated_at)}`
              }
            </div>
          )}

          {/* Expandable Details Section */}
          {hasAdditionalInfo && (
            <>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 10px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '6px',
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginTop: '8px',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                }}
              >
                <span>{isExpanded ? 'Hide Details' : 'Show Details'}</span>
                <span style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}>▼</span>
              </button>

              {isExpanded && (
                <div
                  style={{
                    marginTop: '12px',
                    padding: '14px 16px',
                    background: 'rgba(0, 0, 0, 0.2)',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  {/* Models (admin only) */}
                  {showSensitive && provider.models && provider.models.length > 0 && (
                    <div style={{ marginBottom: '12px' }}>
                      <div
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          color: 'rgba(255, 255, 255, 0.5)',
                          marginBottom: '6px',
                        }}
                      >
                        Available Models
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {provider.models.map((model, idx) => (
                          <span
                            key={idx}
                            style={{
                              fontSize: '11px',
                              padding: '4px 10px',
                              background: 'rgba(255, 255, 255, 0.08)',
                              border: '1px solid rgba(255, 255, 255, 0.12)',
                              borderRadius: '6px',
                              color: 'rgba(255, 255, 255, 0.8)',
                            }}
                          >
                            {model}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Regions (admin only) */}
                  {showSensitive && provider.regions && provider.regions.length > 0 && (
                    <div style={{ marginBottom: '12px' }}>
                      <div
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          color: 'rgba(255, 255, 255, 0.5)',
                          marginBottom: '6px',
                        }}
                      >
                        Regions
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {provider.regions.map((region, idx) => (
                          <span
                            key={idx}
                            style={{
                              fontSize: '11px',
                              padding: '4px 10px',
                              background: 'rgba(255, 255, 255, 0.08)',
                              border: '1px solid rgba(255, 255, 255, 0.12)',
                              borderRadius: '6px',
                              color: 'rgba(255, 255, 255, 0.8)',
                            }}
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
                      <div
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          color: 'rgba(255, 255, 255, 0.5)',
                          marginBottom: '6px',
                        }}
                      >
                        Services Used
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {provider.services.map((service, idx) => (
                          <span
                            key={idx}
                            style={{
                              fontSize: '11px',
                              padding: '4px 10px',
                              background: 'rgba(255, 255, 255, 0.08)',
                              border: '1px solid rgba(255, 255, 255, 0.12)',
                              borderRadius: '6px',
                              color: 'rgba(255, 255, 255, 0.8)',
                            }}
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
            <div style={{ marginTop: '10px' }}>
              <NotificationButtonWrapper
                serviceName={provider.displayName}
                currentStatus={status}
                onSubscribe={onNotificationSubscribe}
              />
            </div>
          )}
        </div>
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
