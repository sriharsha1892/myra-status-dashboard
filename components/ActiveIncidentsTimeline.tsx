'use client';

import React from 'react';
import { ProviderStatus } from '@/lib/types';
import { useViewMode } from '@/contexts/ViewModeContext';
import { getProviderDisplayName } from '@/lib/view-utils';
import { getIncidentLifecycle, formatShortGMT, getTimeSinceGMT } from '@/lib/time-utils';

interface ActiveIncidentsTimelineProps {
  providers: ProviderStatus[];
}

type IncidentLifecycleState = 'identified' | 'acknowledged' | 'resolved';

interface EnrichedIncident {
  id: string;
  providerName: string;
  providerUserName: string;
  providerId: string;
  name: string;
  status: string;
  impact: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  lifecycleState: IncidentLifecycleState;
  severity: 'critical' | 'high' | 'medium' | 'low';
  duration: number;
  reasoning: string;
}

export default function ActiveIncidentsTimeline({ providers }: ActiveIncidentsTimelineProps) {
  const { isAdminView } = useViewMode();

  // Cognitive severity assessment
  const assessSeverity = (
    impact: string,
    status: string,
    duration: number,
    providerPriority?: string
  ): 'critical' | 'high' | 'medium' | 'low' => {
    // Critical: Major outage lasting > 30 min OR critical impact on primary provider
    if (impact === 'critical' || impact === 'major') {
      if (duration > 30 * 60 * 1000) return 'critical';
      if (providerPriority === 'primary') return 'critical';
      return 'high';
    }

    // High: Partial outage or degraded performance on primary provider
    if (impact === 'minor' && providerPriority === 'primary') {
      return duration > 60 * 60 * 1000 ? 'high' : 'medium';
    }

    // Medium: Degraded performance or short outages
    if (status === 'investigating' || impact === 'minor') {
      return 'medium';
    }

    // Low: All other cases
    return 'low';
  };

  // Generate reasoning for severity assessment
  const generateReasoning = (
    severity: string,
    impact: string,
    duration: number,
    providerPriority?: string
  ): string => {
    const durationMins = Math.floor(duration / 60000);

    if (severity === 'critical') {
      if (duration > 30 * 60 * 1000) {
        return `Critical severity due to ${impact} impact lasting ${durationMins} minutes on ${providerPriority === 'primary' ? 'primary' : 'secondary'} service.`;
      }
      return `Critical severity due to ${impact} impact on primary service infrastructure.`;
    }

    if (severity === 'high') {
      return `High severity: ${impact} impact on ${providerPriority === 'primary' ? 'primary' : 'secondary'} provider affecting core capabilities.`;
    }

    if (severity === 'medium') {
      return `Medium severity: ${impact} impact with ${durationMins} minute duration. Service partially affected.`;
    }

    return `Low severity: Minor ${impact} impact with limited user effect.`;
  };

  // Determine lifecycle state
  const determineLifecycleState = (status: string, resolved_at?: string): IncidentLifecycleState => {
    if (resolved_at || status === 'resolved' || status === 'postmortem') {
      return 'resolved';
    }

    if (status === 'monitoring' || status === 'identified' || status === 'update') {
      return 'acknowledged';
    }

    // investigating, identified, etc.
    return 'identified';
  };

  // Get all active incidents with enriched data
  const activeIncidents: EnrichedIncident[] = providers
    .flatMap((providerStatus) => {
      if (!providerStatus.incidents || providerStatus.incidents.length === 0) return [];

      return providerStatus.incidents
        .filter((incident) => incident.status !== 'resolved' && incident.status !== 'postmortem')
        .map((incident) => {
          const duration = Date.now() - new Date(incident.created_at).getTime();
          const lifecycleState = determineLifecycleState(incident.status, incident.resolved_at);
          const severity = assessSeverity(
            incident.impact,
            incident.status,
            duration,
            providerStatus.provider.priority
          );
          const reasoning = generateReasoning(
            severity,
            incident.impact,
            duration,
            providerStatus.provider.priority
          );

          return {
            id: incident.id,
            providerName: providerStatus.provider.displayName,
            providerUserName: providerStatus.provider.userFacingName,
            providerId: providerStatus.provider.id,
            name: incident.name,
            status: incident.status,
            impact: incident.impact,
            created_at: incident.created_at,
            updated_at: incident.updated_at,
            resolved_at: incident.resolved_at,
            lifecycleState,
            severity,
            duration,
            reasoning,
          };
        });
    })
    .sort((a, b) => {
      // Sort by severity, then by duration
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[a.severity] - severityOrder[b.severity];
      }
      return b.duration - a.duration;
    });

  if (activeIncidents.length === 0) {
    return null;
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return '#dc2626';
      case 'high':
        return '#ef4444';
      case 'medium':
        return '#f59e0b';
      case 'low':
        return '#10b981';
      default:
        return '#6b7280';
    }
  };

  const getLifecycleColor = (state: IncidentLifecycleState) => {
    switch (state) {
      case 'identified':
        return '#ef4444';
      case 'acknowledged':
        return '#f59e0b';
      case 'resolved':
        return '#10b981';
      default:
        return '#6b7280';
    }
  };

  const getLifecycleLabel = (state: IncidentLifecycleState) => {
    switch (state) {
      case 'identified':
        return 'Problem Identified';
      case 'acknowledged':
        return 'Acknowledged';
      case 'resolved':
        return 'Resolved';
      default:
        return 'Unknown';
    }
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ${minutes % 60}m`;
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  };

  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'rgba(255,255,255,0.95)', marginBottom: '8px', letterSpacing: '-0.01em' }}>
          Infrastructure Partner Incidents ({activeIncidents.length})
        </h2>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>
          Real-time tracking of infrastructure partner incidents affecting myRA AI
        </p>
      </div>

      <div style={{ display: 'grid', gap: '16px' }}>
        {activeIncidents.map((incident) => (
          <div
            key={incident.id}
            style={{
              background: `linear-gradient(135deg, ${getSeverityColor(incident.severity)}15 0%, rgba(255,255,255,0.03) 100%)`,
              backdropFilter: 'blur(10px)',
              border: `1px solid ${getSeverityColor(incident.severity)}40`,
              borderRadius: '12px',
              padding: '20px',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Severity indicator bar */}
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: '4px',
                background: getSeverityColor(incident.severity),
                boxShadow: `0 0 12px ${getSeverityColor(incident.severity)}`,
              }}
            />

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '4px 10px',
                      borderRadius: '6px',
                      background: `${getSeverityColor(incident.severity)}25`,
                      color: getSeverityColor(incident.severity),
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    {incident.severity}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: 'rgba(255,255,255,0.5)',
                    }}
                  >
                    {getProviderDisplayName({ displayName: incident.providerName, userFacingName: incident.providerUserName } as any, isAdminView)}
                  </span>
                </div>
                <h3
                  style={{
                    fontSize: '16px',
                    fontWeight: 600,
                    color: 'rgba(255,255,255,0.95)',
                    marginBottom: '8px',
                    lineHeight: '1.4',
                  }}
                >
                  {incident.name}
                </h3>
              </div>

              {/* Duration badge */}
              <div
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.8)',
                  whiteSpace: 'nowrap',
                }}
              >
                {formatDuration(incident.duration)}
              </div>
            </div>

            {/* Lifecycle Progress */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                {(['identified', 'acknowledged', 'resolved'] as IncidentLifecycleState[]).map((state, index) => {
                  const isActive = state === incident.lifecycleState;
                  const isPast =
                    (state === 'identified' && incident.lifecycleState !== 'identified') ||
                    (state === 'acknowledged' && incident.lifecycleState === 'resolved');

                  return (
                    <React.Fragment key={state}>
                      {index > 0 && (
                        <div
                          style={{
                            flex: 1,
                            height: '2px',
                            background: isPast ? getLifecycleColor(state) : 'rgba(255,255,255,0.15)',
                            transition: 'all 0.3s ease',
                          }}
                        />
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                        <div
                          style={{
                            width: isActive ? '14px' : '10px',
                            height: isActive ? '14px' : '10px',
                            borderRadius: '50%',
                            background: isActive || isPast ? getLifecycleColor(state) : 'rgba(255,255,255,0.2)',
                            border: isActive ? `3px solid ${getLifecycleColor(state)}40` : 'none',
                            boxShadow: isActive ? `0 0 12px ${getLifecycleColor(state)}` : 'none',
                            transition: 'all 0.3s ease',
                          }}
                        />
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: isActive ? 600 : 500,
                            color: isActive ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.5)',
                            textAlign: 'center',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {getLifecycleLabel(state)}
                        </span>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* Reasoning (Admin only) */}
            {isAdminView && (
              <div
                style={{
                  padding: '12px 14px',
                  background: 'rgba(59, 130, 246, 0.12)',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                  borderRadius: '8px',
                  marginBottom: '12px',
                }}
              >
                <div
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    color: '#60a5fa',
                    marginBottom: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>🧠</span>
                  <span>Severity Reasoning</span>
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    color: 'rgba(255,255,255,0.85)',
                    lineHeight: '1.5',
                  }}
                >
                  {incident.reasoning}
                </div>
              </div>
            )}

            {/* Metadata */}
            <div
              style={{
                display: 'flex',
                gap: '16px',
                fontSize: '12px',
                color: 'rgba(255,255,255,0.5)',
                flexWrap: 'wrap',
              }}
            >
              <div>
                <span style={{ fontWeight: 600 }}>Started:</span> {formatShortGMT(incident.created_at)}
              </div>
              {incident.updated_at !== incident.created_at && (
                <div>
                  <span style={{ fontWeight: 600 }}>Updated:</span> {formatShortGMT(incident.updated_at)}
                </div>
              )}
              <div>
                <span style={{ fontWeight: 600 }}>Duration:</span> {getTimeSinceGMT(incident.created_at)}
              </div>
              <div>
                <span style={{ fontWeight: 600 }}>Impact:</span> {incident.impact}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
