'use client';

import { SanitizedIncident } from '@/lib/research-status';
import { cn } from '@/lib/utils';

interface StatusIncidentTimelineProps {
  incidents: SanitizedIncident[];
}

// Status text mapping
const STATUS_TEXT: Record<SanitizedIncident['status'], string> = {
  investigating: 'Investigating',
  identified: 'Identified',
  monitoring: 'Monitoring',
  resolved: 'Resolved',
};

export default function StatusIncidentTimeline({ incidents }: StatusIncidentTimelineProps) {
  // Only show recent incidents (last 24 hours) or active ones
  const recentIncidents = incidents.filter(incident => {
    if (incident.status !== 'resolved') return true;
    const updatedAt = new Date(incident.updatedAt);
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
    return updatedAt.getTime() > twentyFourHoursAgo;
  });

  if (recentIncidents.length === 0) {
    return null; // Don't show section if no incidents
  }

  // Format timestamp
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="rounded-xl border bg-white/[0.02] border-white/10 backdrop-blur-sm p-5">
      {/* Header */}
      <h3 className="text-sm font-semibold text-white/80 mb-4 uppercase tracking-wide">
        Recent Incidents
      </h3>

      {/* Incident List */}
      <div className="space-y-4">
        {recentIncidents.map((incident) => (
          <div
            key={incident.id}
            className={cn(
              'rounded-lg border p-4',
              incident.status === 'resolved'
                ? 'bg-emerald-500/5 border-emerald-500/20'
                : 'bg-amber-500/5 border-amber-500/20'
            )}
          >
            {/* Incident Header */}
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <span
                  className={cn(
                    'inline-block text-xs font-medium px-2 py-0.5 rounded uppercase',
                    incident.status === 'resolved'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-amber-500/20 text-amber-400'
                  )}
                >
                  {STATUS_TEXT[incident.status]}
                </span>
                <p className="text-sm text-white/70 mt-1">
                  {incident.affectedArea}
                </p>
              </div>
              <span className="text-xs text-white/40 whitespace-nowrap">
                {formatDate(incident.createdAt)}
              </span>
            </div>

            {/* Timeline Updates */}
            <div className="space-y-2 pl-2 border-l border-white/10">
              {/* Current status */}
              <div className="flex gap-3 text-xs">
                <span className="text-white/40 w-16 flex-shrink-0">
                  {formatTime(incident.updatedAt)}
                </span>
                <span className="text-white/60">
                  {incident.message}
                </span>
              </div>

              {/* Historical updates (most recent first, limit to 3) */}
              {incident.updates.slice(0, 3).map((update, index) => (
                <div key={index} className="flex gap-3 text-xs">
                  <span className="text-white/40 w-16 flex-shrink-0">
                    {formatTime(update.timestamp)}
                  </span>
                  <span className="text-white/50">
                    {update.message}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
