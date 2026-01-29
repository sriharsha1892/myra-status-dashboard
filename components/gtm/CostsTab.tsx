'use client';

import React from 'react';
import { DollarSign, TrendingUp, Users, MessageSquare, Building2, Loader2 } from 'lucide-react';
import { useGtmCosts } from '@/hooks/useGtmDashboard';

interface CostsTabProps {
  dateRange: number;
}

export default function CostsTab({ dateRange }: CostsTabProps) {
  const { data, isLoading, error } = useGtmCosts(dateRange);

  const formatCurrency = (value: number) => {
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(2)}K`;
    }
    return `$${value.toFixed(2)}`;
  };

  const formatNumber = (value: number) => {
    return value.toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#FF6B6B]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-red-500">Failed to load costs data</div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Summary cards - Glass style */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="backdrop-blur-xl bg-white/70 border border-white/20 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center gap-2 text-amber-600 mb-2">
            <DollarSign className="w-4 h-4" />
            <span className="text-xs font-medium uppercase">Total Cost</span>
          </div>
          <div className="text-3xl font-bold text-neutral-900">
            {formatCurrency(data.summary.totalCost)}
          </div>
        </div>
        <div className="backdrop-blur-xl bg-white/70 border border-white/20 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center gap-2 text-blue-600 mb-2">
            <MessageSquare className="w-4 h-4" />
            <span className="text-xs font-medium uppercase">Conversations</span>
          </div>
          <div className="text-3xl font-bold text-neutral-900">
            {formatNumber(data.summary.totalConversations)}
          </div>
        </div>
        <div className="backdrop-blur-xl bg-white/70 border border-white/20 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center gap-2 text-violet-600 mb-2">
            <Users className="w-4 h-4" />
            <span className="text-xs font-medium uppercase">Total Users</span>
          </div>
          <div className="text-3xl font-bold text-neutral-900">
            {formatNumber(data.summary.totalUsers)}
          </div>
        </div>
        <div className="backdrop-blur-xl bg-white/70 border border-white/20 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center gap-2 text-emerald-600 mb-2">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-medium uppercase">Avg/Org</span>
          </div>
          <div className="text-3xl font-bold text-neutral-900">
            {formatCurrency(data.summary.avgCostPerOrg)}
          </div>
        </div>
      </div>

      {/* Cost by org table */}
      <div className="backdrop-blur-xl bg-white/70 border border-white/20 rounded-2xl overflow-hidden shadow-lg">
        <div className="px-5 py-4 border-b border-neutral-200/50">
          <h3 className="text-sm font-semibold text-neutral-700">Costs by Organization</h3>
        </div>
        <div className="max-h-[500px] overflow-y-auto">
          <table className="w-full">
            <thead className="bg-neutral-50/50 sticky top-0">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-600 uppercase">
                  Organization
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-neutral-600 uppercase">
                  Users
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-neutral-600 uppercase">
                  Chats
                </th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-neutral-600 uppercase">
                  Cost
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {data.byOrg
                .filter((org) => org.cost > 0)
                .map((org) => (
                  <tr key={org.orgId} className="hover:bg-white/50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-neutral-400" />
                        <div>
                          <div className="font-medium text-neutral-900 text-sm">
                            {org.displayName || org.orgName}
                          </div>
                          <div className="text-xs text-neutral-500">{org.stage}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-neutral-600">
                      {org.userCount}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-neutral-600">
                      {formatNumber(org.conversations)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="font-semibold text-amber-600 text-sm">
                        {formatCurrency(org.cost)}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          {data.byOrg.filter((org) => org.cost > 0).length === 0 && (
            <div className="py-12 text-center text-neutral-500 text-sm">
              No cost data for this period
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
