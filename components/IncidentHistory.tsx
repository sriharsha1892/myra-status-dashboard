'use client';

import React, { useState } from 'react';
import { ProviderStatus } from '@/lib/types';
import { getTimeSinceGMT, getDurationGMT } from '@/lib/time-utils';

interface IncidentHistoryProps {
  providers: ProviderStatus[];
}

export default function IncidentHistory({ providers }: IncidentHistoryProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Sanitize incident names to remove provider-specific references
  const sanitizeIncidentName = (name: string) => {
    return name
      .replace(/\b(AWS|Amazon Web Services|OpenAI|Anthropic|Google|Gemini|Exa|Brave)\b/gi, 'Service')
      .replace(/\b(GPT-\d+|Claude|Gemini Flash)\b/gi, 'AI Model')
      .replace(/\b(API Gateway|Lambda|S3|EC2)\b/gi, 'Component')
      .replace(/Service Service/gi, 'Service')
      .trim();
  };

  // Collect and sort all incidents from all providers
  const allIncidents = providers
    .flatMap((p) =>
      p.incidents
        .filter((i) => i.status === 'resolved' || i.status === 'postmortem')
        .map((i) => ({
          ...i,
          provider: p.provider,
        }))
    )
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  if (allIncidents.length === 0) {
    return null;
  }

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'critical':
      case 'major':
        return '#ef4444';
      case 'minor':
        return '#f59e0b';
      default:
        return '#6b7280';
    }
  };

  return (
    <div style={{ marginBottom: '24px' }}>
      <details
        open={isExpanded}
        onToggle={(e: any) => setIsExpanded(e.target.open)}
        style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          overflow: 'hidden',
        }}
      >
        <summary
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: 'rgba(255,255,255,0.7)',
            cursor: 'pointer',
            listStyle: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 16px',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <span
            style={{
              transition: 'transform 0.2s',
              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
            }}
          >
            ▸
          </span>
          Recent Incident History
          <span
            style={{
              fontSize: '11px',
              fontWeight: 400,
              color: 'rgba(255,255,255,0.4)',
              marginLeft: 'auto',
            }}
          >
            Last {allIncidents.length} resolved
          </span>
        </summary>

        <div style={{ padding: '0 16px 16px 16px' }}>
          <div style={{ position: 'relative', paddingLeft: '24px' }}>
            {/* Timeline line */}
            <div
              style={{
                position: 'absolute',
                left: '8px',
                top: '8px',
                bottom: '8px',
                width: '2px',
                background: 'rgba(255, 255, 255, 0.1)',
              }}
            />

            {allIncidents.map((incident, index) => (
              <div
                key={incident.id}
                style={{
                  position: 'relative',
                  paddingBottom: index === allIncidents.length - 1 ? '0' : '16px',
                }}
              >
                {/* Timeline dot */}
                <div
                  style={{
                    position: 'absolute',
                    left: '-19px',
                    top: '6px',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: getImpactColor(incident.impact),
                    border: '2px solid rgba(30, 31, 38, 1)',
                  }}
                />

                {/* Incident card */}
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '8px',
                    padding: '12px',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: '12px',
                      marginBottom: '6px',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: 600,
                          color: 'rgba(255, 255, 255, 0.9)',
                          marginBottom: '4px',
                        }}
                      >
                        {sanitizeIncidentName(incident.name)}
                      </div>
                      <div
                        style={{
                          fontSize: '11px',
                          color: 'rgba(255, 255, 255, 0.6)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          flexWrap: 'wrap',
                        }}
                      >
                        <span>{getTimeSinceGMT(incident.created_at)}</span>
                        {incident.resolved_at && (
                          <>
                            <span style={{ color: 'rgba(255, 255, 255, 0.3)' }}>•</span>
                            <span>
                              Duration: {getDurationGMT(incident.created_at, incident.resolved_at)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div
                      style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: `${getImpactColor(incident.impact)}20`,
                        border: `1px solid ${getImpactColor(incident.impact)}40`,
                        fontSize: '10px',
                        fontWeight: 700,
                        color: getImpactColor(incident.impact),
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}
                    >
                      {incident.impact}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </details>
    </div>
  );
}
