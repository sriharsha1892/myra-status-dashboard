'use client';

import { useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { HealthAnalysis } from '@/lib/health-scoring';

interface Ticket {
  id: string;
  title: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  created_at: string;
}

interface ActivityLog {
  date: string;
  login_count: number;
  actions_count: number;
}

interface CustomerHealthCardProps {
  orgId: string;
  orgName: string;
  orgStatus: 'trial' | 'paid' | 'cancelled';
  accountManager?: string | null;
  healthAnalysis: HealthAnalysis;
  recentTickets: Ticket[];
  activityLogs: ActivityLog[];
  lastOutreach?: string | null;
  lastResponse?: string | null;
  onCallCustomer: () => void;
  onSendEmail: () => void;
  onExtendTrial?: () => void;
  onScheduleMeeting: () => void;
  onAssignTicket: (ticketId: string) => void;
}

const HEALTH_COLORS = {
  healthy: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-500',
    text: 'text-emerald-900',
    badge: 'bg-emerald-500 text-white',
    dot: 'bg-emerald-500',
  },
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-500',
    text: 'text-amber-900',
    badge: 'bg-amber-500 text-white',
    dot: 'bg-amber-500',
  },
  'at-risk': {
    bg: 'bg-orange-50',
    border: 'border-orange-500',
    text: 'text-orange-900',
    badge: 'bg-orange-500 text-white',
    dot: 'bg-orange-500',
  },
  critical: {
    bg: 'bg-red-50',
    border: 'border-red-500',
    text: 'text-red-900',
    badge: 'bg-red-500 text-white',
    dot: 'bg-red-500',
  },
};

const PRIORITY_COLORS = {
  low: 'bg-neutral-100 text-neutral-700 border-neutral-300',
  medium: 'bg-blue-100 text-blue-700 border-blue-300',
  high: 'bg-orange-100 text-orange-700 border-orange-300',
  critical: 'bg-red-100 text-red-700 border-red-300',
};

