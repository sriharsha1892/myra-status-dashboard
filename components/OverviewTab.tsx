'use client';

import { Building2, Calendar, User, Globe, RotateCcw, DollarSign, TrendingUp, Video, CalendarClock, MessageSquare, Sparkles, Search, Activity, AlertTriangle, CheckCircle2, XCircle, Loader2, RefreshCcw, Lightbulb } from 'lucide-react';
import { format, differenceInDays, formatDistanceToNow } from 'date-fns';
import TrialExtensionsTab from './TrialExtensionsTab';
import UpdateDealStatusModal from './UpdateDealStatusModal';
import MyraUsageWidget from './myra/MyraUsageWidget';
import { HealthStatusPrompt, DealMomentumPrompt } from './enrichment';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface OverviewTabProps {
  organization: any;
  orgId: string;
}

const DEAL_STATUS_CONFIG: { [key: string]: { icon: string; color: string; bgColor: string; textColor: string } } = {
  prospect: { icon: '🎯', color: 'blue', bgColor: 'bg-blue-50', textColor: 'text-blue-700' },
  negotiating: { icon: '💼', color: 'yellow', bgColor: 'bg-yellow-50', textColor: 'text-yellow-700' },
  won: { icon: '🎉', color: 'green', bgColor: 'bg-green-50', textColor: 'text-green-700' },
  lost: { icon: '❌', color: 'red', bgColor: 'bg-red-50', textColor: 'text-red-700' },
  deferred: { icon: '⏸️', color: 'purple', bgColor: 'bg-accent-50', textColor: 'text-accent-700' },
};

