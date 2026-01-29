'use client';

import React from 'react';
import { Clock, Users, Activity, AlertTriangle, Eye, ExternalLink } from 'lucide-react';
import type { OrgSummary } from '@/hooks/useGtmDashboard';

interface RecentlyRolledOutProps {
  orgs: OrgSummary[];
  onOrgClick?: (org: OrgSummary) => void;
}

export default function RecentlyRolledOut({ orgs, onOrgClick }: RecentlyRolledOutProps) {
  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700">
            <Activity className="w-3 h-3" />
            Active
          </span>
        );
      case 'low_activity':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700">
            <AlertTriangle className="w-3 h-3" />
            Low Activity
          </span>
        );
      case 'dormant':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">
            <Clock className="w-3 h-3" />
            Dormant
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-neutral-100 text-neutral-600">
            Never Used
          </span>
        );
    }
  };

  if (orgs.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-neutral-200/60 p-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-4">Recently Rolled Out (Last 7 Days)</h3>
        <div className="text-center py-8 text-neutral-500">
          No new trials in the last 7 days
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-neutral-200/60 overflow-hidden">
      <div className="px-6 py-4 border-b border-neutral-100">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-neutral-900">Recently Rolled Out</h3>
          <span className="text-sm text-neutral-500">Last 7 days</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-neutral-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                Company
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                Trial Start
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                Users
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                Usage
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {orgs.map((org) => (
              <tr key={org.id} className="hover:bg-neutral-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center">
                      <span className="text-violet-700 font-semibold text-sm">
                        {(org.displayName || org.name).charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-neutral-900">{org.displayName || org.name}</div>
                      {org.salesPoc && (
                        <div className="text-xs text-neutral-500">{org.salesPoc}</div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                  {formatDate(org.trialStartDate)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-1.5 text-sm text-neutral-600">
                    <Users className="w-4 h-4 text-neutral-400" />
                    {org.activeUsers || 0}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                  {org.totalConversations || 0} chats
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(org.activityStatus)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <button
                    onClick={() => onOrgClick?.(org)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-violet-600 hover:text-violet-700 hover:bg-violet-50 rounded-lg transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
