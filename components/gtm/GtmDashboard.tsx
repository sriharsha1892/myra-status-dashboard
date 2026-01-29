'use client';

import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, Loader2, TrendingUp, TrendingDown, ArrowRight, AlertTriangle, CheckCircle2, Clock, XCircle, Zap, ArrowUpRight, Activity } from 'lucide-react';
import { useGtmDashboard, useRefreshDashboard } from '@/hooks/useGtmDashboard';
import { useGtmCosts } from '@/hooks/useGtmDashboard';
import { useGTMMetrics } from '@/hooks/useGTMMetrics';

type DateRange = 7 | 30 | 90;

// Staggered animation wrapper
function StaggeredCard({ children, index, className = '' }: { children: React.ReactNode; index: number; className?: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), index * 50);
    return () => clearTimeout(timer);
  }, [index]);

  return (
    <div
      className={`transition-all duration-500 ease-out ${className} ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      {children}
    </div>
  );
}

// Animated counter
function useCounter(end: number, duration = 800) {
  const [value, setValue] = useState(0);
  const ref = useRef<number | null>(null);

  useEffect(() => {
    const start = performance.now();
    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.floor(eased * end));
      if (progress < 1) ref.current = requestAnimationFrame(animate);
    };
    ref.current = requestAnimationFrame(animate);
    return () => { if (ref.current) cancelAnimationFrame(ref.current); };
  }, [end, duration]);

  return value;
}

function AnimatedValue({ value }: { value: number }) {
  const animated = useCounter(value);
  return <>{animated.toLocaleString()}</>;
}

// Trend badge
function Trend({ value, label }: { value: number; label?: string }) {
  if (value === 0) return null;
  const positive = value > 0;

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${
      positive ? 'text-emerald-600' : 'text-rose-600'
    }`}>
      {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {positive ? '+' : ''}{value}%{label && <span className="text-slate-400 font-normal ml-1">{label}</span>}
    </span>
  );
}

