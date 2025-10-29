'use client';

import { ProviderStatus } from '@/lib/types';
import StatusIndicator from './StatusIndicator';
import { useViewMode } from '@/contexts/ViewModeContext';
import { getProviderDisplayName } from '@/lib/view-utils';

interface StatusCardProps {
  providerStatus: ProviderStatus;
}

export default function StatusCard({ providerStatus }: StatusCardProps) {
  const { provider, status, incidents, components } = providerStatus;
  const { isAdminView } = useViewMode();

  const hasActiveIncidents = incidents.length > 0 &&
    incidents.some(i => i.status !== 'resolved' && i.status !== 'postmortem');

  // Group components by category
  const apiComponents = components.filter(c =>
    c.name.toLowerCase().includes('api') ||
    c.name.toLowerCase().includes('endpoint')
  );

  const modelComponents = components.filter(c =>
    c.name.toLowerCase().includes('gpt') ||
    c.name.toLowerCase().includes('claude') ||
    c.name.toLowerCase().includes('gemini') ||
    c.name.toLowerCase().includes('model')
  );

  const otherComponents = components.filter(c =>
    !apiComponents.includes(c) && !modelComponents.includes(c)
  );

  const displayComponents = [...modelComponents, ...apiComponents, ...otherComponents];

  return (
    <div className={`glass-effect rounded-xl p-5 hover-lift cursor-pointer group transition-all ${
      status !== 'operational' ? 'ring-2 ring-red-200' : ''
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 flex-1">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-sm"
            style={{ backgroundColor: provider.color }}
          >
            {provider.name.substring(0, 2).toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="text-base font-bold text-slate-900">
                {getProviderDisplayName(provider, isAdminView)}
              </h3>
              <StatusIndicator status={status} showLabel={false} size="sm" showPulse={status !== 'operational'} />
            </div>
            <p className="text-xs text-slate-500">
              {components.length} service{components.length !== 1 ? 's' : ''} monitored
            </p>
          </div>
        </div>
      </div>

      {/* Status Summary */}
      <div className="mb-4">
        {status === 'operational' ? (
          <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">All services operational</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 px-3 py-2 rounded-lg">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="font-medium">Service disruption detected</span>
          </div>
        )}
      </div>

      {/* Component/Model Status - Always show top services */}
      {displayComponents.length > 0 && (
        <div className="space-y-2 mb-4">
          <div className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">
            Service Status
          </div>
          {displayComponents.slice(0, 5).map((component) => {
            const isModel = component.name.toLowerCase().includes('gpt') ||
                          component.name.toLowerCase().includes('claude') ||
                          component.name.toLowerCase().includes('gemini');

            return (
              <div
                key={component.id}
                className={`flex items-center justify-between p-2.5 rounded-lg border transition-colors ${
                  component.status !== 'operational'
                    ? 'bg-red-50 border-red-200'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {isModel && (
                    <svg className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13 7H7v6h6V7z" />
                      <path fillRule="evenodd" d="M7 2a1 1 0 012 0v1h2V2a1 1 0 112 0v1h2a2 2 0 012 2v2h1a1 1 0 110 2h-1v2h1a1 1 0 110 2h-1v2a2 2 0 01-2 2h-2v1a1 1 0 11-2 0v-1H9v1a1 1 0 11-2 0v-1H5a2 2 0 01-2-2v-2H2a1 1 0 110-2h1V9H2a1 1 0 010-2h1V5a2 2 0 012-2h2V2zM5 5h10v10H5V5z" clipRule="evenodd" />
                    </svg>
                  )}
                  <span className={`text-sm font-medium truncate ${
                    component.status !== 'operational' ? 'text-red-900' : 'text-slate-700'
                  }`}>
                    {component.name}
                  </span>
                </div>
                <StatusIndicator status={component.status} showLabel={false} size="sm" />
              </div>
            );
          })}
          {displayComponents.length > 5 && (
            <button className="text-xs text-purple-600 hover:text-purple-700 font-medium w-full text-center py-1">
              View {displayComponents.length - 5} more service{displayComponents.length - 5 !== 1 ? 's' : ''} →
            </button>
          )}
        </div>
      )}

      {/* Active Incidents */}
      {hasActiveIncidents && (
        <div className="border-t border-slate-200 pt-4 mt-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-sm font-bold text-red-900">Active Incident{incidents.length > 1 ? 's' : ''}</span>
          </div>
          <div className="space-y-2">
            {incidents.slice(0, 2).map((incident) => (
              <div key={incident.id} className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="text-sm font-medium text-red-900 mb-1">{incident.name}</div>
                <div className="flex items-center gap-2 text-xs text-red-700">
                  <span className="px-2 py-0.5 bg-red-100 rounded-full font-medium">
                    {incident.impact}
                  </span>
                  <span>•</span>
                  <span>{new Date(incident.created_at).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200 text-xs">
        <span className="text-slate-500">
          Last updated {new Date().toLocaleTimeString()}
        </span>
        <a
          href={provider.statusPageUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-purple-600 hover:text-purple-700 font-medium transition-colors flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          View details
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
    </div>
  );
}
