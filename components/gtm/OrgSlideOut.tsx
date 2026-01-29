'use client';

import React from 'react';
import {
  X,
  Building2,
  Calendar,
  Users,
  DollarSign,
  Activity,
  MessageSquare,
  MapPin,
  Globe,
  User,
  AlertTriangle,
  Clock,
  FileText,
} from 'lucide-react';
import type { OrgSummary } from '@/hooks/useGtmDashboard';

interface OrgSlideOutProps {
  org: OrgSummary | null;
  onClose: () => void;
}

export default function OrgSlideOut({ org, onClose }: OrgSlideOutProps) {
  if (!org) return null;

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  const getActivityBadge = (status?: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700">
            <Activity className="w-3 h-3" />
            Active
          </span>
        );
      case 'low_activity':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-700">
            <AlertTriangle className="w-3 h-3" />
            Low Activity
          </span>
        );
      case 'dormant':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700">
            <Clock className="w-3 h-3" />
            Dormant
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-neutral-100 text-neutral-600">
            Never Used
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full md:w-[480px] bg-white shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between px-6 py-5 border-b border-neutral-200 bg-gradient-to-br from-violet-50 to-white">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center">
            <Building2 className="w-6 h-6 text-violet-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-neutral-900">
              {org.displayName || org.name}
            </h2>
            {org.displayName && org.displayName !== org.name && (
              <p className="text-sm text-neutral-500">{org.name}</p>
            )}
            <div className="mt-2">{getActivityBadge(org.activityStatus)}</div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-neutral-500" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-6">
          {/* Key metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-violet-50 to-violet-100/50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-violet-600 mb-1">
                <DollarSign className="w-4 h-4" />
                <span className="text-xs font-medium uppercase">Deal Value</span>
              </div>
              <div className="text-xl font-bold text-neutral-900">
                {org.dealValue > 0 ? formatCurrency(org.dealValue) : '-'}
              </div>
            </div>
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-emerald-600 mb-1">
                <DollarSign className="w-4 h-4" />
                <span className="text-xs font-medium uppercase">Contract/ARR</span>
              </div>
              <div className="text-xl font-bold text-neutral-900">
                {org.contractValue > 0
                  ? formatCurrency(org.contractValue)
                  : org.arr > 0
                  ? formatCurrency(org.arr)
                  : '-'}
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-blue-600 mb-1">
                <Users className="w-4 h-4" />
                <span className="text-xs font-medium uppercase">Active Users</span>
              </div>
              <div className="text-xl font-bold text-neutral-900">
                {org.activeUsers || 0}
              </div>
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-amber-600 mb-1">
                <MessageSquare className="w-4 h-4" />
                <span className="text-xs font-medium uppercase">Conversations</span>
              </div>
              <div className="text-xl font-bold text-neutral-900">
                {org.totalConversations || 0}
              </div>
            </div>
          </div>

          {/* Trial details */}
          <div className="bg-neutral-50 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-neutral-700 mb-3">Trial Details</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-neutral-600">
                  <Calendar className="w-4 h-4 text-neutral-400" />
                  Trial Start
                </div>
                <span className="text-sm font-medium text-neutral-900">
                  {formatDate(org.trialStartDate)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-neutral-600">
                  <Calendar className="w-4 h-4 text-neutral-400" />
                  Trial End
                </div>
                <span className="text-sm font-medium text-neutral-900">
                  {formatDate(org.trialEndDate)}
                </span>
              </div>
              {org.expectedCloseDate && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-neutral-600">
                    <Calendar className="w-4 h-4 text-neutral-400" />
                    Expected Close
                  </div>
                  <span className="text-sm font-medium text-neutral-900">
                    {formatDate(org.expectedCloseDate)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Organization info */}
          <div className="bg-neutral-50 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-neutral-700 mb-3">Organization Info</h3>
            <div className="space-y-3">
              {org.salesPoc && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-neutral-600">
                    <User className="w-4 h-4 text-neutral-400" />
                    Sales POC
                  </div>
                  <span className="text-sm font-medium text-neutral-900">{org.salesPoc}</span>
                </div>
              )}
              {org.vertical && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-neutral-600">
                    <Building2 className="w-4 h-4 text-neutral-400" />
                    Vertical
                  </div>
                  <span className="text-sm font-medium text-neutral-900">{org.vertical}</span>
                </div>
              )}
              {org.region && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-neutral-600">
                    <MapPin className="w-4 h-4 text-neutral-400" />
                    Region
                  </div>
                  <span className="text-sm font-medium text-neutral-900">{org.region}</span>
                </div>
              )}
              {org.customerHealth && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-neutral-600">
                    <Activity className="w-4 h-4 text-neutral-400" />
                    Health
                  </div>
                  <span className={`text-sm font-medium ${
                    org.customerHealth === 'healthy' ? 'text-emerald-600' :
                    org.customerHealth === 'warning' ? 'text-amber-600' :
                    org.customerHealth === 'at_risk' ? 'text-red-600' :
                    'text-neutral-900'
                  }`}>
                    {org.customerHealth.charAt(0).toUpperCase() + org.customerHealth.slice(1)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {org.notes && (
            <div className="bg-neutral-50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-neutral-700 mb-2">
                <FileText className="w-4 h-4" />
                Notes
              </div>
              <p className="text-sm text-neutral-600 whitespace-pre-wrap">{org.notes}</p>
            </div>
          )}

          {/* Usage cost if available */}
          {org.totalCost !== undefined && org.totalCost > 0 && (
            <div className="bg-amber-50 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-700">
                  <DollarSign className="w-4 h-4" />
                  <span className="text-sm font-semibold">myRA Usage Cost</span>
                </div>
                <span className="text-lg font-bold text-amber-700">
                  ${org.totalCost.toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer actions */}
      <div className="border-t border-neutral-200 px-6 py-4">
        <div className="flex gap-3">
          <button className="flex-1 px-4 py-2 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 transition-colors">
            Edit Organization
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg font-medium hover:bg-neutral-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