// Sparkline
function Sparkline({ data, color = '#3B82F6', showTrend = false }: { data: number[]; color?: string; showTrend?: boolean }) {
  if (!data.length || data.length < 2) return null;

  const width = 100;
  const height = 32;
  const padding = 2;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((val, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2);
    const y = padding + (height - padding * 2) - ((val - min) / range) * (height - padding * 2);
    return { x, y };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ');
  const trend = data[data.length - 1] >= data[0];

  return (
    <div className="flex items-center gap-2">
      <svg width={width} height={height}>
        <defs>
          <linearGradient id={`grad-${color.replace('#', '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d={`${linePath} L ${points[points.length - 1].x},${height - padding} L ${padding},${height - padding} Z`}
          fill={`url(#grad-${color.replace('#', '')})`}
        />
        <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="3" fill={color} />
      </svg>
      {showTrend && (
        <span className={`text-xs font-semibold ${trend ? 'text-emerald-600' : 'text-rose-600'}`}>
          {trend ? '↑' : '↓'}
        </span>
      )}
    </div>
  );
}

// Progress bar
function Progress({ value, max, color = '#3B82F6' }: { value: number; max: number; color?: string }) {
  const [width, setWidth] = useState(0);
  const percent = max > 0 ? (value / max) * 100 : 0;

  useEffect(() => {
    const timer = setTimeout(() => setWidth(percent), 100);
    return () => clearTimeout(timer);
  }, [percent]);

  return (
    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700 ease-out"
        style={{ width: `${width}%`, backgroundColor: color }}
      />
    </div>
  );
}


// Metric card with comparison - Now with elevation and hover effects
function MetricCard({
  label,
  value,
  previousValue,
  format = 'number',
  accent = false,
  icon: Icon,
  subtitle,
}: {
  label: string;
  value: number;
  previousValue?: number;
  format?: 'number' | 'currency' | 'percent';
  accent?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
  subtitle?: string;
}) {
  const formatValue = (v: number) => {
    if (format === 'currency') {
      if (v >= 1000) return `$${(v / 1000).toFixed(1)}K`;
      return `$${v.toFixed(0)}`;
    }
    if (format === 'percent') return `${v.toFixed(1)}%`;
    return v.toLocaleString();
  };

  const change = previousValue ? Math.round(((value - previousValue) / previousValue) * 100) : 0;

  // Accent cards: gradient background with glow shadow
  if (accent) {
    return (
      <div className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl p-6
        shadow-xl shadow-indigo-500/30 hover:shadow-2xl hover:scale-[1.02]
        transition-all duration-300 ease-out text-white">
        <div className="flex items-start justify-between mb-3">
          <span className="text-sm font-medium text-indigo-100">{label}</span>
          {Icon && <Icon className="w-5 h-5 text-indigo-200 transition-colors" />}
        </div>
        <div className="text-4xl font-bold tracking-tight text-white">
          {format === 'number' ? <AnimatedValue value={value} /> : formatValue(value)}
        </div>
        <div className="flex items-center gap-2 mt-2">
          {previousValue !== undefined && change !== 0 && (
            <Trend value={change} label="vs prev" />
          )}
          {subtitle && (
            <span className="text-sm text-indigo-100">{subtitle}</span>
          )}
        </div>
      </div>
    );
  }

  // Standard cards: raised shadow with hover lift
  return (
    <div className="group bg-white rounded-2xl p-6 shadow-lg shadow-slate-200/60
      hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 ease-out">
      <div className="flex items-start justify-between mb-3">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        {Icon && <Icon className="w-5 h-5 text-slate-400 transition-colors group-hover:text-slate-600" />}
      </div>
      <div className="text-4xl font-bold tracking-tight text-slate-900">
        {format === 'number' ? <AnimatedValue value={value} /> : formatValue(value)}
      </div>
      <div className="flex items-center gap-2 mt-2">
        {previousValue !== undefined && change !== 0 && (
          <Trend value={change} label="vs prev" />
        )}
        {subtitle && (
          <span className="text-sm text-slate-500">{subtitle}</span>
        )}
      </div>
    </div>
  );
}

export default function GtmDashboard() {
  const [dateRange, setDateRange] = useState<DateRange>(30);
  const { data, isLoading, error, refetch, isFetching } = useGtmDashboard(dateRange);
  const { data: costsData } = useGtmCosts(dateRange);
  const { data: gtmMetrics } = useGTMMetrics(dateRange);
  const refreshDashboard = useRefreshDashboard();

  const handleRefresh = () => {
    refreshDashboard();
    refetch();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          <span className="text-slate-500 font-medium">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 flex flex-col items-center justify-center gap-4">
        <p className="text-rose-600 font-medium">{error.message}</p>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 active:scale-95 transition-all font-medium"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { pipeline, trends } = data;

  // Key metrics
  const totalReached = pipeline.prospects.count + pipeline.active.count + pipeline.strongProspects.count +
                       pipeline.paying.count + pipeline.dormant.count + pipeline.lost.count;
  const activeTrials = pipeline.active.count;
  const payingCustomers = pipeline.paying.count;
  const conversionRate = totalReached > 0 ? (payingCustomers / totalReached) * 100 : 0;
  const pipelineValue = pipeline.strongProspects.count + pipeline.prospects.count;

  const formatCurrency = (val: number) => {
    if (val >= 1000) return `$${(val / 1000).toFixed(1)}K`;
    return `$${val.toFixed(0)}`;
  };

  const formatNumber = (val: number) => {
    if (val >= 100000) return `${(val / 100000).toFixed(1)}L`;
    if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
    return val.toString();
  };

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const maxPipelineCount = Math.max(
    pipeline.paying.count,
    pipeline.strongProspects.count,
    pipeline.prospects.count,
    pipeline.active.count,
    1
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200/60">
        <div className="max-w-[1440px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-900 bg-clip-text text-transparent tracking-tight">myRA GTM</h1>
              <p className="text-xs text-slate-500">{today}</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex bg-slate-100 rounded-lg p-1">
                {([7, 30, 90] as DateRange[]).map((days) => (
                  <button
                    key={days}
                    onClick={() => setDateRange(days)}
                    className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-all active:scale-95 ${
                      dateRange === days
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {days}D
                  </button>
                ))}
              </div>
              <button
                onClick={handleRefresh}
                disabled={isFetching}
                className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 transition-transform ${isFetching ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto px-6 py-6">
        {/* Top Row - KPI Cards */}
        <div className="grid grid-cols-12 gap-5 mb-5">
          <StaggeredCard index={0} className="col-span-3">
            <MetricCard
              label="Active Trials"
              value={activeTrials}
              previousValue={Math.max(1, activeTrials - Math.round(activeTrials * trends.pipelineValue / 100))}
              icon={Activity}
              accent
              subtitle="evaluating now"
            />
          </StaggeredCard>
          <StaggeredCard index={1} className="col-span-3">
            <MetricCard
              label="Paying Customers"
              value={payingCustomers}
              icon={CheckCircle2}
              subtitle={`${conversionRate.toFixed(1)}% conv.`}
            />
          </StaggeredCard>
          <StaggeredCard index={2} className="col-span-3">
            <MetricCard
              label="In Pipeline"
              value={pipelineValue}
              previousValue={Math.max(1, pipelineValue - Math.round(pipelineValue * trends.pipelineValue / 100))}
              icon={Clock}
              subtitle="prospects"
            />
          </StaggeredCard>
          <StaggeredCard index={3} className="col-span-3">
            <MetricCard
              label="Total Reached"
              value={totalReached}
              icon={Zap}
              subtitle="all stages"
            />
          </StaggeredCard>
        </div>

        {/* Middle Row - Equal Cards with Raised Shadows */}
        <div className="grid grid-cols-12 gap-5 mb-5">
          {/* Pipeline Breakdown */}
          <StaggeredCard index={4} className="col-span-4 h-full">
            <div className="bg-white rounded-2xl border border-slate-100 p-5
              shadow-md shadow-slate-100 hover:shadow-xl hover:scale-[1.02]
              transition-all duration-300 ease-out h-full">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-slate-900">Pipeline</h2>
                  {pipeline.active.count > 0 && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold bg-indigo-100 text-indigo-700 rounded-full">
                      +{pipeline.active.count} trials
                    </span>
                  )}
                </div>
                <span className="text-2xl font-bold text-slate-900">{totalReached}</span>
              </div>

              <div className="space-y-4">
                {[
                  { label: 'Paying', count: pipeline.paying.count, color: '#10B981', orgs: pipeline.paying.orgs },
                  { label: 'Strong Prospects', count: pipeline.strongProspects.count, color: '#6366F1', orgs: pipeline.strongProspects.orgs },
                  { label: 'Prospects', count: pipeline.prospects.count, color: '#8B5CF6', orgs: pipeline.prospects.orgs },
                  { label: 'Active Trials', count: pipeline.active.count, color: '#EC4899', orgs: pipeline.active.orgs },
                ].map((stage) => (
                  <div key={stage.label}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }} />
                        <span className="text-sm text-slate-600">{stage.label}</span>
                      </div>
                      <span className="text-sm font-bold" style={{ color: stage.color }}>{stage.count}</span>
                    </div>
                    <Progress value={stage.count} max={maxPipelineCount} color={stage.color} />
                  </div>
                ))}
              </div>

              {/* Risk row */}
              <div className="flex gap-2 mt-5 pt-4 border-t border-slate-100">
                <div className="relative flex-1 flex items-center gap-2 px-3 py-2 bg-amber-50 rounded-lg">
                  {pipeline.dormant.count > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-amber-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">
                      !
                    </span>
                  )}
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-bold text-amber-700">{pipeline.dormant.count}</span>
                  <span className="text-xs text-amber-600">Dormant</span>
                </div>
                <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-rose-50 rounded-lg">
                  <XCircle className="w-4 h-4 text-rose-500" />
                  <span className="text-sm font-bold text-rose-700">{pipeline.lost.count}</span>
                  <span className="text-xs text-rose-600">Lost</span>
                </div>
              </div>
            </div>
          </StaggeredCard>

          {/* Outbound Channels */}
          <StaggeredCard index={5} className="col-span-4 h-full">
            <div className="bg-white rounded-2xl border border-slate-100 p-5
              shadow-md shadow-slate-100 hover:shadow-xl hover:scale-[1.02]
              transition-all duration-300 ease-out h-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-slate-900">Outbound</h2>
                <a href="/quote/admin/reporting" className="text-xs text-indigo-600 hover:text-indigo-800 transition-all flex items-center gap-1 group">
                  Add Data <ArrowUpRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </a>
              </div>

              {/* HubSpot */}
              <div className="mb-4 pb-4 border-b border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <img src="https://www.hubspot.com/hubfs/HubSpot_Logos/HubSpot-Inversed-Favicon.png" alt="HubSpot" className="w-6 h-6 rounded" />
                    <span className="text-sm font-medium text-slate-700">HubSpot</span>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 bg-emerald-50 rounded">
                    <span className="text-lg font-bold text-emerald-600">{gtmMetrics?.hubspot?.qualified ?? 0}</span>
                    <span className="text-xs text-emerald-600">qualified</span>
                  </div>
                </div>
                <div className="flex items-center text-sm">
                  <span className="text-slate-800 font-semibold">{formatNumber(gtmMetrics?.hubspot?.sent ?? 0)}</span>
                  <ArrowRight className="w-3 h-3 mx-2 text-slate-300" />
                  <span className="text-slate-600">{formatNumber(gtmMetrics?.hubspot?.reached ?? 0)} reached</span>
                  <ArrowRight className="w-3 h-3 mx-2 text-slate-300" />
                  <span className="text-slate-600">{formatNumber(gtmMetrics?.hubspot?.followed ?? 0)} followed</span>
                </div>
              </div>

              {/* Apollo */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <img src="https://www.apollo.io/favicon.ico" alt="Apollo" className="w-6 h-6 rounded" />
                    <span className="text-sm font-medium text-slate-700">Apollo</span>
                  </div>
                  {(gtmMetrics?.apollo?.qualified ?? 0) > 0 ? (
                    <div className="flex items-center gap-1 px-2 py-1 bg-emerald-50 rounded">
                      <span className="text-sm font-bold text-emerald-600">{gtmMetrics?.apollo?.qualified}</span>
                      <span className="text-xs text-emerald-600">qualified</span>
                    </div>
                  ) : (
                    <span className="text-xs px-2 py-1 bg-amber-50 text-amber-700 rounded font-medium">
                      {(gtmMetrics?.apollo?.responses ?? 0) > 0 ? `${gtmMetrics?.apollo?.responses} responses` : 'Awaiting'}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-600"><span className="font-semibold text-slate-800">{formatNumber(gtmMetrics?.apollo?.contacted ?? 0)}</span> consulting firms contacted</p>
              </div>
            </div>
          </StaggeredCard>

          {/* Inbound */}
          <StaggeredCard index={6} className="col-span-4 h-full">
            <div className="bg-white rounded-2xl border border-slate-100 p-5
              shadow-md shadow-slate-100 hover:shadow-xl hover:scale-[1.02]
              transition-all duration-300 ease-out h-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-slate-900">Inbound</h2>
                <span className="text-xs text-emerald-600 uppercase tracking-wider font-medium">mordorintelligence.com</span>
              </div>

              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-4xl font-bold text-slate-900">{formatNumber((gtmMetrics?.inbound?.visitors_en ?? 0) + (gtmMetrics?.inbound?.visitors_non_en ?? 0))}</span>
                <span className="text-sm text-slate-500">visitors</span>
              </div>

              <div className="flex gap-3 text-sm text-slate-600 mb-4">
                <span><strong className="text-slate-800">{formatNumber(gtmMetrics?.inbound?.visitors_en ?? 0)}</strong> EN</span>
                <span><strong className="text-slate-800">{formatNumber(gtmMetrics?.inbound?.visitors_non_en ?? 0)}</strong> Non-EN</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-indigo-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-indigo-600">{gtmMetrics?.inbound?.leads ?? 0}</div>
                  <div className="text-xs text-indigo-600">Leads</div>
                </div>
                <div className="bg-emerald-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-emerald-600">{gtmMetrics?.inbound?.active ?? 0}</div>
                  <div className="text-xs text-emerald-600">Active</div>
                </div>
              </div>
            </div>
          </StaggeredCard>
        </div>

        {/* Bottom Row: Costs + Recent */}
        <div className="grid grid-cols-12 gap-5">
          {/* Usage & Costs - Clean Modern Panel */}
          <StaggeredCard index={7} className="col-span-8">
            <div className="bg-white rounded-2xl p-6 border border-slate-100
              shadow-lg shadow-slate-200/60 hover:shadow-xl hover:scale-[1.01] transition-all duration-300 ease-out">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Usage & Costs</h2>
                  <p className="text-xs text-slate-500">{dateRange} day period</p>
                </div>
              </div>

              {costsData ? (
                <>
                  <div className="grid grid-cols-4 gap-6 mb-5">
                    <div className="bg-gradient-to-br from-indigo-50 to-violet-50 rounded-xl p-4">
                      <div className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">{formatCurrency(costsData.summary.totalCost)}</div>
                      <div className="text-sm text-slate-600 font-medium">Total Spend</div>
                      <div className="mt-2">
                        <Sparkline data={costsData.byDate.map(d => d.cost)} color="#6366F1" showTrend />
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4">
                      <div className="text-3xl font-bold text-slate-900">{formatNumber(costsData.summary.totalConversations)}</div>
                      <div className="text-sm text-slate-600 font-medium">Conversations</div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4">
                      <div className="text-3xl font-bold text-slate-900">{costsData.summary.totalUsers}</div>
                      <div className="text-sm text-slate-600 font-medium">Active Users</div>
                    </div>
                    {(() => {
                      const payingOrgs = costsData.byOrg.filter(o => o.stage === 'customer');
                      const trialOrgs = costsData.byOrg.filter(o => o.stage !== 'customer');
                      const payingCost = payingOrgs.reduce((sum, o) => sum + o.cost, 0);
                      const trialCost = trialOrgs.reduce((sum, o) => sum + o.cost, 0);
                      const total = payingCost + trialCost || 1;
                      const trialPct = Math.round((trialCost / total) * 100);
                      const payingPct = Math.round((payingCost / total) * 100);

                      return (
                        <div className="col-span-1 flex gap-2">
                          <div className="flex-1 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-3 border border-slate-200/60">
                            <div className="text-xs text-slate-500 font-medium mb-1">Trial</div>
                            <div className="text-xl font-bold text-slate-700">{formatCurrency(trialCost)}</div>
                            <div className="text-xs text-slate-400">{trialPct}%</div>
                          </div>
                          <div className="flex-1 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-3 border border-emerald-200/60">
                            <div className="text-xs text-emerald-600 font-medium mb-1">Paying</div>
                            <div className="text-xl font-bold text-emerald-700">{formatCurrency(payingCost)}</div>
                            <div className="text-xs text-emerald-500">{payingPct}%</div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Top Spenders - Compact */}
                  <div className="pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Top Spenders</span>
                    </div>
                    <div className="flex gap-2">
                      {costsData.byOrg.slice(0, 5).map((org, i) => (
                        <div key={org.orgId} className="flex-1 bg-slate-50 rounded-xl p-3
                          hover:bg-slate-100 transition-colors border border-slate-100">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center text-[10px] font-bold text-indigo-600">{i + 1}</span>
                            {org.stage === 'customer' && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
                          </div>
                          <div className="text-sm font-bold text-slate-900 truncate">{formatCurrency(org.cost)}</div>
                          <div className="text-[11px] text-slate-500 truncate font-medium">{org.displayName || org.orgName}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                </div>
              )}
            </div>
          </StaggeredCard>

          {/* Recently Rolled Out - Raised */}
          <StaggeredCard index={8} className="col-span-4 h-full">
            <div className="bg-white rounded-2xl p-5 h-full
              shadow-lg shadow-slate-200/60 hover:shadow-xl hover:scale-[1.02]
              transition-all duration-300 ease-out">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-slate-900">Recently Rolled Out</h2>
                <span className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-700">
                  {data.recentlyRolledOut?.length || 0}
                </span>
              </div>
              <div className="space-y-1.5">
                {(data.recentlyRolledOut || []).slice(0, 8).map((org) => (
                  <div key={org.name} className="flex items-center gap-2 py-1.5 px-2 bg-slate-50 rounded-lg">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-sm text-slate-700 truncate flex-1">{org.displayName || org.name}</span>
                  </div>
                ))}
                {(!data.recentlyRolledOut || data.recentlyRolledOut.length === 0) && (
                  <p className="text-sm text-slate-400 text-center py-6">No recent rollouts</p>
                )}
              </div>
            </div>
          </StaggeredCard>
        </div>
      </main>
    </div>
  );
}