export default function CustomerHealthCard({
  orgId,
  orgName,
  orgStatus,
  accountManager,
  healthAnalysis,
  recentTickets,
  activityLogs,
  lastOutreach,
  lastResponse,
  onCallCustomer,
  onSendEmail,
  onExtendTrial,
  onScheduleMeeting,
  onAssignTicket,
}: CustomerHealthCardProps) {
  const { metrics, trend, riskLevel, daysUntilAction } = healthAnalysis;
  const colors = HEALTH_COLORS[metrics.status];
  const [showAllTickets, setShowAllTickets] = useState(false);

  const getTrendLabel = () => {
    if (trend === 'improving') return 'Improving';
    if (trend === 'declining') return 'Declining';
    return 'Stable';
  };

  const getTrendColor = () => {
    if (trend === 'improving') return 'text-emerald-600';
    if (trend === 'declining') return 'text-red-600';
    return 'text-neutral-600';
  };

  const displayedTickets = showAllTickets ? recentTickets : recentTickets.slice(0, 3);

  return (
    <div className="rounded-xl border shadow-sm overflow-hidden bg-white">
      {/* Header with colored accent */}
      <div className={`h-1 ${colors.badge}`} />

      <div className="px-8 py-6 border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-baseline gap-4">
              <h2 className="text-3xl font-bold text-gray-900 tracking-tight">{orgName}</h2>
              <div className="flex items-center gap-3">
                <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full ${colors.badge}`}>
                  <div className="w-2 h-2 rounded-full bg-white" />
                  <span className="text-sm font-semibold uppercase tracking-wider">
                    {metrics.status.replace('-', ' ')}
                  </span>
                </div>
                <span className="text-4xl font-bold text-gray-900">{metrics.overall}%</span>
                <span className={`text-sm font-medium ${getTrendColor()}`}>
                  {getTrendLabel()}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-6 mt-3 text-sm">
              <span className="px-3 py-1 bg-gray-100 rounded-md font-medium text-gray-700 capitalize">
                {orgStatus}
              </span>
              {daysUntilAction !== undefined && (
                <span className="px-3 py-1 bg-orange-100 rounded-md font-semibold text-orange-700">
                  {daysUntilAction} day{daysUntilAction !== 1 ? 's' : ''} remaining
                </span>
              )}
              {accountManager && (
                <span className="text-gray-600">
                  <span className="text-gray-400">Managed by</span>{' '}
                  <span className="font-semibold text-gray-900">{accountManager}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-8 py-6 space-y-8">
        {/* What's Wrong Section */}
        {metrics.issues.length > 0 && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-red-600 mb-4">
              Issues Detected
            </h3>
            <div className="space-y-3">
              {metrics.issues.map((issue, index) => (
                <div key={index} className="flex items-start gap-3 pl-4 border-l-2 border-red-200 py-1">
                  <span className="text-base text-gray-700 leading-relaxed">{issue}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations Section */}
        {metrics.recommendations.length > 0 && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-4">
              Recommended Actions
            </h3>
            <div className="space-y-3">
              {metrics.recommendations.map((rec, index) => (
                <div key={index} className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-sm font-bold text-blue-600">{index + 1}</span>
                  </div>
                  <span className="text-base text-gray-700 leading-relaxed pt-0.5">{rec}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-gray-200" />

        {/* Activity Timeline */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-4">
            Activity Timeline (Last 7 Days)
          </h3>
          <div className="space-y-3">
            {activityLogs.slice(-7).map((log, index) => {
              const date = new Date(log.date);
              const dayName = format(date, 'EEE');
              const maxLogins = Math.max(...activityLogs.map(l => l.login_count), 10);
              const percentage = (log.login_count / maxLogins) * 100;

              return (
                <div key={index} className="flex items-center gap-4">
                  <span className="text-sm font-semibold text-gray-700 w-10">{dayName}</span>
                  <div className="flex-1 bg-gray-100 rounded-lg h-8 overflow-hidden border border-gray-200">
                    <div
                      className={`h-full ${
                        log.login_count === 0
                          ? 'bg-gray-300'
                          : log.login_count < 3
                          ? 'bg-orange-500'
                          : 'bg-emerald-500'
                      } transition-all duration-300`}
                      style={{ width: `${Math.max(percentage, 5)}%` }}
                    />
                  </div>
                  <span className={`text-sm font-medium w-28 ${
                    log.login_count === 0 ? 'text-red-600' : 'text-gray-700'
                  }`}>
                    {log.login_count} login{log.login_count !== 1 ? 's' : ''}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Tickets */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
              Recent Tickets ({recentTickets.length})
            </h3>
            {recentTickets.length > 3 && (
              <button
                onClick={() => setShowAllTickets(!showAllTickets)}
                className="text-sm text-blue-600 hover:text-blue-700 font-semibold transition-colors"
              >
                {showAllTickets ? 'Show less' : `Show all ${recentTickets.length}`}
              </button>
            )}
          </div>
          {recentTickets.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No recent tickets</p>
          ) : (
            <div className="space-y-3">
              {displayedTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="flex items-center justify-between bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-gray-300 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wide border ${PRIORITY_COLORS[ticket.priority]}`}>
                        {ticket.priority}
                      </span>
                      <span className="text-base font-medium text-gray-900">{ticket.title}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                      {ticket.status === 'open' && ' • Open'}
                      {ticket.status === 'in_progress' && ' • In Progress'}
                    </p>
                  </div>
                  {(ticket.status === 'open' || ticket.status === 'in_progress') && (
                    <button
                      onClick={() => onAssignTicket(ticket.id)}
                      className="ml-4 px-4 py-2 text-sm text-blue-600 hover:text-blue-700 font-semibold hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      Assign
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Last Interaction */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-4">
            Last Interaction
          </h3>
          {!lastOutreach ? (
            <p className="text-sm text-gray-500 italic">No recent interactions logged</p>
          ) : (
            <div className="bg-gray-50 rounded-lg p-4 border border-neutral-200">
              <p className="text-base text-gray-900 font-medium">
                {formatDistanceToNow(new Date(lastOutreach), { addSuffix: true })}
              </p>
              <p className="text-sm text-gray-600 mt-1">Outreach sent</p>
              {lastResponse ? (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-sm font-semibold text-green-600">
                    ✓ Customer responded {formatDistanceToNow(new Date(lastResponse), { addSuffix: true })}
                  </p>
                </div>
              ) : (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-sm font-semibold text-orange-600">
                    ⚠ Awaiting response
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Health Breakdown */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-4">
            Health Breakdown
          </h3>
          <div className="space-y-4">
            <HealthBar label="Engagement" score={metrics.engagement} trend={trend} />
            <HealthBar label="Support" score={metrics.support} />
            <HealthBar label="Feature Use" score={metrics.featureUsage} />
            <HealthBar label="Response" score={metrics.responsiveness} />
            <div className="pt-3 mt-2 border-t-2 border-gray-300">
              <HealthBar label="OVERALL" score={metrics.overall} isOverall />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-4">
            Quick Actions
          </h3>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={onCallCustomer}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all hover:shadow-md text-sm font-bold uppercase tracking-wide"
            >
              Call Customer
            </button>
            <button
              onClick={onSendEmail}
              className="px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all text-sm font-bold uppercase tracking-wide"
            >
              Send Email
            </button>
            {onExtendTrial && orgStatus === 'trial' && (
              <button
                onClick={onExtendTrial}
                className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-all hover:shadow-md text-sm font-bold uppercase tracking-wide"
              >
                Extend Trial 7d
              </button>
            )}
            <button
              onClick={onScheduleMeeting}
              className="px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all text-sm font-bold uppercase tracking-wide"
            >
              Schedule Meeting
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface HealthBarProps {
  label: string;
  score: number;
  trend?: 'improving' | 'stable' | 'declining';
  isOverall?: boolean;
}

function HealthBar({ label, score, trend, isOverall }: HealthBarProps) {
  const getColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-500';
    if (score >= 60) return 'bg-yellow-500';
    if (score >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getStatusText = (score: number) => {
    if (score >= 80) return 'Good';
    if (score >= 60) return 'Fair';
    if (score >= 40) return 'Poor';
    return 'Critical';
  };

  const getStatusColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getTrendIndicator = () => {
    if (!trend) return null;
    if (trend === 'improving') return '↗';
    if (trend === 'declining') return '↘';
    return '→';
  };

  const getTrendColor = () => {
    if (!trend) return '';
    if (trend === 'improving') return 'text-emerald-600';
    if (trend === 'declining') return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-semibold ${isOverall ? 'text-gray-900 uppercase tracking-wide' : 'text-gray-700'}`}>
            {label}
          </span>
          <span className={`text-xs font-medium ${getStatusColor(score)}`}>
            {getStatusText(score)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {trend && (
            <span className={`text-lg font-bold ${getTrendColor()}`}>
              {getTrendIndicator()}
            </span>
          )}
          <span className={`text-sm font-bold ${isOverall ? 'text-lg text-gray-900' : 'text-gray-700'}`}>
            {score}%
          </span>
        </div>
      </div>
      <div className={`w-full bg-gray-200 rounded-lg overflow-hidden ${isOverall ? 'h-3' : 'h-2'}`}>
        <div
          className={`h-full ${getColor(score)} transition-all duration-500`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}
