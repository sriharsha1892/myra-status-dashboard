'use client';

import React from 'react';
import { Presentation, Users, Activity, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: 'violet' | 'emerald' | 'blue' | 'amber';
  trend?: { value: number; isPositive: boolean };
}

function MetricCard({ label, value, subValue, icon: Icon, color, trend }: MetricCardProps) {
  const colorClasses = {
    violet: {
      bg: 'bg-violet-50/80',
      iconBg: 'bg-violet-100',
      iconText: 'text-violet-600',
      text: 'text-violet-600',
    },
    emerald: {
      bg: 'bg-emerald-50/80',
      iconBg: 'bg-emerald-100',
      iconText: 'text-emerald-600',
      text: 'text-emerald-600',
    },
    blue: {
      bg: 'bg-blue-50/80',
      iconBg: 'bg-blue-100',
      iconText: 'text-blue-600',
      text: 'text-blue-600',
    },
    amber: {
      bg: 'bg-amber-50/80',
      iconBg: 'bg-amber-100',
      iconText: 'text-amber-600',
      text: 'text-amber-600',
    },
  };

  const colors = colorClasses[color];

  return (
    <div className={`${colors.bg} backdrop-blur-sm rounded-2xl p-5 border border-white/60 shadow-sm hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between">
        <div className={`${colors.iconBg} p-2.5 rounded-xl`}>
          <Icon className={`w-5 h-5 ${colors.iconText}`} />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-medium ${trend.isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
            {trend.isPositive ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            <span>{trend.value}%</span>
          </div>
        )}
      </div>
      <div className="mt-4">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-neutral-900">{value}</span>
          {subValue && <span className="text-sm text-neutral-500">{subValue}</span>}
        </div>
        <p className="mt-1 text-sm font-medium text-neutral-600">{label}</p>
      </div>
    </div>
  );
}

interface FunnelMetricsProps {
  totalDemos: { orgCount: number; contactCount: number };
  trialsProvided: { orgCount: number; userCount: number };
  totalCost: number;
  totalConversations: number;
}

export default function FunnelMetrics({
  totalDemos,
  trialsProvided,
  totalCost,
  totalConversations,
}: FunnelMetricsProps) {
  const formatCurrency = (value: number) => {
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <MetricCard
        label="Total Demos"
        value={totalDemos.orgCount}
        subValue="orgs"
        icon={Presentation}
        color="violet"
      />
      <MetricCard
        label="Trials Provided"
        value={trialsProvided.orgCount}
        subValue={`${trialsProvided.userCount} users`}
        icon={Users}
        color="emerald"
      />
      <MetricCard
        label="Active Usage"
        value={totalConversations.toLocaleString()}
        subValue="conversations"
        icon={Activity}
        color="blue"
      />
      <MetricCard
        label="Total Cost"
        value={formatCurrency(totalCost)}
        subValue="myRA usage"
        icon={DollarSign}
        color="amber"
      />
    </div>
  );
}
