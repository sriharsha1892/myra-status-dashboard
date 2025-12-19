'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  MoreHorizontal,
  Mail,
  Building2,
  User,
  Users,
  ChevronDown,
  ChevronRight,
  Clock,
  DollarSign,
  Globe,
  AlertCircle,
  LogIn,
  Calendar,
} from 'lucide-react';
import type { Organization, OrganizationContact } from '@/lib/quote/organization-types';
import type { OrgStatus, TrialStatus, LoginStatus } from '@/lib/quote/pipeline-types';
import {
  ORG_STATUS_LABELS,
  ORG_STATUS_COLORS,
  TRIAL_STATUS_LABELS,
  TRIAL_STATUS_COLORS,
  LOGIN_STATUS_LABELS,
  REJECTION_REASON_LABELS,
  RejectionReason,
} from '@/lib/quote/pipeline-types';

const ORG_STATUSES: { id: OrgStatus; label: string; color: string }[] = [
  { id: 'prospect', label: 'Prospect', color: '#6B7280' },
  { id: 'demo_done', label: 'Demo Done', color: '#3B82F6' },
  { id: 'trial_access', label: 'Trial Access', color: '#F59E0B' },
  { id: 'negotiation', label: 'Negotiation', color: '#8B5CF6' },
  { id: 'onboarded', label: 'Onboarded', color: '#10B981' },
  { id: 'rejected', label: 'Rejected', color: '#EF4444' },
];

