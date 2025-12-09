/**
 * ContextSidebar - Live org details panel for Command Center
 * Shows org context when mentioned in conversation
 */

'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Building2,
  Users,
  Clock,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Activity,
  Mail,
  User,
  Calendar,
  DollarSign,
} from 'lucide-react';
import type { OrgContextResponse } from '@/app/api/command/org-context/[id]/route';

interface ContextSidebarProps {
  orgId: string | null;
  onClose: () => void;
  onQuickAction: (template: string) => void;
}

// Health status styling
const healthStatusStyles = {
  healthy: {
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200',
    dot: 'bg-green-500',
  },
  warning: {
    bg: 'bg-yellow-50',
    text: 'text-yellow-700',
    border: 'border-yellow-200',
    dot: 'bg-yellow-500',
  },
  'at-risk': {
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    border: 'border-orange-200',
    dot: 'bg-orange-500',
  },
  critical: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    dot: 'bg-red-500',
  },
};

// Influence badge styling
const influenceStyles: Record<string, string> = {
  champion: 'bg-violet-100 text-violet-700',
  decision_maker: 'bg-blue-100 text-blue-700',
  influencer: 'bg-emerald-100 text-emerald-700',
  user: 'bg-gray-100 text-gray-600',
};

// Insight type icons
const insightIcons = {
  suggestion: Lightbulb,
  risk: AlertTriangle,
  opportunity: TrendingUp,
};

const insightStyles = {
  suggestion: 'bg-blue-50 border-blue-200 text-blue-700',
  risk: 'bg-red-50 border-red-200 text-red-700',
  opportunity: 'bg-green-50 border-green-200 text-green-700',
};

