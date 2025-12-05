'use client';

import React from 'react';
import { ProviderStatus } from '@/lib/types';
import { useViewMode } from '@/contexts/ViewModeContext';
import { getProviderDisplayName } from '@/lib/view-utils';
import { formatShortGMT, getTimeSinceGMT } from '@/lib/time-utils';
import { cn } from '@/lib/utils';

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

// Severity styling configuration
const SEVERITY_CONFIG = {
  critical: {
    bgGradient: 'from-red-600/15 to-white/[0.03]',
    borderClass: 'border-red-500/40',
    stripClass: 'bg-red-600',
    stripGlow: 'shadow-[0_0_12px_rgba(220,38,38,0.5)]',
    badgeClass: 'bg-red-500/25 text-red-400',
    label: 'Critical',
  },
  high: {
    bgGradient: 'from-orange-500/15 to-white/[0.03]',
    borderClass: 'border-orange-500/40',
    stripClass: 'bg-orange-500',
    stripGlow: 'shadow-[0_0_12px_rgba(249,115,22,0.5)]',
    badgeClass: 'bg-orange-500/25 text-orange-400',
    label: 'High',
  },
  medium: {
    bgGradient: 'from-amber-500/15 to-white/[0.03]',
    borderClass: 'border-amber-500/40',
    stripClass: 'bg-amber-500',
    stripGlow: 'shadow-[0_0_12px_rgba(245,158,11,0.5)]',
    badgeClass: 'bg-amber-500/25 text-amber-400',
    label: 'Medium',
  },
  low: {
    bgGradient: 'from-emerald-500/15 to-white/[0.03]',
    borderClass: 'border-emerald-500/40',
    stripClass: 'bg-emerald-500',
    stripGlow: 'shadow-[0_0_12px_rgba(16,185,129,0.5)]',
    badgeClass: 'bg-emerald-500/25 text-emerald-400',
    label: 'Low',
  },
} as const;

// Lifecycle styling configuration
const LIFECYCLE_CONFIG = {
  identified: {
    dotClass: 'bg-red-500',
    activeGlow: 'shadow-[0_0_12px_rgba(239,68,68,0.6)]',
    lineClass: 'bg-red-500',
    label: 'Identified',
  },
  acknowledged: {
    dotClass: 'bg-amber-500',
    activeGlow: 'shadow-[0_0_12px_rgba(245,158,11,0.6)]',
    lineClass: 'bg-amber-500',
    label: 'Investigating',
  },
  resolved: {
    dotClass: 'bg-emerald-500',
    activeGlow: 'shadow-[0_0_12px_rgba(16,185,129,0.6)]',
    lineClass: 'bg-emerald-500',
    label: 'Resolved',
  },
} as const;