export default function OverviewTab({ organization, orgId }: OverviewTabProps) {
  const [showExtensions, setShowExtensions] = useState(false);
  const [dealData, setDealData] = useState<any>(null);
  const [showDealModal, setShowDealModal] = useState(false);
  const [queryCount, setQueryCount] = useState<number>(0);
  const [isRefreshingHealth, setIsRefreshingHealth] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    fetchDealData();
    fetchQueryCount();
  }, [orgId]);

  const fetchDealData = async () => {
    try {
      const { data, error } = await supabase
        .from('org_deal_tracking')
        .select('*')
        .eq('org_id', orgId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching deal data:', error);
        return;
      }
      setDealData(data || null);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchQueryCount = async () => {
    try {
      const { count, error } = await supabase
        .from('platform_queries')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId);

      if (error) {
        console.error('Error fetching query count:', error);
        return;
      }
      setQueryCount(count || 0);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const refreshHealthScore = async () => {
    setIsRefreshingHealth(true);
    try {
      const response = await fetch('/api/trials/bulk-operations/health-scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_ids: [orgId], mode: 'selected' }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Health score updated');
        // Trigger a re-fetch of the organization data by reloading
        window.location.reload();
      } else {
        toast.error(data.error || 'Failed to refresh health score');
      }
    } catch (error) {
      console.error('Error refreshing health score:', error);
      toast.error('Failed to refresh health score');
    } finally {
      setIsRefreshingHealth(false);
    }
  };

  if (!organization) {
    return <div className="text-gray-500">Loading...</div>;
  }

  const daysRemaining = organization.trial_expiry_date
    ? differenceInDays(new Date(organization.trial_expiry_date), new Date())
    : null;

  const getTrialHealthColor = () => {
    if (!daysRemaining) return 'text-gray-600 bg-gray-100';
    if (daysRemaining < 0) return 'text-red-600 bg-red-100';
    if (daysRemaining <= 3) return 'text-orange-600 bg-orange-100';
    if (daysRemaining <= 7) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  const getHealthStatusConfig = (status: string) => {
    switch (status) {
      case 'healthy':
        return { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-100', border: 'border-emerald-200', gradient: 'from-emerald-50 to-green-50' };
      case 'warning':
        return { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-100', border: 'border-amber-200', gradient: 'from-amber-50 to-yellow-50' };
      case 'at-risk':
        return { icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-100', border: 'border-orange-200', gradient: 'from-orange-50 to-red-50' };
      case 'critical':
        return { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100', border: 'border-red-200', gradient: 'from-red-50 to-rose-50' };
      default:
        return { icon: Activity, color: 'text-gray-600', bg: 'bg-gray-100', border: 'border-gray-200', gradient: 'from-gray-50 to-slate-50' };
    }
  };

  const getEngagementScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600';
    if (score >= 60) return 'text-amber-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Trial Health Dashboard */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Trial Health</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Days Remaining */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${getTrialHealthColor()} flex items-center justify-center`}>
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-gray-600 font-medium">Days Remaining</p>
                <p className="text-2xl font-bold text-gray-900">
                  {daysRemaining !== null ? (daysRemaining < 0 ? 'Expired' : daysRemaining) : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Trial Status */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-gray-600 font-medium">Trial Status</p>
                <p className="text-lg font-bold text-gray-900 capitalize">
                  {organization.trial_status || organization.lifecycle_stage || 'Active'}
                </p>
              </div>
            </div>
          </div>

          {/* Expiry Date */}
          {organization.trial_expiry_date && (
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent-100 text-accent-700 flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-medium">Expiry Date</p>
                  <p className="text-sm font-bold text-gray-900">
                    {format(new Date(organization.trial_expiry_date), 'MMM dd, yyyy')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Platform Queries */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                <Search className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-gray-600 font-medium">Platform Queries</p>
                <p className="text-2xl font-bold text-gray-900">{queryCount}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Health Score Dashboard */}
      {organization.health_status || organization.engagement_score !== undefined ? (
        <div className={`bg-gradient-to-br ${getHealthStatusConfig(organization.health_status).gradient} rounded-xl p-6 border ${getHealthStatusConfig(organization.health_status).border}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-gray-700" />
              <h3 className="text-lg font-semibold text-gray-900">AI Health Score</h3>
            </div>
            <div className="flex items-center gap-3">
              {organization.last_health_check && (
                <span className="text-xs text-gray-500">
                  Updated {formatDistanceToNow(new Date(organization.last_health_check), { addSuffix: true })}
                </span>
              )}
              <button
                onClick={refreshHealthScore}
                disabled={isRefreshingHealth}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
              >
                {isRefreshingHealth ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCcw className="w-3.5 h-3.5" />
                )}
                {isRefreshingHealth ? 'Analyzing...' : 'Refresh'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* Health Status */}
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-3">
                {(() => {
                  const StatusIcon = getHealthStatusConfig(organization.health_status).icon;
                  return (
                    <div className={`w-10 h-10 rounded-lg ${getHealthStatusConfig(organization.health_status).bg} ${getHealthStatusConfig(organization.health_status).color} flex items-center justify-center`}>
                      <StatusIcon className="w-5 h-5" />
                    </div>
                  );
                })()}
                <div>
                  <p className="text-xs text-gray-600 font-medium">Health Status</p>
                  <p className={`text-lg font-bold capitalize ${getHealthStatusConfig(organization.health_status).color}`}>
                    {organization.health_status?.replace('-', ' ') || 'Not analyzed'}
                  </p>
                </div>
              </div>
            </div>

            {/* Engagement Score */}
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-medium">Engagement Score</p>
                  <p className={`text-2xl font-bold ${getEngagementScoreColor(organization.engagement_score || 0)}`}>
                    {organization.engagement_score ?? '--'}
                    <span className="text-sm font-normal text-gray-500">/100</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Issues Count */}
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${organization.health_issues?.length > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'} flex items-center justify-center`}>
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-medium">Active Issues</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {organization.health_issues?.length || 0}
                  </p>
                </div>
              </div>
            </div>

            {/* Recommendations Count */}
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Lightbulb className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-medium">Recommendations</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {organization.health_recommendations?.length || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Issues & Recommendations Details */}
          {(organization.health_issues?.length > 0 || organization.health_recommendations?.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Issues */}
              {organization.health_issues?.length > 0 && (
                <div className="bg-white rounded-lg p-4 border border-red-200">
                  <h4 className="text-sm font-semibold text-red-800 mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    Issues to Address
                  </h4>
                  <ul className="space-y-1.5">
                    {organization.health_issues.slice(0, 4).map((issue: string, i: number) => (
                      <li key={i} className="text-sm text-red-700 flex items-start gap-2">
                        <span className="text-red-400 mt-0.5">•</span>
                        {issue}
                      </li>
                    ))}
                    {organization.health_issues.length > 4 && (
                      <li className="text-xs text-red-500 italic">
                        +{organization.health_issues.length - 4} more issues
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              {organization.health_recommendations?.length > 0 && (
                <div className="bg-white rounded-lg p-4 border border-blue-200">
                  <h4 className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-1.5">
                    <Lightbulb className="w-4 h-4" />
                    Recommendations
                  </h4>
                  <ul className="space-y-1.5">
                    {organization.health_recommendations.slice(0, 4).map((rec: string, i: number) => (
                      <li key={i} className="text-sm text-blue-700 flex items-start gap-2">
                        <span className="text-blue-400 mt-0.5">•</span>
                        {rec}
                      </li>
                    ))}
                    {organization.health_recommendations.length > 4 && (
                      <li className="text-xs text-blue-500 italic">
                        +{organization.health_recommendations.length - 4} more recommendations
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* No Health Data - Show prompt to run analysis */
        <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-gray-700" />
              <h3 className="text-lg font-semibold text-gray-900">AI Health Score</h3>
            </div>
          </div>
          <div className="text-center py-6">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
              <Activity className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-gray-600 mb-3">No health analysis available yet</p>
            <button
              onClick={refreshHealthScore}
              disabled={isRefreshingHealth}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {isRefreshingHealth ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Run AI Analysis
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Inline Enrichment Prompts - Show when data is missing */}
      {!organization.deal_momentum && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DealMomentumPrompt
            orgId={orgId}
            currentValue={organization.deal_momentum}
            onUpdate={() => {
              // Parent component should refetch
            }}
          />
        </div>
      )}

      {/* myRA AI Activity Widget */}
      <MyraUsageWidget orgId={orgId} variant="compact" />

      {/* Quick Actions */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-600" />
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Demos Tracking */}
          <Link
            href={`/support/trials/demos?org_id=${orgId}`}
            className="group bg-gradient-to-br from-accent-50 to-pink-50 rounded-lg p-4 border border-accent-200 hover:shadow-lg hover:scale-105 transition-all duration-200"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-accent-600 text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                <Video className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Demos</p>
                <p className="text-xs text-gray-600">Track demo sessions</p>
              </div>
            </div>
          </Link>

          {/* Follow-ups Management */}
          <Link
            href={`/support/trials/follow-ups?org_id=${orgId}`}
            className="group bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg p-4 border border-amber-200 hover:shadow-lg hover:scale-105 transition-all duration-200"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-amber-600 text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                <CalendarClock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Follow-ups</p>
                <p className="text-xs text-gray-600">Scheduled reminders</p>
              </div>
            </div>
          </Link>

          {/* Meetings */}
          <Link
            href={`/support/trials/meetings?org_id=${orgId}`}
            className="group bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-4 border border-blue-200 hover:shadow-lg hover:scale-105 transition-all duration-200"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-blue-600 text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Meetings</p>
                <p className="text-xs text-gray-600">Meeting logs & notes</p>
              </div>
            </div>
          </Link>

          {/* AI Parser */}
          <Link
            href={`/support/trials/parse?org_id=${orgId}`}
            className="group bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg p-4 border border-emerald-200 hover:shadow-lg hover:scale-105 transition-all duration-200"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-emerald-600 text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">AI Parser</p>
                <p className="text-xs text-gray-600">Extract insights</p>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Deal Status Widget (Optional) */}
      {dealData && (
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-gray-700" />
              <h3 className="text-lg font-semibold text-gray-900">Deal Status</h3>
            </div>
            <button
              onClick={() => setShowDealModal(true)}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Update Status
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Current Status */}
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg ${DEAL_STATUS_CONFIG[dealData.deal_status]?.bgColor || 'bg-gray-100'} ${DEAL_STATUS_CONFIG[dealData.deal_status]?.textColor || 'text-gray-700'} flex items-center justify-center text-xl`}>
                  {DEAL_STATUS_CONFIG[dealData.deal_status]?.icon || '📊'}
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-600 font-medium">Status</p>
                  <p className="text-base font-bold text-gray-900 capitalize">
                    {dealData.deal_status.replace('_', ' ')}
                  </p>
                </div>
              </div>
            </div>

            {/* Opportunity Value */}
            {dealData.opportunity_value && (
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-600 font-medium">Opportunity Value</p>
                    <p className="text-base font-bold text-gray-900">
                      {dealData.deal_currency || 'USD'} {dealData.opportunity_value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Deal Value (Won) */}
            {dealData.deal_status === 'won' && dealData.deal_value && (
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 text-green-700 flex items-center justify-center">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-600 font-medium">Final Deal Value</p>
                    <p className="text-base font-bold text-gray-900">
                      {dealData.deal_currency || 'USD'} {dealData.deal_value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Follow-up Date (Deferred) */}
            {dealData.deal_status === 'deferred' && dealData.expected_followup_date && (
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent-100 text-accent-700 flex items-center justify-center">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-600 font-medium">Follow-up Date</p>
                    <p className="text-sm font-bold text-gray-900">
                      {format(new Date(dealData.expected_followup_date), 'MMM dd, yyyy')}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Organization Details */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Organization Details</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-600">Organization Name</label>
              <p className="text-base font-semibold text-gray-900 mt-1">{organization.org_name}</p>
            </div>

            {organization.org_domain && (
              <div>
                <label className="text-sm font-medium text-gray-600">Domain</label>
                <p className="text-base text-gray-900 mt-1">
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-sm font-medium">
                    {organization.org_domain}
                  </span>
                </p>
              </div>
            )}

            {organization.account_manager && (
              <div>
                <label className="text-sm font-medium text-gray-600">Account Manager</label>
                <p className="text-base text-gray-900 mt-1">{organization.account_manager}</p>
              </div>
            )}

            {organization.sales_poc && (
              <div>
                <label className="text-sm font-medium text-gray-600">Sales POC</label>
                <p className="text-base text-gray-900 mt-1">{organization.sales_poc}</p>
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            {organization.trial_request_date && (
              <div>
                <label className="text-sm font-medium text-gray-600">Trial Requested</label>
                <p className="text-base text-gray-900 mt-1">
                  {format(new Date(organization.trial_request_date), 'MMM dd, yyyy')}
                </p>
              </div>
            )}

            {organization.trial_access_provided_date && (
              <div>
                <label className="text-sm font-medium text-gray-600">Access Provided</label>
                <p className="text-base text-gray-900 mt-1">
                  {format(new Date(organization.trial_access_provided_date), 'MMM dd, yyyy')}
                </p>
              </div>
            )}

            {organization.org_url && (
              <div>
                <label className="text-sm font-medium text-gray-600">Organization URL</label>
                <a
                  href={organization.org_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-base text-blue-600 hover:text-blue-700 mt-1 flex items-center gap-1"
                >
                  <Globe className="w-4 h-4" />
                  {organization.org_url}
                </a>
              </div>
            )}

            {organization.description && (
              <div>
                <label className="text-sm font-medium text-gray-600">Description</label>
                <p className="text-sm text-gray-700 mt-1">{organization.description}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Trial Extensions Section */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-gray-700" />
            <h3 className="text-lg font-semibold text-gray-900">Trial Extensions</h3>
          </div>
          <button
            onClick={() => setShowExtensions(!showExtensions)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            {showExtensions ? 'Hide' : 'View All'}
          </button>
        </div>

        {showExtensions ? (
          <TrialExtensionsTab
            orgId={orgId}
            currentTrialExpiry={organization.trial_expiry_date}
          />
        ) : (
          <p className="text-sm text-gray-600">
            Click "View All" to see trial extension history and manage extensions
          </p>
        )}
      </div>

      {/* Deal Status Update Modal */}
      {dealData && (
        <UpdateDealStatusModal
          orgId={orgId}
          isOpen={showDealModal}
          onClose={() => setShowDealModal(false)}
          onSuccess={fetchDealData}
          currentDealStatus={dealData.deal_status}
        />
      )}
    </div>
  );
}
