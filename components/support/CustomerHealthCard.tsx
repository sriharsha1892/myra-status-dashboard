'use client';

import { useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import {
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Phone,
  Mail,
  Calendar,
  UserPlus,
  Clock,
  CheckCircle,
} from 'lucide-react';
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
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-800',
    badge: 'bg-green-100 text-green-700',
  },
  warning: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-800',
    badge: 'bg-yellow-100 text-yellow-700',
  },
  'at-risk': {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'text-orange-800',
    badge: 'bg-orange-100 text-orange-700',
  },
  critical: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-800',
    badge: 'bg-red-100 text-red-700',
  },
};

const PRIORITY_COLORS = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
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

  const getTrendIcon = () => {
    if (trend === 'improving') return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (trend === 'declining') return <TrendingDown className="w-4 h-4 text-red-600" />;
    return <Minus className="w-4 h-4 text-gray-600" />;
  };

  const getStatusIcon = () => {
    if (metrics.status === 'healthy') return '✅';
    if (metrics.status === 'warning') return '⚠️';
    if (metrics.status === 'at-risk') return '🔴';
    return '🚨';
  };

  const displayedTickets = showAllTickets ? recentTickets : recentTickets.slice(0, 3);

  return (
    <div className={`rounded-lg border-2 ${colors.border} ${colors.bg} overflow-hidden`}>
      {/* Header */}
      <div className="bg-white border-b-2 border-gray-200 px-6 py-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-gray-900">{orgName}</h2>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${colors.badge}`}>
                {getStatusIcon()} {metrics.status.toUpperCase()} ({metrics.overall}%)
              </span>
              {getTrendIcon()}
            </div>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
              <span className="capitalize font-medium">{orgStatus}</span>
              {daysUntilAction !== undefined && (
                <span className="text-orange-600 font-medium">
                  {daysUntilAction} days left
                </span>
              )}
              {accountManager && (
                <span>
                  Account Manager: <span className="font-medium">{accountManager}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 space-y-6">
        {/* What's Wrong Section */}
        {metrics.issues.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              What's Wrong:
            </h3>
            <ul className="space-y-2">
              {metrics.issues.map((issue, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-red-600 mt-1">•</span>
                  <span className="text-gray-700">{issue}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommendations Section */}
        {metrics.recommendations.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              💡 Recommended Next Steps:
            </h3>
            <ol className="space-y-2">
              {metrics.recommendations.map((rec, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="font-bold text-blue-600">{index + 1}️⃣</span>
                  <span className="text-gray-700">{rec}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-gray-200" />

        {/* Activity Timeline */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            📈 ACTIVITY TIMELINE (Last 7 Days)
          </h3>
          <div className="space-y-2">
            {activityLogs.slice(-7).map((log, index) => {
              const date = new Date(log.date);
              const dayName = format(date, 'EEE');
              const maxLogins = Math.max(...activityLogs.map(l => l.login_count), 10);
              const percentage = (log.login_count / maxLogins) * 100;

              return (
                <div key={index} className="flex items-center gap-3">
                  <span className="text-xs font-medium text-gray-600 w-8">{dayName}</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-6 overflow-hidden">
                    <div
                      className={`h-full ${
                        log.login_count === 0
                          ? 'bg-gray-300'
                          : log.login_count < 3
                          ? 'bg-orange-400'
                          : 'bg-green-500'
                      } transition-all`}
                      style={{ width: `${Math.max(percentage, 5)}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-600 w-32">
                    {log.login_count} login{log.login_count !== 1 ? 's' : ''}
                    {log.login_count === 0 && ' ⚠️'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Tickets */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">
              🎫 RECENT TICKETS ({recentTickets.length})
            </h3>
            {recentTickets.length > 3 && (
              <button
                onClick={() => setShowAllTickets(!showAllTickets)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                {showAllTickets ? 'Show less' : `Show all ${recentTickets.length}`}
              </button>
            )}
          </div>
          {recentTickets.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No recent tickets</p>
          ) : (
            <div className="space-y-2">
              {displayedTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="flex items-center justify-between bg-white rounded-lg p-3 border border-gray-200"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${PRIORITY_COLORS[ticket.priority]}`}>
                        {ticket.priority.toUpperCase()}
                      </span>
                      <span className="text-sm font-medium text-gray-900">{ticket.title}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                      {ticket.status === 'open' && ' • Still open'}
                      {ticket.status === 'in_progress' && ' • In progress'}
                    </p>
                  </div>
                  {(ticket.status === 'open' || ticket.status === 'in_progress') && (
                    <button
                      onClick={() => onAssignTicket(ticket.id)}
                      className="ml-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
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
          <h3 className="text-sm font-semibold text-gray-700 mb-3">💬 LAST INTERACTION</h3>
          {!lastOutreach ? (
            <p className="text-sm text-gray-500 italic">No recent interactions logged</p>
          ) : (
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <p className="text-sm text-gray-700">
                {formatDistanceToNow(new Date(lastOutreach), { addSuffix: true })} - Outreach sent
              </p>
              {lastResponse ? (
                <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  Customer responded {formatDistanceToNow(new Date(lastResponse), { addSuffix: true })}
                </p>
              ) : (
                <p className="text-sm text-orange-600 mt-1 flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  No response yet ⚠️
                </p>
              )}
            </div>
          )}
        </div>

        {/* Health Breakdown */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">📊 HEALTH BREAKDOWN</h3>
          <div className="space-y-3">
            <HealthBar label="Engagement" score={metrics.engagement} trend={trend} />
            <HealthBar label="Support" score={metrics.support} />
            <HealthBar label="Feature Use" score={metrics.featureUsage} />
            <HealthBar label="Response" score={metrics.responsiveness} />
            <div className="pt-2 border-t border-gray-300">
              <HealthBar label="OVERALL" score={metrics.overall} isOverall />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">⚡ QUICK ACTIONS</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={onCallCustomer}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-medium"
            >
              <Phone className="w-4 h-4" />
              Call Customer
            </button>
            <button
              onClick={onSendEmail}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm font-medium"
            >
              <Mail className="w-4 h-4" />
              Send Email
            </button>
            {onExtendTrial && orgStatus === 'trial' && (
              <button
                onClick={onExtendTrial}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2 text-sm font-medium"
              >
                <Clock className="w-4 h-4" />
                Extend Trial 7d
              </button>
            )}
            <button
              onClick={onScheduleMeeting}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm font-medium"
            >
              <Calendar className="w-4 h-4" />
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
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    if (score >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getStatusText = (score: number) => {
    if (score >= 80) return '(Good)';
    if (score >= 60) return '(Fair)';
    if (score >= 40) return '(Poor)';
    return '(Critical)';
  };

  return (
    <div>
      <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
        <span className={isOverall ? 'font-bold text-gray-900' : ''}>
          {label}: {getStatusText(score)}
        </span>
        <div className="flex items-center gap-2">
          {trend && trend === 'improving' && <TrendingUp className="w-3 h-3 text-green-600" />}
          {trend && trend === 'declining' && <TrendingDown className="w-3 h-3 text-red-600" />}
          <span className={isOverall ? 'font-bold' : ''}>{score}%</span>
        </div>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full ${getColor(score)} transition-all duration-500`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}
