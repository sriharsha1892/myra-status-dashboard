'use client';

import React from 'react';
import { Target, DollarSign, Clock, Users, TrendingUp, BarChart3, Calendar, Star, CheckCircle, XCircle } from 'lucide-react';
import PipelineTrends from '@/components/quote/PipelineTrends';
import EmptyState from '@/components/shared/EmptyState';
import type { Organization } from '@/lib/quote/organization-types';
import { formatValue, formatDate, formatTime, type OrgStats } from '@/lib/quote/utils';
import { ORG_STATUS_LABELS, ORG_STATUS_COLORS } from '@/lib/quote/pipeline-types';
import { useDemoEvents, type DemoEvent } from '@/hooks/useDemoEvents';

interface ReportingTabProps {
  organizations: Organization[];
  stats: OrgStats | null;
  loading: boolean;
}

function DemoCard({ demo }: { demo: DemoEvent }) {
  const orgName = demo.trial_organizations?.org_name || 'Unknown Org';
  const statusColors = {
    scheduled: 'bg-blue-100 text-blue-700',
    completed: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-red-100 text-red-700',
  };

  return (
    <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-xl">
      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
          demo.demo_status === 'completed' ? 'bg-emerald-100' :
          demo.demo_status === 'cancelled' ? 'bg-red-100' : 'bg-blue-100'
        }`}>
          {demo.demo_status === 'completed' ? (
            <CheckCircle className="w-5 h-5 text-emerald-600" />
          ) : demo.demo_status === 'cancelled' ? (
            <XCircle className="w-5 h-5 text-red-600" />
          ) : (
            <Calendar className="w-5 h-5 text-blue-600" />
          )}
        </div>
        <div>
          <p className="font-medium text-neutral-900">{orgName}</p>
          <div className="flex items-center gap-2 text-sm text-neutral-500">
            <span>{formatDate(demo.demo_date)}</span>
            {demo.demo_time && (
              <>
                <span>·</span>
                <span>{formatTime(demo.demo_time)}</span>
              </>
            )}
            <span>·</span>
            <span>{demo.sales_poc}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {demo.demo_status === 'completed' && demo.demo_rating && (
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-4 h-4 ${star <= demo.demo_rating! ? 'text-amber-500 fill-amber-500' : 'text-neutral-300'}`}
              />
            ))}
          </div>
        )}
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[demo.demo_status]}`}>
          {demo.demo_status.charAt(0).toUpperCase() + demo.demo_status.slice(1)}
        </span>
      </div>
    </div>
  );
}

export default function ReportingTab({ organizations, stats, loading }: ReportingTabProps) {
  const totalValue = stats?.totalDealValue || 0;
  const onboardedValue = organizations
    .filter(o => o.status === 'onboarded')
    .reduce((sum, o) => sum + (o.deal_value || 0), 0);
  const activeTrials = organizations.filter(o => o.trial_status === 'active').length;
  const pipelineValue = totalValue - onboardedValue;

  // Fetch demos
  const { data: allDemos = [], isLoading: demosLoading } = useDemoEvents();

  // Split demos into upcoming and recent
  const today = new Date().toISOString().split('T')[0];
  const upcomingDemos = allDemos
    .filter(d => d.demo_status === 'scheduled' && d.demo_date >= today)
    .slice(0, 5);
  const recentDemos = allDemos
    .filter(d => d.demo_status !== 'scheduled' || d.demo_date < today)
    .slice(0, 5);

  // Calculate conversion rate
  const totalOrgs = stats?.total || 0;
  const onboardedCount = stats?.byStatus['onboarded'] || 0;
  const conversionRate = totalOrgs > 0 ? ((onboardedCount / totalOrgs) * 100).toFixed(1) : '0';

  // Demo stats
  const completedDemos = allDemos.filter(d => d.demo_status === 'completed').length;
  const scheduledDemos = allDemos.filter(d => d.demo_status === 'scheduled').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 rounded-full border-2 border-neutral-200 border-t-neutral-800 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Onboarded Value */}
        <div className="bg-white rounded-2xl border border-neutral-200/60 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Target className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-neutral-500">Onboarded Value</p>
              <p className="text-2xl font-bold text-neutral-900">{formatValue(onboardedValue)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-emerald-600 font-medium">{onboardedCount} orgs</span>
            <span className="text-neutral-400">converted</span>
          </div>
        </div>

        {/* Pipeline Value */}
        <div className="bg-white rounded-2xl border border-neutral-200/60 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-violet-600" />
            </div>
            <div>
              <p className="text-sm text-neutral-500">Pipeline Value</p>
              <p className="text-2xl font-bold text-neutral-900">{formatValue(pipelineValue)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-violet-600 font-medium">{totalOrgs - onboardedCount} orgs</span>
            <span className="text-neutral-400">in pipeline</span>
          </div>
        </div>

        {/* Active Trials */}
        <div className="bg-white rounded-2xl border border-neutral-200/60 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-neutral-500">Active Trials</p>
              <p className="text-2xl font-bold text-neutral-900">{activeTrials}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-amber-600 font-medium">Live now</span>
          </div>
        </div>

        {/* Conversion Rate */}
        <div className="bg-white rounded-2xl border border-neutral-200/60 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-neutral-500">Conversion Rate</p>
              <p className="text-2xl font-bold text-neutral-900">{conversionRate}%</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-blue-600 font-medium">{totalOrgs} total</span>
            <span className="text-neutral-400">organizations</span>
          </div>
        </div>
      </div>

      {/* Demos Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Demos */}
        <div className="bg-white rounded-2xl border border-neutral-200/60 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-neutral-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-500" />
              Upcoming Demos
            </h3>
            <span className="text-sm text-neutral-500">{scheduledDemos} scheduled</span>
          </div>
          {demosLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 rounded-full border-2 border-neutral-200 border-t-neutral-800 animate-spin" />
            </div>
          ) : upcomingDemos.length > 0 ? (
            <div className="space-y-3">
              {upcomingDemos.map((demo) => (
                <DemoCard key={demo.demo_id} demo={demo} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Calendar}
              title="No upcoming demos"
              description="Schedule a demo to see it here."
              compact
            />
          )}
        </div>

        {/* Recent Demos */}
        <div className="bg-white rounded-2xl border border-neutral-200/60 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-neutral-900 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              Recent Demos
            </h3>
            <span className="text-sm text-neutral-500">{completedDemos} completed</span>
          </div>
          {demosLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 rounded-full border-2 border-neutral-200 border-t-neutral-800 animate-spin" />
            </div>
          ) : recentDemos.length > 0 ? (
            <div className="space-y-3">
              {recentDemos.map((demo) => (
                <DemoCard key={demo.demo_id} demo={demo} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={CheckCircle}
              title="No demo history"
              description="Completed demos will appear here."
              compact
            />
          )}
        </div>
      </div>

      {/* Status Breakdown */}
      <div className="bg-white rounded-2xl border border-neutral-200/60 p-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-neutral-500" />
          Status Breakdown
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Object.entries(stats?.byStatus || {}).map(([status, count]) => {
            const color = ORG_STATUS_COLORS[status as keyof typeof ORG_STATUS_COLORS] || '#6B7280';
            const label = ORG_STATUS_LABELS[status as keyof typeof ORG_STATUS_LABELS] || status;
            const percentage = totalOrgs > 0 ? ((count / totalOrgs) * 100).toFixed(0) : '0';

            return (
              <div key={status} className="text-center">
                <div
                  className="w-full h-2 rounded-full mb-2"
                  style={{ backgroundColor: `${color}20` }}
                >
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      backgroundColor: color,
                      width: `${percentage}%`,
                    }}
                  />
                </div>
                <p className="text-2xl font-bold" style={{ color }}>{count}</p>
                <p className="text-xs text-neutral-500">{label}</p>
                <p className="text-xs text-neutral-400">{percentage}%</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pipeline Trends */}
      <div className="bg-white rounded-2xl border border-neutral-200/60 p-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-neutral-500" />
          Pipeline Trends
        </h3>
        <PipelineTrends isOpen={true} onClose={() => {}} inline={true} />
      </div>
    </div>
  );
}
