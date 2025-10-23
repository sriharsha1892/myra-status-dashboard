'use client';

import { ServiceStatus } from '@/lib/types';
import StatusIndicator from './StatusIndicator';

interface OverallStatusProps {
  status: ServiceStatus;
  totalProviders: number;
  operationalCount: number;
}

export default function OverallStatus({ status, totalProviders, operationalCount }: OverallStatusProps) {
  // Only show prominent banner if there are actual issues
  const hasIssues = status !== 'operational';
  const issueCount = totalProviders - operationalCount;

  if (!hasIssues) {
    // Minimal banner for all-clear status
    return (
      <div className="glass-effect rounded-xl px-6 py-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">All Systems Operational</h3>
              <p className="text-sm text-slate-600">All {totalProviders} LLM providers are running normally</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-emerald-600">{operationalCount}/{totalProviders}</div>
            <div className="text-xs text-slate-500">providers healthy</div>
          </div>
        </div>
      </div>
    );
  }

  // Prominent alert banner for issues
  const alertConfig = {
    degraded_performance: {
      bg: 'bg-amber-50',
      border: 'border-amber-500',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      titleColor: 'text-amber-900',
      title: 'Degraded Performance Detected',
      description: 'Some LLM providers are experiencing performance issues. Your requests may be slower than usual.',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    },
    partial_outage: {
      bg: 'bg-orange-50',
      border: 'border-orange-500',
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
      titleColor: 'text-orange-900',
      title: 'Partial Service Outage',
      description: 'One or more LLM providers are experiencing outages. Some features may be unavailable.',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    major_outage: {
      bg: 'bg-red-50',
      border: 'border-red-500',
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      titleColor: 'text-red-900',
      title: 'Major Service Disruption',
      description: 'Multiple LLM providers are experiencing critical issues. Significant service disruptions expected.',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
    },
    under_maintenance: {
      bg: 'bg-blue-50',
      border: 'border-blue-500',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      titleColor: 'text-blue-900',
      title: 'Scheduled Maintenance',
      description: 'Planned maintenance is in progress. Some services may be temporarily unavailable.',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    unknown: {
      bg: 'bg-gray-50',
      border: 'border-gray-400',
      iconBg: 'bg-gray-100',
      iconColor: 'text-gray-600',
      titleColor: 'text-gray-900',
      title: 'Status Information Unavailable',
      description: 'Unable to determine current status for some providers. Refreshing data...',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  };

  const config = alertConfig[status] || alertConfig.unknown;

  return (
    <div className={`${config.bg} rounded-xl px-6 py-5 mb-6`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4 flex-1">
          <div className={`${config.iconBg} rounded-lg p-2.5 ${config.iconColor}`}>
            {config.icon}
          </div>
          <div className="flex-1">
            <h3 className={`text-xl font-bold ${config.titleColor} mb-1`}>{config.title}</h3>
            <p className="text-slate-700 mb-3">{config.description}</p>
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="font-semibold text-slate-900">{issueCount}</span>
                <span className="text-slate-600">provider{issueCount !== 1 ? 's' : ''} affected</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                <span className="font-semibold text-slate-900">{operationalCount}</span>
                <span className="text-slate-600">operational</span>
              </div>
            </div>
          </div>
        </div>
        <div className="text-right ml-4">
          <div className={`text-3xl font-bold ${config.titleColor}`}>
            {operationalCount}/{totalProviders}
          </div>
          <div className="text-xs text-slate-600 mt-1">
            {Math.round((operationalCount / totalProviders) * 100)}% healthy
          </div>
        </div>
      </div>
    </div>
  );
}
