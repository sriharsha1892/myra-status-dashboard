'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { getRiskAssessment, formatLastActivity } from '@/lib/trial-org-recency';

interface AtRiskOrg {
  org_id: string;
  org_name: string;
  current_stage: string;
  last_activity_at: string | null;
  trial_end_date: string | null;
  completeness_score: number;
}

export default function AtRiskWidget() {
  const [atRiskOrgs, setAtRiskOrgs] = useState<AtRiskOrg[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    fetchAtRiskOrgs();
  }, []);

  const fetchAtRiskOrgs = async () => {
    try {
      const { data, error } = await supabase
        .from('trial_organizations')
        .select('org_id, org_name, current_stage, last_activity_at, trial_end_date, completeness_score')
        .in('current_stage', ['trial_active', 'prospect'])
        .order('last_activity_at', { ascending: true, nullsFirst: true })
        .limit(20);

      if (error) throw error;

      // Filter to only at-risk orgs
      const atRisk = (data || []).filter((org) => {
        const risk = getRiskAssessment(
          org.current_stage,
          org.last_activity_at,
          org.trial_end_date,
          org.completeness_score
        );
        return risk.isAtRisk && risk.riskLevel !== 'none';
      });

      setAtRiskOrgs(atRisk.slice(0, 5)); // Show top 5
    } catch (error) {
      console.error('Error fetching at-risk orgs:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-6 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (atRiskOrgs.length === 0) {
    return null; // Don't show widget if no at-risk orgs
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border-2 border-orange-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-orange-600" />
          <h3 className="text-lg font-semibold text-gray-900">At-Risk Organizations</h3>
        </div>
        <Link
          href="/support/trials/at-risk"
          className="text-sm text-accent-600 hover:text-accent-700 font-medium flex items-center gap-1"
        >
          View All
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* At-Risk List */}
      <div className="space-y-3">
        {atRiskOrgs.map((org) => {
          const risk = getRiskAssessment(
            org.current_stage,
            org.last_activity_at,
            org.trial_end_date,
            org.completeness_score
          );

          return (
            <Link
              key={org.org_id}
              href={`/support/trials/${org.org_id}`}
              className="block p-3 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-gray-900 truncate">{org.org_name}</h4>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        risk.riskLevel === 'high'
                          ? 'bg-red-100 text-red-700'
                          : risk.riskLevel === 'medium'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {risk.riskLevel.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 truncate">
                    {risk.riskReasons.join(' • ')}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Last active: {formatLastActivity(org.last_activity_at)}
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
              </div>
            </Link>
          );
        })}
      </div>

      {atRiskOrgs.length >= 5 && (
        <div className="mt-4 pt-4 border-t border-orange-200">
          <Link
            href="/support/trials/at-risk"
            className="block text-center text-sm text-accent-600 hover:text-accent-700 font-medium"
          >
            View All At-Risk Organizations →
          </Link>
        </div>
      )}
    </div>
  );
}
