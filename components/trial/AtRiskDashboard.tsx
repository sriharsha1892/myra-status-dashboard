'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AlertTriangle, Clock, TrendingDown, Calendar, Activity } from 'lucide-react';
import Link from 'next/link';
import {
  getRiskAssessment,
  getRecencyMetrics,
  getExpiryMetrics,
  formatLastActivity,
  type RiskAssessment,
} from '@/lib/trial-org-recency';

interface AtRiskOrg {
  org_id: string;
  org_name: string;
  org_domain: string;
  current_stage: string;
  trial_status: string;
  trial_end_date: string | null;
  last_activity_at: string | null;
  completeness_score: number;
  activity_count: number;
  sales_poc_name?: string;
  account_manager_name?: string;
}

export default function AtRiskDashboard() {
  const [atRiskOrgs, setAtRiskOrgs] = useState<AtRiskOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterLevel, setFilterLevel] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [sortBy, setSortBy] = useState<'risk' | 'expiry' | 'activity'>('risk');

  const supabase = createClient();

  useEffect(() => {
    fetchAtRiskOrgs();
  }, []);

  const fetchAtRiskOrgs = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('trial_organizations')
        .select(`
          org_id,
          org_name,
          org_domain,
          current_stage,
          trial_status,
          trial_end_date,
          last_activity_at,
          completeness_score,
          activity_count,
          sales_pocs (name),
          users!trial_organizations_account_manager_id_fkey (full_name)
        `)
        .in('current_stage', ['trial_active', 'prospect'])
        .order('last_activity_at', { ascending: true, nullsFirst: true });

      if (error) throw error;

      const orgsWithRisk = (data || []).map((org: any) => ({
        ...org,
        sales_poc_name: org.sales_pocs?.name,
        account_manager_name: org.users?.full_name,
      }));

      setAtRiskOrgs(orgsWithRisk);
    } catch (error) {
      console.error('Error fetching at-risk orgs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredAndSortedOrgs = () => {
    let filtered = atRiskOrgs;

    // Filter by risk level
    if (filterLevel !== 'all') {
      filtered = filtered.filter((org) => {
        const risk = getRiskAssessment(
          org.current_stage,
          org.last_activity_at,
          org.trial_end_date,
          org.completeness_score
        );
        return risk.riskLevel === filterLevel;
      });
    } else {
      // Only show orgs that are actually at risk
      filtered = filtered.filter((org) => {
        const risk = getRiskAssessment(
          org.current_stage,
          org.last_activity_at,
          org.trial_end_date,
          org.completeness_score
        );
        return risk.isAtRisk;
      });
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'risk') {
        const riskA = getRiskAssessment(a.current_stage, a.last_activity_at, a.trial_end_date, a.completeness_score);
        const riskB = getRiskAssessment(b.current_stage, b.last_activity_at, b.trial_end_date, b.completeness_score);
        const riskOrder = { high: 3, medium: 2, low: 1, none: 0 };
        return riskOrder[riskB.riskLevel] - riskOrder[riskA.riskLevel];
      } else if (sortBy === 'expiry') {
        const daysA = a.trial_end_date ? new Date(a.trial_end_date).getTime() : Infinity;
        const daysB = b.trial_end_date ? new Date(b.trial_end_date).getTime() : Infinity;
        return daysA - daysB;
      } else {
        const timeA = a.last_activity_at ? new Date(a.last_activity_at).getTime() : 0;
        const timeB = b.last_activity_at ? new Date(b.last_activity_at).getTime() : 0;
        return timeA - timeB;
      }
    });

    return filtered;
  };

  const getRiskStats = () => {
    const stats = { total: 0, high: 0, medium: 0, low: 0 };

    atRiskOrgs.forEach((org) => {
      const risk = getRiskAssessment(
        org.current_stage,
        org.last_activity_at,
        org.trial_end_date,
        org.completeness_score
      );

      if (risk.isAtRisk) {
        stats.total++;
        stats[risk.riskLevel]++;
      }
    });

    return stats;
  };

  const filteredOrgs = getFilteredAndSortedOrgs();
  const stats = getRiskStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">At-Risk Organizations</h2>
        <p className="text-gray-600 mt-1">Monitor organizations that need immediate attention</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total At-Risk</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-orange-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-red-300 p-4 bg-red-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-700">High Risk</p>
              <p className="text-2xl font-bold text-red-900 mt-1">{stats.high}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-orange-300 p-4 bg-orange-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-700">Medium Risk</p>
              <p className="text-2xl font-bold text-orange-900 mt-1">{stats.medium}</p>
            </div>
            <TrendingDown className="w-8 h-8 text-orange-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-yellow-300 p-4 bg-yellow-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-700">Low Risk</p>
              <p className="text-2xl font-bold text-yellow-900 mt-1">{stats.low}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>
        </div>
      </div>

      {/* Filters and Sort */}
      <div className="flex items-center justify-between bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Filter:</label>
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value as any)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
          >
            <option value="all">All At-Risk</option>
            <option value="high">High Risk Only</option>
            <option value="medium">Medium Risk Only</option>
            <option value="low">Low Risk Only</option>
          </select>
        </div>

        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Sort by:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
          >
            <option value="risk">Risk Level</option>
            <option value="expiry">Trial Expiry</option>
            <option value="activity">Last Activity</option>
          </select>
        </div>
      </div>

      {/* Organizations List */}
      {filteredOrgs.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 text-sm">No at-risk organizations found</p>
          <p className="text-gray-500 text-xs mt-1">Organizations will appear here when they need attention</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrgs.map((org) => {
            const risk = getRiskAssessment(
              org.current_stage,
              org.last_activity_at,
              org.trial_end_date,
              org.completeness_score
            );
            const recency = getRecencyMetrics(org.last_activity_at);
            const expiry = getExpiryMetrics(org.trial_end_date);

            return (
              <Link
                key={org.org_id}
                href={`/support/trials/${org.org_id}`}
                className="block bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Left: Org Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{org.org_name}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${risk.riskColor}`}>
                        {risk.riskLevel.toUpperCase()} RISK
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-3">
                      <span>{org.org_domain}</span>
                      <span className="text-gray-400">•</span>
                      <span className="capitalize">{org.trial_status?.replace('_', ' ')}</span>
                      {org.account_manager_name && (
                        <>
                          <span className="text-gray-400">•</span>
                          <span>AM: {org.account_manager_name}</span>
                        </>
                      )}
                    </div>

                    {/* Risk Reasons */}
                    <div className="flex flex-wrap gap-2">
                      {risk.riskReasons.map((reason, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded text-xs"
                        >
                          <AlertTriangle className="w-3 h-3" />
                          {reason}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Right: Metrics */}
                  <div className="flex-shrink-0 text-right space-y-2">
                    {/* Last Activity */}
                    <div className="flex items-center justify-end gap-2 text-sm">
                      <Activity className="w-4 h-4 text-gray-400" />
                      <span className={`font-medium ${recency.activityStatusColor.split(' ')[0]}`}>
                        {formatLastActivity(org.last_activity_at)}
                      </span>
                    </div>

                    {/* Trial Expiry */}
                    {org.trial_end_date && (
                      <div className="flex items-center justify-end gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className={`font-medium ${expiry.expiryColor.split(' ')[0]}`}>
                          {expiry.expiryLabel}
                        </span>
                      </div>
                    )}

                    {/* Activity Count */}
                    <div className="text-xs text-gray-500">
                      {org.activity_count} activities logged
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
