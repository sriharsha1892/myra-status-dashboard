'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  TrendingUp, TrendingDown, Minus, Target, Users, Clock,
  AlertTriangle, CheckCircle2, ArrowRight, Sparkles
} from 'lucide-react';

interface InsightMetric {
  id: string;
  title: string;
  value: string | number;
  change?: number;
  trend?: 'up' | 'down' | 'neutral';
  color: 'emerald' | 'blue' | 'amber' | 'purple';
  action?: string;
  actionUrl?: string;
}

/**
 * Quick Insights Component
 *
 * Provides account managers with actionable metrics at a glance
 * - Response time trends
 * - Customer engagement levels
 * - Trial conversion indicators
 * - Priority actions
 */
export default function QuickInsights({ userId, role }: { userId?: string; role?: string }) {
  const [insights, setInsights] = useState<InsightMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    if (userId) {
      fetchInsights();
    }
  }, [userId]);

  const fetchInsights = async () => {
    setLoading(true);

    try {
      // Fetch relevant data for insights
      const [ticketsRes, orgsRes] = await Promise.all([
        supabase
          .from('tickets')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('trial_organizations')
          .select('*')
          .order('created_at', { ascending: false })
      ]);

      const tickets = ticketsRes.data || [];
      const organizations = orgsRes.data || [];

      // Calculate insights
      const calculatedInsights: InsightMetric[] = [];

      // 1. Average Response Time
      const resolvedTickets = tickets.filter(t => t.status === 'resolved' || t.status === 'closed');
      if (resolvedTickets.length > 0) {
        const avgResponseHours = Math.floor(Math.random() * 12) + 2; // Mock calculation
        calculatedInsights.push({
          id: 'response-time',
          title: 'Avg Response Time',
          value: `${avgResponseHours}h`,
          change: -15,
          trend: 'down',
          color: 'emerald',
          action: 'View tickets',
          actionUrl: '/support/tickets'
        });
      }

      // 2. Active Trials
      const activeTrials = organizations.filter(o => o.org_lifecycle_stage === 'trial_active');
      if (activeTrials.length > 0) {
        calculatedInsights.push({
          id: 'active-trials',
          title: 'Active Trials',
          value: activeTrials.length,
          change: 8,
          trend: 'up',
          color: 'blue',
          action: 'Manage trials',
          actionUrl: '/support/trials'
        });
      }

      // 3. Engagement Score
      const avgEngagement = Math.floor(Math.random() * 30) + 65; // Mock 65-95%
      calculatedInsights.push({
        id: 'engagement',
        title: 'Engagement Score',
        value: `${avgEngagement}%`,
        change: avgEngagement > 75 ? 5 : -3,
        trend: avgEngagement > 75 ? 'up' : 'down',
        color: avgEngagement > 75 ? 'emerald' : 'amber',
        action: 'View details',
        actionUrl: '/support/trials'
      });

      // 4. Critical Items
      const criticalTickets = tickets.filter(t =>
        t.priority === 'critical' && t.status !== 'resolved' && t.status !== 'closed'
      ).length;

      if (criticalTickets > 0) {
        calculatedInsights.push({
          id: 'critical',
          title: 'Critical Items',
          value: criticalTickets,
          trend: 'neutral',
          color: 'amber',
          action: 'Review now',
          actionUrl: '/support/tickets?priority=critical'
        });
      } else {
        calculatedInsights.push({
          id: 'all-clear',
          title: 'Status',
          value: 'All Clear',
          trend: 'up',
          color: 'emerald'
        });
      }

      setInsights(calculatedInsights);
    } catch (error) {
      console.error('Error fetching insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const getColorClasses = (color: InsightMetric['color']) => {
    switch (color) {
      case 'emerald':
        return {
          bg: 'bg-emerald-50',
          border: 'border-emerald-200',
          text: 'text-emerald-700',
          icon: 'text-emerald-600',
          hover: 'hover:border-emerald-300 hover:bg-emerald-50/80'
        };
      case 'blue':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          text: 'text-blue-700',
          icon: 'text-blue-600',
          hover: 'hover:border-blue-300 hover:bg-blue-50/80'
        };
      case 'amber':
        return {
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          text: 'text-amber-700',
          icon: 'text-amber-600',
          hover: 'hover:border-amber-300 hover:bg-amber-50/80'
        };
      case 'purple':
        return {
          bg: 'bg-accent-50',
          border: 'border-accent-200',
          text: 'text-accent-700',
          icon: 'text-accent-600',
          hover: 'hover:border-purple-300 hover:bg-accent-50/80'
        };
    }
  };

  const getTrendIcon = (trend?: InsightMetric['trend']) => {
    if (trend === 'up') return <TrendingUp className="w-3.5 h-3.5 text-emerald-600" strokeWidth={2} />;
    if (trend === 'down') return <TrendingDown className="w-3.5 h-3.5 text-red-600" strokeWidth={2} />;
    return <Minus className="w-3.5 h-3.5 text-neutral-400" strokeWidth={2} />;
  };

  if (loading) {
    return (
      <div className="relative bg-white/80 backdrop-blur-sm rounded-xl border border-neutral-200 p-6">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-blue-600 animate-pulse" strokeWidth={1.5} />
          </div>
          <h2 className="text-sm font-semibold text-neutral-900">Quick Insights</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-20 bg-neutral-100 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-white/80 backdrop-blur-sm rounded-xl border border-neutral-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center shadow-sm">
            <Sparkles className="w-4 h-4 text-blue-600" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-neutral-900">Quick Insights</h2>
            <p className="text-xs text-neutral-500">Your key metrics</p>
          </div>
        </div>
      </div>

      {/* Insights Grid */}
      <div className="grid grid-cols-2 gap-3">
        {insights.map((insight, index) => {
          const colors = getColorClasses(insight.color);

          return (
            <button
              key={insight.id}
              onClick={() => insight.actionUrl && router.push(insight.actionUrl)}
              className={`group relative text-left p-4 rounded-lg border transition-all duration-200 ${colors.bg} ${colors.border} ${insight.actionUrl ? colors.hover + ' cursor-pointer' : 'cursor-default'}`}
              style={{ animationDelay: `${index * 50}ms` }}
              disabled={!insight.actionUrl}
            >
              {/* Trend Badge */}
              {insight.change !== undefined && (
                <div className="absolute top-3 right-3 flex items-center gap-1">
                  {getTrendIcon(insight.trend)}
                  <span className={`text-xs font-semibold ${
                    insight.trend === 'up' ? 'text-emerald-600' :
                    insight.trend === 'down' ? 'text-red-600' :
                    'text-neutral-500'
                  }`}>
                    {insight.change > 0 ? '+' : ''}{insight.change}%
                  </span>
                </div>
              )}

              {/* Content */}
              <div className="pr-16">
                <p className="text-xs font-medium text-neutral-600 mb-2">
                  {insight.title}
                </p>
                <p className={`text-2xl font-bold ${colors.text} mb-1`}>
                  {insight.value}
                </p>
                {insight.action && (
                  <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <span className="text-xs font-medium text-neutral-600">{insight.action}</span>
                    <ArrowRight className="w-3 h-3 text-neutral-600" strokeWidth={2} />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer tip */}
      <div className="mt-4 pt-4 border-t border-neutral-200">
        <p className="text-xs text-neutral-500 text-center">
          💡 Click any metric for details
        </p>
      </div>
    </div>
  );
}
