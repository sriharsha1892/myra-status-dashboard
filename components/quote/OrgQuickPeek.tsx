'use client';

import React, { useEffect, useRef } from 'react';
import { X, Calendar, Edit2, Users } from 'lucide-react';
import type { Organization } from '@/lib/quote/organization-types';
import { ORG_STATUS_LABELS, ORG_STATUS_COLORS, TRIAL_STATUS_LABELS } from '@/lib/quote/pipeline-types';
import { formatValue, timeAgo } from '@/lib/quote/utils';

interface OrgQuickPeekProps {
  org: Organization | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (org: Organization) => void;
  onScheduleDemo?: (org: Organization) => void;
}

export default function OrgQuickPeek({
  org,
  isOpen,
  onClose,
  onEdit,
  onScheduleDemo,
}: OrgQuickPeekProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !org) return null;

  const statusColor = ORG_STATUS_COLORS[org.status as keyof typeof ORG_STATUS_COLORS] || '#6B7280';
  const statusLabel = ORG_STATUS_LABELS[org.status as keyof typeof ORG_STATUS_LABELS] || org.status;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-40" />

      {/* Panel */}
      <div
        ref={panelRef}
        className="fixed right-0 top-0 h-full w-[400px] bg-white shadow-2xl z-50 overflow-y-auto animate-in slide-in-from-right duration-200"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-neutral-200 px-6 py-4 flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-neutral-900 truncate">
              {org.display_name || org.name}
            </h2>
            {org.industry && (
              <p className="text-sm text-neutral-500 truncate">{org.industry}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 rounded-lg transition-colors ml-2"
          >
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status & Value */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-neutral-50 rounded-xl p-4">
              <p className="text-xs text-neutral-500 mb-1">Status</p>
              <span
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium"
                style={{ backgroundColor: `${statusColor}15`, color: statusColor }}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColor }} />
                {statusLabel}
              </span>
            </div>
            <div className="bg-neutral-50 rounded-xl p-4">
              <p className="text-xs text-neutral-500 mb-1">Deal Value</p>
              <p className="text-xl font-bold text-neutral-900">
                {org.deal_value ? formatValue(org.deal_value) : '—'}
              </p>
            </div>
          </div>

          {/* Trial Status */}
          {org.trial_status && org.trial_status !== 'not_requested' && (
            <div className="bg-neutral-50 rounded-xl p-4">
              <p className="text-xs text-neutral-500 mb-2">Trial</p>
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  org.trial_status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                  org.trial_status === 'revoked' ? 'bg-purple-100 text-purple-700' :
                  org.trial_status === 'expired' ? 'bg-red-100 text-red-700' :
                  org.trial_status === 'inactive' ? 'bg-orange-100 text-orange-700' :
                  'bg-neutral-100 text-neutral-600'
                }`}>
                  {TRIAL_STATUS_LABELS[org.trial_status as keyof typeof TRIAL_STATUS_LABELS] || org.trial_status}
                </span>
                {org.trial_days_remaining !== undefined && org.trial_days_remaining !== null && (
                  <span className="text-sm text-neutral-500">
                    {org.trial_days_remaining} days remaining
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Contacts */}
          {org.contacts && org.contacts.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Contacts ({org.contacts.length})
              </h3>
              <div className="space-y-2">
                {org.contacts.slice(0, 3).map((contact, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-neutral-50 rounded-xl">
                    <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 text-sm font-medium">
                      {contact.name?.charAt(0)?.toUpperCase() || 'C'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-900 truncate">{contact.name}</p>
                      {contact.email && (
                        <a
                          href={`mailto:${contact.email}`}
                          className="text-xs text-violet-600 hover:text-violet-700 truncate block"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {contact.email}
                        </a>
                      )}
                    </div>
                    {contact.is_primary && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                        Primary
                      </span>
                    )}
                  </div>
                ))}
                {org.contacts.length > 3 && (
                  <p className="text-xs text-neutral-500 text-center py-1">
                    +{org.contacts.length - 3} more contacts
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Owner & Updated */}
          <div className="grid grid-cols-2 gap-4">
            {org.employee_name && (
              <div>
                <p className="text-xs text-neutral-500 mb-1">Owner</p>
                <p className="text-sm font-medium text-neutral-900">{org.employee_name}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-neutral-500 mb-1">Last Updated</p>
              <p className="text-sm text-neutral-600">
                {timeAgo(org.status_updated_at || org.created_at)}
              </p>
            </div>
          </div>

          {/* Notes */}
          {org.notes && (
            <div>
              <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
                Notes
              </h3>
              <p className="text-sm text-neutral-600 bg-neutral-50 rounded-xl p-3">
                {org.notes}
              </p>
            </div>
          )}

          {/* Pain Points */}
          {org.pain_points && (
            <div>
              <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
                Pain Points
              </h3>
              <p className="text-sm text-neutral-600 bg-amber-50 rounded-xl p-3">
                {org.pain_points}
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-white border-t border-neutral-200 px-6 py-4 flex gap-3">
          <button
            onClick={() => onEdit(org)}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-xl transition-colors"
          >
            <Edit2 className="w-4 h-4" />
            Edit Details
          </button>
          {onScheduleDemo && (
            <button
              onClick={() => onScheduleDemo(org)}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-sm font-medium rounded-xl transition-colors"
            >
              <Calendar className="w-4 h-4" />
              Schedule Demo
            </button>
          )}
        </div>
      </div>
    </>
  );
}
