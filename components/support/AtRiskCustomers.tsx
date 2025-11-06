'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { analyzeOrganizationHealth, type HealthAnalysis } from '@/lib/health-scoring';
import { formatDistanceToNow } from 'date-fns';

interface Organization {
  id: string;
  name: string;
  status: 'trial' | 'paid' | 'cancelled';
  trial_end_date?: string | null;
  created_at: string;
  last_activity?: string | null;
}

interface OrganizationWithHealth {
  organization: Organization;
  health: HealthAnalysis;
  criticalIssuesCount: number;
}

export default function AtRiskCustomers() {
  const [atRiskOrgs, setAtRiskOrgs] = useState<OrganizationWithHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchAtRiskCustomers();
  }, []);

  const fetchAtRiskCustomers = async () => {
    setLoading(true);
    try {
      // Fetch all active organizations (trial or paid)
      const { data: organizations, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .in('status', ['trial', 'paid'])
        .order('created_at', { ascending: false })
        .limit(20); // Get top 20 to analyze

      if (orgError) throw orgError;

      // Analyze health for each organization
      const orgHealthPromises = (organizations || []).map(async (org) => {
        // Fetch tickets
        const { data: tickets } = await supabase
          .from('support_tickets')
          .select('id, title, priority, status, created_at')
          .eq('org_id', org.id)
          .order('created_at', { ascending: false })
          .limit(10);

        // Generate mock activity logs (in production, fetch from database)
        const mockActivityLogs = generateMockActivityLogs();
        const mockFeaturesUsed = ['dashboard', 'tickets'];

        // Analyze health
        const health = analyzeOrganizationHealth(
          org,
          tickets || [],
          mockActivityLogs,
          mockFeaturesUsed,
          org.last_outreach,
          org.last_response
        );

        // Count critical issues
        const criticalIssuesCount = tickets?.filter(
          (t) => t.priority === 'critical' && t.status !== 'resolved'
        ).length || 0;

        return {
          organization: org,
          health,
          criticalIssuesCount,
        };
      });

      const orgHealthData = await Promise.all(orgHealthPromises);

      // Sort by health score (lowest first) and filter at-risk (score < 70)
      const atRisk = orgHealthData
        .filter((item) => item.health.metrics.overall < 70)
        .sort((a, b) => a.health.metrics.overall - b.health.metrics.overall)
        .slice(0, 5); // Top 5 at-risk

      setAtRiskOrgs(atRisk);
    } catch (error) {
      console.error('Error fetching at-risk customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateMockActivityLogs = () => {
    const logs = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      const login_count = i > 3 ? Math.floor(Math.random() * 8) + 2 : Math.floor(Math.random() * 2);

      logs.push({
        date: date.toISOString().split('T')[0],
        login_count,
        actions_count: login_count * 3,
      });
    }

    return logs;
  };

  const getHealthColor = (score: number) => {
    if (score >= 70) return 'bg-emerald-500';
    if (score >= 50) return 'bg-amber-500';
    if (score >= 30) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getHealthBgColor = (score: number) => {
    if (score >= 70) return 'bg-emerald-50 border-emerald-200';
    if (score >= 50) return 'bg-amber-50 border-amber-200';
    if (score >= 30) return 'bg-orange-50 border-orange-200';
    return 'bg-red-50 border-red-200';
  };

  const getHealthTextColor = (score: number) => {
    if (score >= 70) return 'text-emerald-700';
    if (score >= 50) return 'text-amber-700';
    if (score >= 30) return 'text-orange-700';
    return 'text-red-700';
  };

  const getTrendIndicator = (trend?: 'improving' | 'stable' | 'declining') => {
    if (!trend) return null;
    if (trend === 'improving') return '↗';
    if (trend === 'declining') return '↘';
    return '→';
  };

  const getTrendColor = (trend?: 'improving' | 'stable' | 'declining') => {
    if (!trend) return 'text-gray-600';
    if (trend === 'improving') return 'text-emerald-600';
    if (trend === 'declining') return 'text-red-600';
    return 'text-gray-600';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">At-Risk Customers</h2>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-slate-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (atRiskOrgs.length === 0) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">At-Risk Customers</h2>
        <div className="text-center py-8">
          <p className="text-sm text-slate-600">No at-risk customers found</p>
          <p className="text-xs text-slate-500 mt-1">All customers are healthy (score ≥ 70)</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
      <div className="px-6 py-4 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">At-Risk Customers</h2>
          <span className="text-xs font-medium text-slate-600 uppercase tracking-wide">
            Top 5 Priority
          </span>
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {atRiskOrgs.map((item, index) => {
          const { organization, health, criticalIssuesCount } = item;
          const score = health.metrics.overall;
          const trend = health.trend;

          return (
            <div
              key={organization.id}
              onClick={() => router.push(`/support/organizations/${organization.id}/health`)}
              className="px-6 py-4 hover:bg-slate-50 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-4">
                {/* Rank Badge */}
                <div className="flex-shrink-0">
                  <div className={`w-8 h-8 rounded-lg ${getHealthBgColor(score)} border flex items-center justify-center`}>
                    <span className={`text-sm font-bold ${getHealthTextColor(score)}`}>
                      {index + 1}
                    </span>
                  </div>
                </div>

                {/* Organization Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-slate-900 truncate">
                      {organization.name}
                    </h3>
                    {organization.status === 'trial' && (
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded uppercase">
                        Trial
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-600">
                    <span>{health.metrics.issues.length} issue{health.metrics.issues.length !== 1 ? 's' : ''}</span>
                    {criticalIssuesCount > 0 && (
                      <span className="text-red-600 font-medium">
                        {criticalIssuesCount} critical
                      </span>
                    )}
                    {organization.last_activity && (
                      <span>Active {formatDistanceToNow(new Date(organization.last_activity), { addSuffix: true })}</span>
                    )}
                  </div>
                </div>

                {/* Health Score */}
                <div className="flex-shrink-0 text-right">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-2xl font-bold ${getHealthTextColor(score)}`}>
                      {score}
                    </span>
                    {trend && (
                      <span className={`text-lg font-bold ${getTrendColor(trend)}`}>
                        {getTrendIndicator(trend)}
                      </span>
                    )}
                  </div>
                  <div className={`w-24 h-1.5 rounded-full overflow-hidden bg-slate-200`}>
                    <div
                      className={`h-full ${getHealthColor(score)} transition-all duration-300`}
                      style={{ width: `${score}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="px-6 py-3 border-t border-slate-200 bg-slate-50">
        <button
          onClick={() => router.push('/support/organizations')}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          View all organizations →
        </button>
      </div>
    </div>
  );
}
