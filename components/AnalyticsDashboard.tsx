'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';

interface AnalyticsDashboardProps {
  orgId: string;
}

export default function AnalyticsDashboard({ orgId }: AnalyticsDashboardProps) {
  const [roadmapAnalytics, setRoadmapAnalytics] = useState<any>(null);
  const [featureAnalytics, setFeatureAnalytics] = useState<any>(null);
  const [followupAnalytics, setFollowupAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    fetchAnalytics();
  }, [orgId]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // Roadmap Analytics
      const { data: roadmapData } = await supabase
        .from('org_product_roadmap')
        .select('*')
        .eq('org_id', orgId);

      if (roadmapData) {
        const roadmapStats = {
          total: roadmapData.length,
          planned: roadmapData.filter((r: any) => r.status === 'planned').length,
          inProgress: roadmapData.filter((r: any) => r.status === 'in_progress').length,
          completed: roadmapData.filter((r: any) => r.status === 'completed').length,
          cancelled: roadmapData.filter((r: any) => r.status === 'cancelled').length,
          byPriority: {
            critical: roadmapData.filter((r: any) => r.priority === 'critical').length,
            high: roadmapData.filter((r: any) => r.priority === 'high').length,
            medium: roadmapData.filter((r: any) => r.priority === 'medium').length,
            low: roadmapData.filter((r: any) => r.priority === 'low').length,
          },
          completionRate:
            roadmapData.length > 0
              ? Math.round(
                  (roadmapData.filter((r: any) => r.status === 'completed').length / roadmapData.length) * 100
                )
              : 0,
        };
        setRoadmapAnalytics(roadmapStats);
      }

      // Feature Requests Analytics
      const { data: featureData } = await supabase
        .from('feature_requests')
        .select('*')
        .eq('org_id', orgId);

      if (featureData) {
        const featureStats = {
          total: featureData.length,
          submitted: featureData.filter((f: any) => f.status === 'submitted').length,
          reviewed: featureData.filter((f: any) => f.status === 'reviewed').length,
          planned: featureData.filter((f: any) => f.status === 'planned').length,
          inProgress: featureData.filter((f: any) => f.status === 'in_progress').length,
          completed: featureData.filter((f: any) => f.status === 'completed').length,
          totalVotes: featureData.reduce((sum: number, f: any) => sum + (f.votes || 0), 0),
          avgVotes:
            featureData.length > 0
              ? Math.round(featureData.reduce((sum: number, f: any) => sum + (f.votes || 0), 0) / featureData.length)
              : 0,
          highestVoted:
            featureData.length > 0
              ? featureData.reduce((max: any, f: any) => (f.votes > (max?.votes || 0) ? f : max), null)
              : null,
        };
        setFeatureAnalytics(featureStats);
      }

      // Follow-up Analytics
      const { data: followupData } = await supabase
        .from('followup_schedules')
        .select('*')
        .eq('org_id', orgId);

      if (followupData) {
        const now = new Date();
        const followupStats = {
          total: followupData.length,
          scheduled: followupData.filter((f: any) => f.status === 'scheduled').length,
          pending: followupData.filter((f: any) => f.status === 'pending').length,
          completed: followupData.filter((f: any) => f.status === 'completed').length,
          cancelled: followupData.filter((f: any) => f.status === 'cancelled').length,
          overdue: followupData.filter((f: any) => {
            const followupDate = new Date(f.followup_date);
            return followupDate < now && f.status !== 'completed' && f.status !== 'cancelled';
          }).length,
          completionRate:
            followupData.length > 0
              ? Math.round(
                  (followupData.filter((f: any) => f.status === 'completed').length / followupData.length) * 100
                )
              : 0,
        };
        setFollowupAnalytics(followupStats);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-2">
          <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-sm text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Analytics Dashboard</h3>
        <p className="text-sm text-gray-600 mt-1">Insights and metrics across all features</p>
      </div>

      {/* ROADMAP ANALYTICS */}
      {roadmapAnalytics && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 p-6 space-y-4">
          <h4 className="text-base font-bold text-gray-900">📋 Product Roadmap Analytics</h4>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
              <p className="text-xs font-medium text-blue-700 mb-1">Total Items</p>
              <p className="text-2xl font-bold text-blue-900">{roadmapAnalytics.total}</p>
            </div>
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200 rounded-lg p-4">
              <p className="text-xs font-medium text-yellow-700 mb-1">In Progress</p>
              <p className="text-2xl font-bold text-yellow-900">{roadmapAnalytics.inProgress}</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
              <p className="text-xs font-medium text-green-700 mb-1">Completed</p>
              <p className="text-2xl font-bold text-green-900">{roadmapAnalytics.completed}</p>
            </div>
            <div className="bg-gradient-to-br from-accent-50 to-purple-100 border border-accent-200 rounded-lg p-4">
              <p className="text-xs font-medium text-accent-700 mb-1">Planned</p>
              <p className="text-2xl font-bold text-purple-900">{roadmapAnalytics.planned}</p>
            </div>
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200 rounded-lg p-4">
              <p className="text-xs font-medium text-indigo-700 mb-1">Completion %</p>
              <p className="text-2xl font-bold text-indigo-900">{roadmapAnalytics.completionRate}%</p>
            </div>
          </div>

          <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm font-semibold text-gray-900 mb-3">By Priority</p>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700">🚨 Critical</span>
                <div className="flex-1 mx-3 bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-red-600 h-full"
                    style={{
                      width: `${roadmapAnalytics.total > 0 ? (roadmapAnalytics.byPriority.critical / roadmapAnalytics.total) * 100 : 0}%`,
                    }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-gray-900">{roadmapAnalytics.byPriority.critical}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700">🔴 High</span>
                <div className="flex-1 mx-3 bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-orange-600 h-full"
                    style={{
                      width: `${roadmapAnalytics.total > 0 ? (roadmapAnalytics.byPriority.high / roadmapAnalytics.total) * 100 : 0}%`,
                    }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-gray-900">{roadmapAnalytics.byPriority.high}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700">🟡 Medium</span>
                <div className="flex-1 mx-3 bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-yellow-600 h-full"
                    style={{
                      width: `${roadmapAnalytics.total > 0 ? (roadmapAnalytics.byPriority.medium / roadmapAnalytics.total) * 100 : 0}%`,
                    }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-gray-900">{roadmapAnalytics.byPriority.medium}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700">🟢 Low</span>
                <div className="flex-1 mx-3 bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-green-600 h-full"
                    style={{
                      width: `${roadmapAnalytics.total > 0 ? (roadmapAnalytics.byPriority.low / roadmapAnalytics.total) * 100 : 0}%`,
                    }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-gray-900">{roadmapAnalytics.byPriority.low}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FEATURE REQUESTS ANALYTICS */}
      {featureAnalytics && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 p-6 space-y-4">
          <h4 className="text-base font-bold text-gray-900">💡 Feature Requests Analytics</h4>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
              <p className="text-xs font-medium text-blue-700 mb-1">Total Requests</p>
              <p className="text-2xl font-bold text-blue-900">{featureAnalytics.total}</p>
            </div>
            <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 border border-cyan-200 rounded-lg p-4">
              <p className="text-xs font-medium text-cyan-700 mb-1">Total Votes</p>
              <p className="text-2xl font-bold text-cyan-900">{featureAnalytics.totalVotes}</p>
            </div>
            <div className="bg-gradient-to-br from-pink-50 to-pink-100 border border-pink-200 rounded-lg p-4">
              <p className="text-xs font-medium text-pink-700 mb-1">Avg Votes</p>
              <p className="text-2xl font-bold text-pink-900">{featureAnalytics.avgVotes}</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
              <p className="text-xs font-medium text-green-700 mb-1">Completed</p>
              <p className="text-2xl font-bold text-green-900">{featureAnalytics.completed}</p>
            </div>
            <div className="bg-gradient-to-br from-accent-50 to-purple-100 border border-accent-200 rounded-lg p-4">
              <p className="text-xs font-medium text-accent-700 mb-1">In Progress</p>
              <p className="text-2xl font-bold text-purple-900">{featureAnalytics.inProgress}</p>
            </div>
          </div>

          {featureAnalytics.highestVoted && (
            <div className="mt-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-200">
              <p className="text-sm font-semibold text-amber-900 mb-2">👑 Most Voted Feature</p>
              <p className="text-sm text-amber-800">
                <span className="font-bold">{featureAnalytics.highestVoted.title}</span>
              </p>
              <p className="text-xs text-amber-700 mt-1">
                {featureAnalytics.highestVoted.votes} 👍 votes
              </p>
            </div>
          )}

          <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm font-semibold text-gray-900 mb-3">Status Distribution</p>
            <div className="space-y-2">
              {[
                ['📬', 'Submitted', featureAnalytics.submitted],
                ['👀', 'Reviewed', featureAnalytics.reviewed],
                ['📋', 'Planned', featureAnalytics.planned],
                ['🚀', 'In Progress', featureAnalytics.inProgress],
                ['✅', 'Completed', featureAnalytics.completed],
              ].map(([icon, label, count]: any) => (
                <div key={label} className="flex justify-between items-center">
                  <span className="text-sm text-gray-700">
                    {icon} {label}
                  </span>
                  <div className="flex-1 mx-3 bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-600 h-full"
                      style={{
                        width: `${featureAnalytics.total > 0 ? (count / featureAnalytics.total) * 100 : 0}%`,
                      }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* FOLLOW-UP ANALYTICS */}
      {followupAnalytics && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 p-6 space-y-4">
          <h4 className="text-base font-bold text-gray-900">📅 Follow-up Scheduling Analytics</h4>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
              <p className="text-xs font-medium text-blue-700 mb-1">Total Follow-ups</p>
              <p className="text-2xl font-bold text-blue-900">{followupAnalytics.total}</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
              <p className="text-xs font-medium text-green-700 mb-1">Completed</p>
              <p className="text-2xl font-bold text-green-900">{followupAnalytics.completed}</p>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-lg p-4">
              <p className="text-xs font-medium text-red-700 mb-1">Overdue</p>
              <p className="text-2xl font-bold text-red-900">{followupAnalytics.overdue}</p>
            </div>
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200 rounded-lg p-4">
              <p className="text-xs font-medium text-indigo-700 mb-1">Completion %</p>
              <p className="text-2xl font-bold text-indigo-900">{followupAnalytics.completionRate}%</p>
            </div>
          </div>

          <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm font-semibold text-gray-900 mb-3">Status Breakdown</p>
            <div className="space-y-2">
              {[
                ['📅', 'Scheduled', followupAnalytics.scheduled, 'blue'],
                ['⏰', 'Pending', followupAnalytics.pending, 'yellow'],
                ['✅', 'Completed', followupAnalytics.completed, 'green'],
                ['❌', 'Cancelled', followupAnalytics.cancelled, 'gray'],
              ].map(([icon, label, count, color]: any) => (
                <div key={label} className="flex justify-between items-center">
                  <span className="text-sm text-gray-700">
                    {icon} {label}
                  </span>
                  <div className="flex-1 mx-3 bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className={`${
                        color === 'blue'
                          ? 'bg-blue-600'
                          : color === 'yellow'
                          ? 'bg-yellow-600'
                          : color === 'green'
                          ? 'bg-green-600'
                          : 'bg-gray-600'
                      } h-full`}
                      style={{
                        width: `${followupAnalytics.total > 0 ? (count / followupAnalytics.total) * 100 : 0}%`,
                      }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
