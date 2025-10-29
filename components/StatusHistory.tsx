'use client';

import React from 'react';
import { ProviderStatus } from '@/lib/types';

interface StatusHistoryProps {
  providers: ProviderStatus[];
}

export default function StatusHistory({ providers }: StatusHistoryProps) {
  const [hoveredCell, setHoveredCell] = React.useState<string | null>(null);

  // Sanitize incident names to remove provider-specific references
  const sanitizeIncidentName = (name: string) => {
    // Remove common provider names and identifiers
    return name
      .replace(/\b(AWS|Amazon Web Services|OpenAI|Anthropic|Google|Gemini|Exa|Brave)\b/gi, 'Service')
      .replace(/\b(GPT-\d+|Claude|Gemini Flash)\b/gi, 'AI Model')
      .replace(/\b(API Gateway|Lambda|S3|EC2)\b/gi, 'Component')
      .replace(/Service Service/gi, 'Service')
      .trim();
  };

  // Generate last 7 days
  const generateLast7Days = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      days.push(date);
    }
    return days;
  };

  const last7Days = generateLast7Days();
  const primaryProviders = providers.filter((p) => p.provider.priority === 'primary');

  // Calculate uptime percentage and worst status for each day
  const getStatusForDay = (provider: ProviderStatus, day: Date) => {
    if (!provider.incidents || provider.incidents.length === 0) {
      return {
        uptime: 100,
        worstStatus: 'operational',
        incidents: [],
      };
    }

    const dayStart = day.getTime();
    const dayEnd = new Date(day).setHours(23, 59, 59, 999);
    const dayDuration = dayEnd - dayStart;

    let downtime = 0;
    let worstStatus: 'operational' | 'degraded_performance' | 'partial_outage' | 'major_outage' = 'operational';
    const dayIncidents = [];

    const statusSeverity = {
      operational: 0,
      degraded_performance: 1,
      partial_outage: 2,
      major_outage: 3,
    };

    // Check each incident
    for (const incident of provider.incidents) {
      const incidentStart = new Date(incident.created_at).getTime();
      const incidentAge = Date.now() - incidentStart;
      const oneDayMs = 24 * 60 * 60 * 1000;

      // Determine incident end time
      let incidentEnd: number;
      if (incident.resolved_at) {
        // Use actual resolution time
        incidentEnd = new Date(incident.resolved_at).getTime();
      } else if (incident.status === 'resolved' || incident.status === 'postmortem') {
        // Marked as resolved but missing timestamp - skip it
        continue;
      } else {
        // Unresolved incident - use intelligent estimation
        if (incidentAge < oneDayMs) {
          // Recent incident (< 24h old) - assume still ongoing
          incidentEnd = Date.now();
        } else if (provider.status !== 'operational') {
          // Old incident but service is currently down - still ongoing
          incidentEnd = Date.now();
        } else {
          // Old incident (> 24h) and service is operational now
          // Cap it at 24 hours after start (reasonable maximum)
          incidentEnd = incidentStart + oneDayMs;
        }
      }

      // If incident overlaps with this day
      if (incidentStart <= dayEnd && incidentEnd >= dayStart) {
        const overlapStart = Math.max(incidentStart, dayStart);
        const overlapEnd = Math.min(incidentEnd, dayEnd);
        const overlapDuration = overlapEnd - overlapStart;

        // Determine incident severity
        let incidentStatus: 'operational' | 'degraded_performance' | 'partial_outage' | 'major_outage' = 'operational';
        if (incident.impact === 'critical' || incident.impact === 'major') {
          incidentStatus = 'major_outage';
        } else if (incident.impact === 'minor' || incident.status === 'investigating') {
          incidentStatus = 'degraded_performance';
        } else {
          incidentStatus = 'partial_outage';
        }

        // Track worst status
        if (statusSeverity[incidentStatus] > statusSeverity[worstStatus]) {
          worstStatus = incidentStatus;
        }

        // Add to downtime
        downtime += overlapDuration;

        dayIncidents.push({
          name: incident.name,
          start: new Date(overlapStart),
          end: new Date(overlapEnd),
          duration: overlapDuration,
          status: incidentStatus,
        });
      }
    }

    const uptime = Math.max(0, Math.round(((dayDuration - downtime) / dayDuration) * 100));

    return {
      uptime,
      worstStatus,
      incidents: dayIncidents,
    };
  };

  const getStatusColor = (worstStatus: string, uptime: number) => {
    if (uptime === 100) return 'rgba(16, 185, 129, 0.7)';
    if (worstStatus === 'major_outage') return 'rgba(239, 68, 68, 0.8)';
    if (worstStatus === 'partial_outage') return 'rgba(245, 158, 11, 0.7)';
    return 'rgba(245, 158, 11, 0.5)'; // degraded
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };

  return (
    <div style={{ marginBottom: '24px' }}>
      <h2 style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.9)', marginBottom: '16px', letterSpacing: '-0.01em' }}>
        7-Day Status History
      </h2>

      <div
        style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '20px',
          overflowX: 'auto',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th
                style={{
                  textAlign: 'left',
                  padding: '12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'rgba(255, 255, 255, 0.7)',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                Service
              </th>
              {last7Days.map((day, index) => (
                <th
                  key={index}
                  style={{
                    textAlign: 'center',
                    padding: '12px',
                    fontSize: '11px',
                    fontWeight: 500,
                    color: 'rgba(255, 255, 255, 0.6)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <div>{day.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                  <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.4)' }}>
                    {day.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {primaryProviders.map((provider, providerIndex) => (
              <tr key={provider.provider.id}>
                <td
                  style={{
                    padding: '16px 12px',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: 'rgba(255, 255, 255, 0.9)',
                    borderBottom: providerIndex < primaryProviders.length - 1 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
                  }}
                >
                  {provider.provider.displayName}
                </td>
                {last7Days.map((day, dayIndex) => {
                  const dayStatus = getStatusForDay(provider, day);
                  const isToday = dayIndex === 6;
                  const cellId = `${provider.provider.id}-${dayIndex}`;

                  return (
                    <td
                      key={dayIndex}
                      style={{
                        textAlign: 'center',
                        padding: '16px 12px',
                        borderBottom: providerIndex < primaryProviders.length - 1 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
                        position: 'relative',
                      }}
                    >
                      <div
                        style={{
                          margin: '0 auto',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '6px',
                            background: getStatusColor(dayStatus.worstStatus, dayStatus.uptime),
                            border: isToday ? '2px solid rgba(255, 255, 255, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px',
                            fontWeight: 700,
                            color: 'rgba(255, 255, 255, 0.95)',
                            transition: 'all 0.2s ease',
                            cursor: 'pointer',
                            position: 'relative',
                          }}
                          onMouseEnter={() => setHoveredCell(cellId)}
                          onMouseLeave={() => setHoveredCell(null)}
                        >
                          {dayStatus.uptime}%

                          {/* Custom tooltip */}
                          {hoveredCell === cellId && (
                            <div
                              style={{
                                position: 'absolute',
                                bottom: '100%',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                marginBottom: '8px',
                                padding: '10px 12px',
                                background: 'rgba(20, 20, 25, 0.98)',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                borderRadius: '8px',
                                whiteSpace: 'nowrap',
                                fontSize: '12px',
                                fontWeight: 500,
                                color: 'rgba(255, 255, 255, 0.95)',
                                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5)',
                                zIndex: 1000,
                                pointerEvents: 'none',
                              }}
                            >
                              <div style={{ marginBottom: dayStatus.uptime === 100 ? '0' : '6px', fontWeight: 600 }}>
                                {provider.provider.displayName}
                              </div>
                              <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.7)', marginBottom: dayStatus.uptime === 100 ? '0' : '6px' }}>
                                {day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: {dayStatus.uptime}% uptime
                              </div>
                              {dayStatus.incidents.length > 0 && (
                                <div style={{ fontSize: '11px', lineHeight: '1.5' }}>
                                  {dayStatus.incidents.map((incident, idx) => (
                                    <div key={idx} style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                                      • {sanitizeIncidentName(incident.name)} ({formatDuration(incident.duration)})
                                    </div>
                                  ))}
                                </div>
                              )}
                              {/* Tooltip arrow */}
                              <div
                                style={{
                                  position: 'absolute',
                                  top: '100%',
                                  left: '50%',
                                  transform: 'translateX(-50%)',
                                  width: '0',
                                  height: '0',
                                  borderLeft: '6px solid transparent',
                                  borderRight: '6px solid transparent',
                                  borderTop: '6px solid rgba(20, 20, 25, 0.98)',
                                }}
                              />
                            </div>
                          )}
                        </div>
                        {dayStatus.incidents.length > 0 && (
                          <div
                            style={{
                              fontSize: '9px',
                              color: 'rgba(255, 255, 255, 0.4)',
                            }}
                          >
                            {dayStatus.incidents.length} issue{dayStatus.incidents.length > 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', alignItems: 'center', gap: '24px', fontSize: '11px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '14px', height: '14px', borderRadius: '3px', background: 'rgba(16, 185, 129, 0.7)' }} />
            <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>100% Uptime</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '14px', height: '14px', borderRadius: '3px', background: 'rgba(245, 158, 11, 0.7)' }} />
            <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Degraded/Partial</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '14px', height: '14px', borderRadius: '3px', background: 'rgba(239, 68, 68, 0.8)' }} />
            <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Major Issues</span>
          </div>
          <div style={{ marginLeft: 'auto', color: 'rgba(255, 255, 255, 0.5)' }}>
            Hover for incident details • Today highlighted with border
          </div>
        </div>
      </div>
    </div>
  );
}
