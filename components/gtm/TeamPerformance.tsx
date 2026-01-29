'use client';

import React, { useState } from 'react';
import {
  Users,
  Trophy,
  TrendingUp,
  Target,
  DollarSign,
  Loader2,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
} from 'lucide-react';
import { useGtmTeam, TEAM_SORT_OPTIONS, type TeamMember } from '@/hooks/useGtmTeam';

function TeamMemberRow({
  member,
  rank,
  isExpanded,
  onToggle,
}: {
  member: TeamMember;
  rank: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  const getRankBadge = () => {
    if (rank === 1) {
      return (
        <div className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center">
          <Trophy className="w-3.5 h-3.5 text-amber-600" />
        </div>
      );
    }
    if (rank === 2) {
      return (
        <div className="w-6 h-6 bg-neutral-200 rounded-full flex items-center justify-center text-xs font-bold text-neutral-600">
          2
        </div>
      );
    }
    if (rank === 3) {
      return (
        <div className="w-6 h-6 bg-amber-50 rounded-full flex items-center justify-center text-xs font-bold text-amber-700">
          3
        </div>
      );
    }
    return (
      <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-neutral-400">
        {rank}
      </div>
    );
  };

  return (
    <>
      <tr
        className="hover:bg-neutral-50 transition-colors cursor-pointer"
        onClick={onToggle}
      >
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="flex items-center gap-3">
            {getRankBadge()}
            <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center">
              <span className="text-violet-700 font-semibold text-sm">
                {member.salesPoc.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="font-medium text-neutral-900">{member.salesPoc}</span>
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
          {member.totalOrgs}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
          {member.demos}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
          {member.trials}
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <span className="text-emerald-600 font-semibold">{member.wonDeals}</span>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <span className="font-semibold text-violet-600">{formatCurrency(member.pipelineValue)}</span>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <span className="font-semibold text-emerald-600">{formatCurrency(member.wonValue)}</span>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="flex items-center gap-2">
            <div className="w-16 h-2 bg-neutral-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-violet-500 rounded-full"
                style={{ width: `${Math.min(member.trialToWonRate, 100)}%` }}
              />
            </div>
            <span className="text-sm font-medium text-neutral-600">{member.trialToWonRate}%</span>
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-center">
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-neutral-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-neutral-400" />
          )}
        </td>
      </tr>
      {isExpanded && (
        <tr className="bg-neutral-50">
          <td colSpan={9} className="px-6 py-4">
            <div className="grid grid-cols-5 gap-4">
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-neutral-900">{member.inNegotiation}</div>
                <div className="text-xs text-neutral-500">In Negotiation</div>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-red-600">{member.lost}</div>
                <div className="text-xs text-neutral-500">Lost Deals</div>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-violet-600">{formatCurrency(member.totalArr)}</div>
                <div className="text-xs text-neutral-500">Total ARR</div>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-neutral-900">{member.avgDaysInPipeline}</div>
                <div className="text-xs text-neutral-500">Avg Days in Pipeline</div>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-emerald-600">
                  {member.wonDeals + member.lost > 0
                    ? ((member.wonDeals / (member.wonDeals + member.lost)) * 100).toFixed(0)
                    : 0}%
                </div>
                <div className="text-xs text-neutral-500">Win Rate</div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function TeamPerformance() {
  const [sortBy, setSortBy] = useState('won_value');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [expandedMember, setExpandedMember] = useState<string | null>(null);

  const { data, isLoading, error } = useGtmTeam(sortBy, sortOrder);

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-red-500">
        Failed to load team performance data
      </div>
    );
  }

  const team = data?.team || [];
  const summary = data?.summary;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-gradient-to-br from-violet-50 to-violet-100/50 rounded-xl p-4">
            <div className="flex items-center gap-2 text-violet-600 mb-2">
              <Users className="w-4 h-4" />
              <span className="text-xs font-medium uppercase">Team Size</span>
            </div>
            <div className="text-2xl font-bold text-neutral-900">{summary.totalReps}</div>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-4">
            <div className="flex items-center gap-2 text-blue-600 mb-2">
              <Target className="w-4 h-4" />
              <span className="text-xs font-medium uppercase">Pipeline</span>
            </div>
            <div className="text-2xl font-bold text-neutral-900">
              {formatCurrency(summary.totalPipelineValue)}
            </div>
          </div>
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl p-4">
            <div className="flex items-center gap-2 text-emerald-600 mb-2">
              <DollarSign className="w-4 h-4" />
              <span className="text-xs font-medium uppercase">Won Value</span>
            </div>
            <div className="text-2xl font-bold text-neutral-900">
              {formatCurrency(summary.totalWonValue)}
            </div>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-xl p-4">
            <div className="flex items-center gap-2 text-amber-600 mb-2">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs font-medium uppercase">Total ARR</span>
            </div>
            <div className="text-2xl font-bold text-neutral-900">
              {formatCurrency(summary.totalArr)}
            </div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl p-4">
            <div className="flex items-center gap-2 text-purple-600 mb-2">
              <Trophy className="w-4 h-4" />
              <span className="text-xs font-medium uppercase">Top Performer</span>
            </div>
            <div className="text-lg font-bold text-neutral-900 truncate">
              {summary.topPerformer || '-'}
            </div>
          </div>
        </div>
      )}

      {/* Team table */}
      <div className="bg-white rounded-2xl border border-neutral-200/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                  Sales Rep
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                  <button className="flex items-center gap-1" onClick={() => toggleSort('total_orgs')}>
                    Orgs
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                  <button className="flex items-center gap-1" onClick={() => toggleSort('demos')}>
                    Demos
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                  <button className="flex items-center gap-1" onClick={() => toggleSort('trials')}>
                    Trials
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                  <button className="flex items-center gap-1" onClick={() => toggleSort('won_deals')}>
                    Won
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                  <button className="flex items-center gap-1" onClick={() => toggleSort('pipeline_value')}>
                    Pipeline
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                  <button className="flex items-center gap-1" onClick={() => toggleSort('won_value')}>
                    Won Value
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                  <button className="flex items-center gap-1" onClick={() => toggleSort('trial_to_won_rate')}>
                    Conversion
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-6 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {team.map((member, index) => (
                <TeamMemberRow
                  key={member.salesPoc}
                  member={member}
                  rank={index + 1}
                  isExpanded={expandedMember === member.salesPoc}
                  onToggle={() =>
                    setExpandedMember((prev) =>
                      prev === member.salesPoc ? null : member.salesPoc
                    )
                  }
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