export function ContextSidebar({ orgId, onClose, onQuickAction }: ContextSidebarProps) {
  const [expandedSections, setExpandedSections] = useState({
    contacts: true,
    activity: false,
    insights: true,
  });

  // Fetch org context
  const { data, isLoading, error } = useQuery<OrgContextResponse>({
    queryKey: ['org-context', orgId],
    queryFn: async () => {
      const response = await fetch(`/api/command/org-context/${orgId}`);
      if (!response.ok) throw new Error('Failed to fetch org context');
      return response.json();
    },
    enabled: !!orgId,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Format relative time
  const formatRelativeTime = (timestamp: string | null) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (!orgId) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        className="w-80 border-l border-gray-200 bg-white flex flex-col h-full overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Context</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <LoadingSkeleton />
          ) : error ? (
            <div className="p-4 text-center text-gray-500">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">Failed to load org context</p>
            </div>
          ) : data ? (
            <div className="divide-y divide-gray-100">
              {/* Org Header */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{data.org.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          healthStatusStyles[data.org.healthStatus]?.bg || 'bg-gray-50'
                        } ${healthStatusStyles[data.org.healthStatus]?.text || 'text-gray-600'}`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            healthStatusStyles[data.org.healthStatus]?.dot || 'bg-gray-400'
                          }`}
                        />
                        {data.org.healthStatus.replace('-', ' ')}
                      </span>
                      <span className="text-xs text-gray-500">{data.org.lifecycleStage.replace(/_/g, ' ')}</span>
                    </div>
                  </div>
                  <a
                    href={`/support/trials/${data.org.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded transition-colors"
                    title="Open full profile"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-3">
                  <MetricCard
                    icon={Calendar}
                    label="Trial"
                    value={
                      data.org.trialDaysRemaining !== null
                        ? `${data.org.trialDaysRemaining}d left`
                        : 'N/A'
                    }
                    highlight={data.org.trialDaysRemaining !== null && data.org.trialDaysRemaining <= 7}
                  />
                  <MetricCard
                    icon={Clock}
                    label="Last activity"
                    value={formatRelativeTime(data.org.lastActivityAt)}
                  />
                  <MetricCard
                    icon={Activity}
                    label="Engagement"
                    value={`${data.org.engagementScore}%`}
                    highlight={data.org.engagementScore < 40}
                  />
                  <MetricCard
                    icon={DollarSign}
                    label="Deal"
                    value={
                      data.org.dealValue
                        ? `$${(data.org.dealValue / 1000).toFixed(0)}K`
                        : 'No deal'
                    }
                  />
                </div>
              </div>

              {/* Contacts Section */}
              <CollapsibleSection
                title="Contacts"
                icon={Users}
                count={data.contacts.length}
                isExpanded={expandedSections.contacts}
                onToggle={() => toggleSection('contacts')}
              >
                {data.contacts.length === 0 ? (
                  <p className="text-xs text-gray-500 italic">No contacts added yet</p>
                ) : (
                  <div className="space-y-2">
                    {data.contacts.slice(0, 5).map((contact) => (
                      <button
                        key={contact.id}
                        onClick={() => onQuickAction(`@${contact.name} `)}
                        className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors text-left"
                      >
                        <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <User className="w-3.5 h-3.5 text-gray-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium text-gray-900 truncate">
                              {contact.name}
                            </span>
                            {contact.influence && (
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                  influenceStyles[contact.influence] || 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                {contact.influence.replace(/_/g, ' ')}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Mail className="w-3 h-3" />
                            <span className="truncate">{contact.email}</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CollapsibleSection>

              {/* AI Insights Section */}
              <CollapsibleSection
                title="AI Insights"
                icon={Lightbulb}
                count={data.insights.length}
                isExpanded={expandedSections.insights}
                onToggle={() => toggleSection('insights')}
              >
                {data.insights.length === 0 ? (
                  <p className="text-xs text-gray-500 italic">No insights available</p>
                ) : (
                  <div className="space-y-2">
                    {data.insights.map((insight, idx) => {
                      const Icon = insightIcons[insight.type];
                      return (
                        <div
                          key={idx}
                          className={`flex items-start gap-2 p-2 rounded-lg border ${insightStyles[insight.type]}`}
                        >
                          <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <span className="text-xs leading-relaxed">{insight.text}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CollapsibleSection>

              {/* Recent Activity Section */}
              <CollapsibleSection
                title="Recent Activity"
                icon={Activity}
                count={data.recentEvents.length}
                isExpanded={expandedSections.activity}
                onToggle={() => toggleSection('activity')}
              >
                {data.recentEvents.length === 0 ? (
                  <p className="text-xs text-gray-500 italic">No recent activity</p>
                ) : (
                  <div className="space-y-2">
                    {data.recentEvents.map((event) => (
                      <div key={event.id} className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-300 mt-1.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-700 truncate">{event.summary}</p>
                          <p className="text-[10px] text-gray-400">
                            {formatRelativeTime(event.timestamp)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CollapsibleSection>
            </div>
          ) : null}
        </div>

        {/* Quick Actions Footer */}
        {data && (
          <div className="p-3 border-t border-gray-100 bg-gray-50">
            <div className="flex flex-wrap gap-1.5">
              <QuickActionButton
                label="Log call"
                onClick={() => onQuickAction(`/log call at "${data.org.name}" `)}
              />
              <QuickActionButton
                label="Add note"
                onClick={() => onQuickAction(`/note at "${data.org.name}" `)}
              />
              <QuickActionButton
                label="Follow-up"
                onClick={() => onQuickAction(`/followup "${data.org.name}" `)}
              />
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

// Metric Card Component
function MetricCard({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className={`p-2 rounded-lg ${highlight ? 'bg-red-50' : 'bg-gray-50'}`}>
      <div className="flex items-center gap-1.5 text-gray-500 mb-0.5">
        <Icon className="w-3 h-3" />
        <span className="text-[10px] uppercase tracking-wide">{label}</span>
      </div>
      <p className={`text-sm font-medium ${highlight ? 'text-red-700' : 'text-gray-900'}`}>
        {value}
      </p>
    </div>
  );
}

// Collapsible Section Component
function CollapsibleSection({
  title,
  icon: Icon,
  count,
  isExpanded,
  onToggle,
  children,
}: {
  title: string;
  icon: typeof Users;
  count: number;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="py-3 px-4">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between mb-2 group"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-gray-400" />
          <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
            {title}
          </span>
          <span className="text-[10px] text-gray-400">({count})</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Quick Action Button
function QuickActionButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-2.5 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-full hover:bg-violet-50 hover:text-violet-700 hover:border-violet-200 transition-colors"
    >
      {label}
    </button>
  );
}

// Loading Skeleton
function LoadingSkeleton() {
  return (
    <div className="p-4 space-y-4 animate-pulse">
      <div>
        <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
        <div className="h-4 bg-gray-100 rounded w-1/2" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-14 bg-gray-100 rounded-lg" />
        ))}
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-gray-100 rounded w-1/3" />
        <div className="h-12 bg-gray-50 rounded-lg" />
        <div className="h-12 bg-gray-50 rounded-lg" />
      </div>
    </div>
  );
}

export default ContextSidebar;
