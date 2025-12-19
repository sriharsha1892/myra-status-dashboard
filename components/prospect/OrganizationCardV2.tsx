'use client';

import React, { useState } from 'react';
import {
  Building2,
  Mail,
  Phone,
  MessageSquare,
  Calendar,
  MoreHorizontal,
  ExternalLink,
  Users,
  Clock,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { OrganizationWithRelations, OrgLifecycleStage, getKanbanColumn, CUSTOMER_HEALTH_CONFIG } from '@/lib/types/organization';
import { OrgContact } from '@/lib/types/contact';
import { ContactAvatarStack, ContactAvatarWithInfo } from './ContactAvatarStack';
import { RoleBadgeStack, sortRolesByPriority } from './RoleBadge';
import { LifecyclePill } from './LifecyclePill';

interface OrganizationCardV2Props {
  org: OrganizationWithRelations;
  contacts?: OrgContact[];
  isDragging?: boolean;
  isHovered?: boolean;
  showQuickActions?: boolean;
  onClick?: () => void;
  onQuickAction?: (action: 'email' | 'call' | 'note' | 'meeting') => void;
  className?: string;
}

export function OrganizationCardV2({
  org,
  contacts = [],
  isDragging = false,
  isHovered = false,
  showQuickActions = true,
  onClick,
  onQuickAction,
  className = '',
}: OrganizationCardV2Props) {
  const [isExpanded, setIsExpanded] = useState(false);

  const column = getKanbanColumn(org.lifecycle_stage);
  const primaryContact = contacts.find(c => c.is_primary) || contacts[0];
  const uniqueRoles = [...new Set(contacts.map(c => c.role))];
  const sortedRoles = sortRolesByPriority(uniqueRoles);

  // Calculate engagement score (mock for now)
  const engagementScore = contacts.length > 0 ? Math.min(100, contacts.length * 20 + 30) : 0;

  // Time since last activity
  const lastActivityText = org.last_activity_at
    ? formatTimeAgo(new Date(org.last_activity_at))
    : 'No activity';

  return (
    <div
      className={`
        group relative rounded-lg border bg-white shadow-sm
        transition-all duration-200 ease-out
        ${isDragging ? 'rotate-2 scale-105 shadow-lg ring-2 ring-blue-400' : ''}
        ${isHovered ? 'shadow-md ring-1 ring-gray-200' : ''}
        hover:shadow-md
        ${className}
      `}
      onClick={onClick}
    >
      {/* Header with health indicator */}
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <div className="flex items-center gap-2">
          {/* Health pulse indicator */}
          <DealHealthPulse
            health={org.customer_health}
            lifecycle={org.lifecycle_stage}
          />
          {/* Stage pill */}
          <LifecyclePill stage={org.lifecycle_stage} type="org" size="sm" />
        </div>

        {/* Menu button */}
        <button
          className="p-1 rounded hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
        >
          <MoreHorizontal className="h-4 w-4 text-gray-400" />
        </button>
      </div>

      {/* Main content */}
      <div className="px-3 pb-2">
        {/* Company name + domain */}
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate leading-tight">
              {org.display_name || org.name}
            </h3>
            {org.domain && (
              <a
                href={`https://${org.domain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-gray-500 hover:text-blue-600 flex items-center gap-0.5"
                onClick={(e) => e.stopPropagation()}
              >
                {org.domain}
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
            )}
          </div>

          {/* ICP Fit Score Ring */}
          {org.icp_fit_score !== null && (
            <ICPFitRing score={org.icp_fit_score} />
          )}
        </div>

        {/* Deal value + metadata */}
        {(org.deal_value || org.vertical) && (
          <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-500">
            {org.deal_value && (
              <span className="flex items-center gap-0.5 font-medium text-gray-700">
                <DollarSign className="h-3 w-3" />
                {formatCurrency(org.deal_value, org.deal_currency)}
              </span>
            )}
            {org.vertical && (
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${getVerticalColor(org.vertical)}`}>
                {org.vertical}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Contacts section */}
      <div className="px-3 py-2 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <ContactAvatarStack
            contacts={contacts}
            maxVisible={4}
            size="sm"
            showRoleBadges
          />
          {contacts.length > 0 && (
            <RoleBadgeStack roles={sortedRoles.slice(0, 3)} size="sm" />
          )}
        </div>

        {/* Primary contact info */}
        {primaryContact && (
          <div className="mt-2 flex items-center gap-2 text-xs">
            <span className="font-medium text-gray-700 truncate">
              {primaryContact.name}
            </span>
            {primaryContact.title && (
              <span className="text-gray-400 truncate">
                {primaryContact.title}
              </span>
            )}
            <span className="text-gray-300">|</span>
            <span className="text-gray-400 flex items-center gap-0.5">
              <Clock className="h-3 w-3" />
              {lastActivityText}
            </span>
          </div>
        )}
      </div>

      {/* Engagement bar */}
      <div className="px-3 py-2 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${getEngagementColor(engagementScore)}`}
              style={{ width: `${engagementScore}%` }}
            />
          </div>
          <span className="text-[10px] text-gray-500 font-medium">
            {engagementScore}%
          </span>
        </div>
      </div>

      {/* Quick actions (shown on hover) */}
      {showQuickActions && (
        <div
          className={`
            absolute inset-x-0 bottom-0 translate-y-full pt-1
            opacity-0 group-hover:opacity-100 transition-all duration-200
            pointer-events-none group-hover:pointer-events-auto
            z-10
          `}
        >
          <div className="flex items-center justify-center gap-1 bg-gray-900/95 rounded-lg p-1.5 mx-2 shadow-lg">
            <QuickActionButton
              icon={Mail}
              label="Email"
              onClick={() => onQuickAction?.('email')}
            />
            <QuickActionButton
              icon={Phone}
              label="Call"
              onClick={() => onQuickAction?.('call')}
            />
            <QuickActionButton
              icon={MessageSquare}
              label="Note"
              onClick={() => onQuickAction?.('note')}
            />
            <QuickActionButton
              icon={Calendar}
              label="Meeting"
              onClick={() => onQuickAction?.('meeting')}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Sub-components

interface DealHealthPulseProps {
  health: OrganizationWithRelations['customer_health'];
  lifecycle: OrgLifecycleStage;
}

function DealHealthPulse({ health, lifecycle }: DealHealthPulseProps) {
  // Only show for active deals
  const showPulse = ['trial_active', 'negotiation', 'onboarded'].includes(lifecycle);

  if (!showPulse) {
    return null;
  }

  const colors = {
    onboarding: 'bg-blue-400',
    healthy: 'bg-green-400',
    warning: 'bg-yellow-400',
    at_risk: 'bg-orange-400',
    churning: 'bg-red-400',
  };

  const color = health ? colors[health] : 'bg-green-400';

  return (
    <div className="relative flex h-2.5 w-2.5">
      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${color} opacity-75`} />
      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${color}`} />
    </div>
  );
}

interface ICPFitRingProps {
  score: number;
}

function ICPFitRing({ score }: ICPFitRingProps) {
  const circumference = 2 * Math.PI * 10;
  const offset = circumference - (score / 100) * circumference;

  const color = score >= 70 ? 'text-green-500' : score >= 40 ? 'text-yellow-500' : 'text-red-500';

  return (
    <div className="relative h-7 w-7" title={`ICP Fit: ${score}%`}>
      <svg className="h-7 w-7 -rotate-90" viewBox="0 0 24 24">
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          className="text-gray-100"
        />
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={`${color} transition-all duration-500`}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-gray-600">
        {score}
      </span>
    </div>
  );
}

interface QuickActionButtonProps {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
}

function QuickActionButton({ icon: Icon, label, onClick }: QuickActionButtonProps) {
  return (
    <button
      className="flex items-center gap-1 px-2 py-1 rounded text-xs text-white/90 hover:text-white hover:bg-white/10 transition-colors"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={label}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

// Utility functions

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

function formatCurrency(value: number, currency?: string | null): string {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return formatter.format(value);
}

function getEngagementColor(score: number): string {
  if (score >= 70) return 'bg-green-500';
  if (score >= 40) return 'bg-yellow-500';
  if (score >= 20) return 'bg-orange-500';
  return 'bg-red-500';
}

function getVerticalColor(vertical: string): string {
  const colors: Record<string, string> = {
    'TMT': 'bg-blue-100 text-blue-700',
    'NEO': 'bg-purple-100 text-purple-700',
    'AF&B': 'bg-amber-100 text-amber-700',
    'E&C': 'bg-emerald-100 text-emerald-700',
    'HC': 'bg-red-100 text-red-700',
    'AAD': 'bg-indigo-100 text-indigo-700',
    'Unassigned': 'bg-gray-100 text-gray-600',
  };
  return colors[vertical] || colors['Unassigned'];
}

// Export a skeleton loader for the card
export function OrganizationCardV2Skeleton() {
  return (
    <div className="rounded-lg border bg-white shadow-sm p-3 animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 bg-gray-200 rounded-full" />
          <div className="h-5 w-20 bg-gray-200 rounded-full" />
        </div>
        <div className="h-4 w-4 bg-gray-200 rounded" />
      </div>
      <div className="space-y-2 mb-3">
        <div className="h-4 w-32 bg-gray-200 rounded" />
        <div className="h-3 w-24 bg-gray-200 rounded" />
      </div>
      <div className="flex items-center gap-1 py-2 border-t border-gray-100">
        <div className="h-6 w-6 bg-gray-200 rounded-full" />
        <div className="h-6 w-6 bg-gray-200 rounded-full -ml-2" />
        <div className="h-6 w-6 bg-gray-200 rounded-full -ml-2" />
      </div>
      <div className="pt-2 border-t border-gray-100">
        <div className="h-1.5 w-full bg-gray-200 rounded-full" />
      </div>
    </div>
  );
}