// Lifecycle progress indicator
function LifecycleProgress({ currentState }: { currentState: IncidentLifecycleState }) {
  const states: IncidentLifecycleState[] = ['identified', 'acknowledged', 'resolved'];

  return (
    <div className="flex items-center gap-1 w-full">
      {states.map((state, index) => {
        const config = LIFECYCLE_CONFIG[state];
        const isActive = state === currentState;
        const isPast =
          (state === 'identified' && currentState !== 'identified') ||
          (state === 'acknowledged' && currentState === 'resolved');

        return (
          <React.Fragment key={state}>
            {index > 0 && (
              <div
                className={cn(
                  'flex-1 h-0.5 rounded-full transition-all duration-300',
                  isPast ? config.lineClass : 'bg-white/15'
                )}
              />
            )}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  'rounded-full transition-all duration-300',
                  isActive || isPast ? config.dotClass : 'bg-white/20',
                  isActive ? 'w-3.5 h-3.5 ring-4 ring-white/10' : 'w-2.5 h-2.5',
                  isActive && config.activeGlow
                )}
              />
              <span
                className={cn(
                  'text-[10px] whitespace-nowrap transition-all duration-200',
                  isActive ? 'font-semibold text-white/90' : 'font-medium text-white/50'
                )}
              >
                {config.label}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

// Duration badge component
function DurationBadge({ duration }: { duration: number }) {
  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ${minutes % 60}m`;
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  };

  return (
    <div className="px-3 py-1.5 rounded-lg bg-white/8 border border-white/15 text-sm font-semibold text-white/80 whitespace-nowrap">
      {formatDuration(duration)}
    </div>
  );
}

// Individual incident card
function IncidentCard({
  incident,
  isAdminView,
}: {
  incident: EnrichedIncident;
  isAdminView: boolean;
}) {
  const config = SEVERITY_CONFIG[incident.severity];

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border backdrop-blur-xl',
        'transition-all duration-200 hover:scale-[1.01]',
        `bg-gradient-to-br ${config.bgGradient}`,
        config.borderClass
      )}
    >
      {/* Severity indicator strip */}
      <div
        className={cn(
          'absolute left-0 top-0 bottom-0 w-1',
          config.stripClass,
          config.stripGlow
        )}
      />

      <div className="pl-5 pr-5 py-5">
        {/* Header */}
        <div className="flex justify-between items-start gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 mb-2 flex-wrap">
              <span
                className={cn(
                  'text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider',
                  config.badgeClass
                )}
              >
                {config.label}
              </span>
              <span className="text-[11px] font-semibold text-white/50">
                {getProviderDisplayName(
                  { displayName: incident.providerName, userFacingName: incident.providerUserName } as any,
                  isAdminView
                )}
              </span>
            </div>
            <h3 className="text-base font-semibold text-white/95 leading-snug">
              {incident.name}
            </h3>
          </div>

          <DurationBadge duration={incident.duration} />
        </div>

        {/* Lifecycle Progress */}
        <div className="mb-4 px-2">
          <LifecycleProgress currentState={incident.lifecycleState} />
        </div>

        {/* Reasoning (Admin only) */}
        {isAdminView && (
          <div className="mb-4 p-3 bg-blue-500/12 border border-blue-500/25 rounded-lg">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-blue-400 mb-1.5">
              <span>🧠</span>
              <span>Severity Reasoning</span>
            </div>
            <div className="text-xs text-white/85 leading-relaxed">
              {incident.reasoning}
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/50">
          <div>
            <span className="font-semibold">Started:</span>{' '}
            {formatShortGMT(incident.created_at)}
          </div>
          {incident.updated_at !== incident.created_at && (
            <div>
              <span className="font-semibold">Updated:</span>{' '}
              {formatShortGMT(incident.updated_at)}
            </div>
          )}
          <div>
            <span className="font-semibold">Duration:</span>{' '}
            {getTimeSinceGMT(incident.created_at)}
          </div>
          <div>
            <span className="font-semibold">Impact:</span>{' '}
            <span className="capitalize">{incident.impact}</span>
          </div>
        </div>
      </div>
    </div>
  );
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
    if (impact === 'critical' || impact === 'major') {
      if (duration > 30 * 60 * 1000) return 'critical';
      if (providerPriority === 'primary') return 'critical';
      return 'high';
    }

    if (impact === 'minor' && providerPriority === 'primary') {
      return duration > 60 * 60 * 1000 ? 'high' : 'medium';
    }

    if (status === 'investigating' || impact === 'minor') {
      return 'medium';
    }

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
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[a.severity] - severityOrder[b.severity];
      }
      return b.duration - a.duration;
    });

  if (activeIncidents.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      {/* Section Header */}
      <div className="mb-4">
        <div className="flex items-center gap-3 mb-2">
          <h2 className="text-lg font-bold text-white/95 tracking-tight">
            Active Incidents
          </h2>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
            {activeIncidents.length}
          </span>
        </div>
        <p className="text-sm text-white/60">
          Real-time tracking of infrastructure partner incidents affecting myRA AI
        </p>
      </div>

      {/* Incidents Grid */}
      <div className="grid gap-4">
        {activeIncidents.map((incident) => (
          <IncidentCard
            key={incident.id}
            incident={incident}
            isAdminView={isAdminView}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-white/8 flex items-center gap-5 flex-wrap text-[11px]">
        <span className="text-white/40 font-medium">Severity:</span>
        {Object.entries(SEVERITY_CONFIG).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className={cn('w-2 h-2 rounded-full', cfg.stripClass)} />
            <span className="text-white/50 capitalize">{key}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
