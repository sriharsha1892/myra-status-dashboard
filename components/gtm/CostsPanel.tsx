'use client';

import React, { useState } from 'react';
import { X, DollarSign, TrendingUp, Users, MessageSquare, Building2 } from 'lucide-react';
import { useGtmCosts } from '@/hooks/useGtmDashboard';

interface CostsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CostsPanel({ isOpen, onClose }: CostsPanelProps) {
  const [days, setDays] = useState(30);
  const { data, isLoading, error } = useGtmCosts(days);

  const formatCurrency = (value: number) => {
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(2)}K`;
    }
    return `$${value.toFixed(2)}`;
  };

  const formatNumber = (value: number) => {
    return value.toLocaleString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full md:w-[500px] bg-white shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">Costs Overview</h2>
            <p className="text-sm text-neutral-500">myRA usage breakdown</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-neutral-500" />
        </button>
      </div>

      {/* Time range selector */}
      <div className="px-6 py-3 bg-neutral-50 border-b border-neutral-200">
        <div className="flex gap-2">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                days === d
                  ? 'bg-violet-600 text-white'
                  : 'bg-white text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              {d}D
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-500">
            Failed to load costs data
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-amber-600 mb-2">
                  <DollarSign className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase">Total Cost</span>
                </div>
                <div className="text-2xl font-bold text-neutral-900">
                  {formatCurrency(data.summary.totalCost)}
                </div>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-blue-600 mb-2">
                  <MessageSquare className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase">Conversations</span>
                </div>
                <div className="text-2xl font-bold text-neutral-900">
                  {formatNumber(data.summary.totalConversations)}
                </div>
              </div>
              <div className="bg-gradient-to-br from-violet-50 to-violet-100/50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-violet-600 mb-2">
                  <Users className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase">Total Users</span>
                </div>
                <div className="text-2xl font-bold text-neutral-900">
                  {formatNumber(data.summary.totalUsers)}
                </div>
              </div>
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-emerald-600 mb-2">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase">Avg/Org</span>
                </div>
                <div className="text-2xl font-bold text-neutral-900">
                  {formatCurrency(data.summary.avgCostPerOrg)}
                </div>
              </div>
            </div>

            {/* Cost by org table */}
            <div>
              <h3 className="text-sm font-semibold text-neutral-700 mb-3">Costs by Organization</h3>
              <div className="bg-neutral-50 rounded-xl overflow-hidden">
                <div className="max-h-[400px] overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-neutral-100 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-neutral-600 uppercase">
                          Organization
                        </th>
                        <th className="px-4 py-2 text-center text-xs font-semibold text-neutral-600 uppercase">
                          Users
                        </th>
                        <th className="px-4 py-2 text-center text-xs font-semibold text-neutral-600 uppercase">
                          Chats
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-neutral-600 uppercase">
                          Cost
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                      {data.byOrg
                        .filter((org) => org.cost > 0)
                        .slice(0, 20)
                        .map((org) => (
                          <tr key={org.orgId} className="hover:bg-white transition-colors">
                            <td className="px-4 py-3">
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
                            <td className="px-4 py-3 text-right">
                              <span className="font-semibold text-amber-600 text-sm">
                                {formatCurrency(org.cost)}
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