function formatValue(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value}`;
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

interface OrganizationCardProps {
  org: Organization;
  isExpanded: boolean;
  onToggle: () => void;
  onStatusChange: (newStatus: OrgStatus) => void;
  onEdit: () => void;
  onViewActivity?: () => void;
  isSubsidiary?: boolean;
}

export default function OrganizationCard({
  org,
  isExpanded,
  onToggle,
  onStatusChange,
  onEdit,
  onViewActivity,
  isSubsidiary = false,
}: OrganizationCardProps) {
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showSubsidiaries, setShowSubsidiaries] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowStatusMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const trialStatus = (org.trial_status as TrialStatus) || 'not_requested';
  const loginStatus = (org.login_status as LoginStatus) || 'not_logged_in';
  const hasContacts = (org.contact_count || 0) > 0;
  const hasSubsidiaries = (org.subsidiary_count || 0) > 0;

  // Get trial status color class
  const getTrialStatusColor = () => {
    const colors = TRIAL_STATUS_COLORS[trialStatus];
    return colors ? `${colors.bg} ${colors.text}` : 'bg-gray-100 text-gray-600';
  };

  // Get login status indicator
  const getLoginStatusIndicator = () => {
    switch (loginStatus) {
      case 'logged_in':
        return { color: 'bg-green-500', tooltip: 'Logged In' };
      case 'login_issues':
        return { color: 'bg-yellow-500', tooltip: 'Login Issues' };
      default:
        return { color: 'bg-gray-300', tooltip: 'Not Logged In' };
    }
  };

  const loginIndicator = getLoginStatusIndicator();

  return (
    <div
      className={`group relative bg-white rounded-2xl border transition-all duration-300 ${
        isExpanded
          ? 'border-neutral-300 shadow-lg shadow-neutral-200/50 scale-[1.02] z-10'
          : 'border-neutral-200/60 hover:border-neutral-300 hover:shadow-md hover:shadow-neutral-100/50'
      } ${isSubsidiary ? 'ml-4 border-l-2' : ''}`}
      style={isSubsidiary ? { borderLeftColor: ORG_STATUS_COLORS[org.status] } : {}}
    >
      {/* Main Card */}
      <div className="p-4 cursor-pointer" onClick={onToggle}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {isSubsidiary && (
                <Building2 className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              )}
              <h3 className="font-semibold text-neutral-900 text-[15px] truncate leading-tight">
                {org.display_name || org.name}
              </h3>
            </div>
            {org.industry && (
              <p className="text-neutral-500 text-sm mt-0.5 truncate">
                {org.industry}
                {org.country && ` · ${org.country}`}
              </p>
            )}
          </div>
          {org.deal_value ? (
            <span className="text-sm font-semibold text-neutral-900 tabular-nums shrink-0">
              {formatValue(org.deal_value)}
            </span>
          ) : null}
        </div>

        {/* Tags Row */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {/* Contact Count */}
          {hasContacts && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 text-xs">
              <Users className="w-3 h-3" />
              {org.contact_count} contact{org.contact_count !== 1 ? 's' : ''}
            </span>
          )}

          {/* Subsidiary Count */}
          {hasSubsidiaries && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-xs">
              <Building2 className="w-3 h-3" />
              {org.subsidiary_count} subsidiar{org.subsidiary_count !== 1 ? 'ies' : 'y'}
            </span>
          )}

          {/* Trial Status Badge */}
          {trialStatus !== 'not_requested' && (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getTrialStatusColor()}`}>
              {/* Login status indicator dot */}
              {trialStatus === 'active' && (
                <span
                  className={`w-1.5 h-1.5 rounded-full ${loginIndicator.color}`}
                  title={loginIndicator.tooltip}
                />
              )}
              {TRIAL_STATUS_LABELS[trialStatus]}
            </span>
          )}

          {/* Employee/AM */}
          {org.employee_name && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 text-xs">
              <User className="w-3 h-3" />
              {org.employee_name.split(' ')[0]}
            </span>
          )}

          {/* Rejection Reason */}
          {org.status === 'rejected' && org.rejection_reason && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-xs">
              <AlertCircle className="w-3 h-3" />
              {REJECTION_REASON_LABELS[org.rejection_reason as RejectionReason]}
            </span>
          )}
        </div>

        {/* Time & Actions */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-neutral-100">
          <span className="text-xs text-neutral-400">
            {timeAgo(org.status_updated_at || org.created_at)}
          </span>
          <div className="relative" ref={menuRef}>
            <button
              onClick={(e) => { e.stopPropagation(); setShowStatusMenu(!showStatusMenu); }}
              className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {/* Status Quick Menu */}
            {showStatusMenu && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl border border-neutral-200 shadow-xl shadow-neutral-200/50 py-2 z-50">
                <div className="px-3 py-1.5 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                  Move to
                </div>
                {ORG_STATUSES.filter(s => s.id !== org.status).map(status => (
                  <button
                    key={status.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onStatusChange(status.id);
                      setShowStatusMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-neutral-50 flex items-center gap-2 transition-colors"
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: status.color }}
                    />
                    <span>{status.label}</span>
                  </button>
                ))}
                <div className="border-t border-neutral-100 mt-2 pt-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit();
                      setShowStatusMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-neutral-50 text-neutral-700 transition-colors"
                  >
                    Edit Details
                  </button>
                  {onViewActivity && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewActivity();
                        setShowStatusMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-neutral-50 text-neutral-700 transition-colors"
                    >
                      View Activity
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-neutral-100 p-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
          {/* Contacts Section */}
          {org.contacts && org.contacts.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Contacts
              </div>
              <div className="space-y-2">
                {org.contacts.map((contact: OrganizationContact) => (
                  <div
                    key={contact.id}
                    className="flex items-center gap-3 p-2 rounded-lg bg-neutral-50 hover:bg-neutral-100 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center">
                      <User className="w-4 h-4 text-neutral-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-neutral-900 truncate">
                        {contact.name || contact.email}
                      </div>
                      {contact.title && (
                        <div className="text-xs text-neutral-500 truncate">{contact.title}</div>
                      )}
                    </div>
                    <a
                      href={`mailto:${contact.email}`}
                      onClick={(e) => e.stopPropagation()}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                    >
                      <Mail className="w-4 h-4" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Subsidiaries Section */}
          {org.subsidiaries && org.subsidiaries.length > 0 && (
            <div className="space-y-2">
              <button
                onClick={(e) => { e.stopPropagation(); setShowSubsidiaries(!showSubsidiaries); }}
                className="flex items-center gap-2 text-xs font-medium text-neutral-500 uppercase tracking-wider hover:text-neutral-700 transition-colors"
              >
                {showSubsidiaries ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                Subsidiaries ({org.subsidiaries.length})
              </button>
              {showSubsidiaries && (
                <div className="space-y-2 mt-2">
                  {org.subsidiaries.map((sub: Organization) => (
                    <div
                      key={sub.id}
                      className="flex items-center gap-3 p-2 rounded-lg bg-indigo-50/50 border border-indigo-100"
                    >
                      <Building2 className="w-4 h-4 text-indigo-500" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-neutral-900 truncate">
                          {sub.display_name || sub.name}
                        </div>
                        {sub.region && (
                          <div className="text-xs text-neutral-500 flex items-center gap-1">
                            <Globe className="w-3 h-3" />
                            {sub.region}
                          </div>
                        )}
                      </div>
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: `${ORG_STATUS_COLORS[sub.status]}15`,
                          color: ORG_STATUS_COLORS[sub.status],
                        }}
                      >
                        {ORG_STATUS_LABELS[sub.status]}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Trial Details */}
          {trialStatus !== 'not_requested' && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-100">
              <div className="text-xs font-medium text-amber-600 mb-2">Trial Details</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {org.trial_given_date && (
                  <div className="flex items-center gap-2 text-amber-900">
                    <Calendar className="w-3.5 h-3.5 text-amber-600" />
                    <span>Given: {formatDate(org.trial_given_date)}</span>
                  </div>
                )}
                {org.trial_end_date && (
                  <div className="flex items-center gap-2 text-amber-900">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Ends: {formatDate(org.trial_end_date)}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-amber-900">
                  <LogIn className="w-3.5 h-3.5 text-amber-600" />
                  <span>{LOGIN_STATUS_LABELS[loginStatus]}</span>
                </div>
              </div>
              {org.trial_usage_notes && (
                <p className="text-sm text-amber-900 mt-2 pt-2 border-t border-amber-200">
                  {org.trial_usage_notes}
                </p>
              )}
            </div>
          )}

          {/* Onboarding Details */}
          {org.status === 'onboarded' && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
              <div className="text-xs font-medium text-emerald-600 mb-2">Onboarding Details</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {org.arr && (
                  <div className="flex items-center gap-2 text-emerald-900">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                    <span>ARR: {formatValue(org.arr)}</span>
                  </div>
                )}
                {org.num_users && (
                  <div className="flex items-center gap-2 text-emerald-900">
                    <Users className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{org.num_users} user{org.num_users !== 1 ? 's' : ''}</span>
                  </div>
                )}
                {org.contract_end_date && (
                  <div className="flex items-center gap-2 text-emerald-900">
                    <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Contract ends: {formatDate(org.contract_end_date)}</span>
                  </div>
                )}
                {org.renewal_date && (
                  <div className="flex items-center gap-2 text-emerald-900">
                    <Clock className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Renewal: {formatDate(org.renewal_date)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Pain Points */}
          {org.pain_points && (
            <div className="p-3 rounded-xl bg-neutral-50">
              <div className="text-xs font-medium text-neutral-500 mb-1">Pain Points</div>
              <p className="text-sm text-neutral-700">{org.pain_points}</p>
            </div>
          )}

          {/* Current Tools */}
          {org.current_tools && (
            <div className="p-3 rounded-xl bg-neutral-50">
              <div className="text-xs font-medium text-neutral-500 mb-1">Current Tools</div>
              <p className="text-sm text-neutral-700">{org.current_tools}</p>
            </div>
          )}

          {/* Notes */}
          {org.notes && (
            <div className="p-3 rounded-xl bg-neutral-50">
              <div className="text-xs font-medium text-neutral-500 mb-1">Notes</div>
              <p className="text-sm text-neutral-700">{org.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
