'use client';

import { Incident } from '@/lib/types';

interface IncidentTimelineProps {
  incidents: Incident[];
  providerName: string;
  providerColor: string;
}

export default function IncidentTimeline({ incidents, providerName, providerColor }: IncidentTimelineProps) {
  if (incidents.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-slate-600 font-medium">No Recent Incidents</p>
        <p className="text-sm text-slate-500 mt-1">{providerName} has been running smoothly</p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('resolved') || statusLower.includes('postmortem')) {
      return 'bg-emerald-500';
    }
    if (statusLower.includes('monitoring') || statusLower.includes('identified')) {
      return 'bg-blue-500';
    }
    if (statusLower.includes('investigating')) {
      return 'bg-amber-500';
    }
    return 'bg-red-500';
  };

  const getImpactStyle = (impact: string) => {
    const impactLower = impact.toLowerCase();
    if (impactLower === 'critical' || impactLower === 'major') {
      return 'bg-red-100 text-red-700 border-red-200';
    }
    if (impactLower === 'minor') {
      return 'bg-amber-100 text-amber-700 border-amber-200';
    }
    return 'bg-blue-100 text-blue-700 border-blue-200';
  };

  return (
    <div className="space-y-4">
      {incidents.map((incident, index) => (
        <div
          key={incident.id}
          className="glass-effect rounded-xl p-5 hover-lift relative overflow-hidden"
        >
          {/* Side accent bar */}
          <div
            className="absolute left-0 top-0 bottom-0 w-1"
            style={{ backgroundColor: providerColor }}
          />

          <div className="ml-4">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(incident.status)}`} />
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    {incident.status.replace('_', ' ')}
                  </span>
                </div>
                <h4 className="text-lg font-semibold text-slate-800 mb-1">
                  {incident.name}
                </h4>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full border ${getImpactStyle(incident.impact)}`}>
                    {incident.impact} Impact
                  </span>
                  <span className="text-xs text-slate-500">
                    {new Date(incident.created_at).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Updates */}
            {incident.incident_updates && incident.incident_updates.length > 0 && (
              <div className="space-y-2 mt-4">
                {incident.incident_updates.slice(0, 2).map((update, idx) => (
                  <div key={idx} className="bg-slate-50/50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-slate-700 uppercase">
                        {update.status}
                      </span>
                      <span className="text-xs text-slate-500">
                        {new Date(update.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">{update.body}</p>
                  </div>
                ))}
              </div>
            )}

            {/* View more link */}
            {incident.shortlink && (
              <a
                href={incident.shortlink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-myra-primary hover:text-myra-secondary font-medium mt-3 inline-block transition-colors"
              >
                View full details →
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
