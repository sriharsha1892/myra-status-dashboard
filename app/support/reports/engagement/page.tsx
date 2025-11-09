'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/lib/supabase/types';
import { ResponsiveContainer, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { format, subDays, startOfDay, differenceInDays, parseISO } from 'date-fns';
import Breadcrumbs from '@/components/Breadcrumbs';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

type TrialUser = Database['public']['Tables']['trial_users']['Row'];
type UserActivity = Database['public']['Tables']['user_activity_log']['Row'];
type TrialOrganization = Database['public']['Tables']['trial_organizations']['Row'];

interface HeatmapData {
  day: string;
  hours: number[];
}

interface UserCohort {
  type: 'power' | 'growing' | 'dormant' | 'new';
  count: number;
  users: TrialUser[];
  description: string;
}

export default function EngagementWavesPage() {
  const { user, loading: authLoading, role } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [trialUsers, setTrialUsers] = useState<TrialUser[]>([]);
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [organizations, setOrganizations] = useState<TrialOrganization[]>([]);
  const [timeRange, setTimeRange] = useState<'7' | '30' | '90'>('30');
  const [viewMode, setViewMode] = useState<'all' | 'my_portfolio'>('all');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/support/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && (role?.toLowerCase() === 'team' || role?.toLowerCase() === 'admin' || role?.toLowerCase() === 'account_manager')) {
      fetchData();
    }
  }, [user, role, timeRange, viewMode]);

  const fetchData = async () => {
    const supabase = createClient();
    setLoading(true);

    try {
      // Fetch trial organizations
      const { data: orgsData, error: orgsError } = await supabase
        .from('trial_organizations')
        .select('*');

      if (orgsError) throw orgsError;

      // Filter by account manager if in "my_portfolio" mode
      let filteredOrgs = orgsData || [];
      if (viewMode === 'my_portfolio' && role?.toLowerCase() !== 'admin') {
        // For now, filter by account_manager field matching user email or name
        // You might need to adjust this logic based on how account_manager is stored
        filteredOrgs = filteredOrgs.filter(org =>
          org.account_manager === user?.email || org.account_manager === user?.id
        );
      }

      setOrganizations(filteredOrgs);

      // Get org IDs for filtering users
      const orgIds = filteredOrgs.map(org => org.org_id);

      if (orgIds.length === 0) {
        setTrialUsers([]);
        setActivities([]);
        setLoading(false);
        return;
      }

      // Fetch trial users for these organizations
      const { data: usersData, error: usersError } = await supabase
        .from('trial_users')
        .select('*')
        .in('org_id', orgIds);

      if (usersError) throw usersError;
      setTrialUsers(usersData || []);

      // Fetch user activities within time range
      const daysAgo = parseInt(timeRange);
      const cutoffDate = subDays(new Date(), daysAgo).toISOString();

      const userIds = (usersData || []).map(u => u.user_id);

      if (userIds.length > 0) {
        const { data: activitiesData, error: activitiesError } = await supabase
          .from('user_activity_log')
          .select('*')
          .in('user_id', userIds)
          .gte('activity_timestamp', cutoffDate)
          .order('activity_timestamp', { ascending: false });

        if (activitiesError) throw activitiesError;
        setActivities(activitiesData || []);
      } else {
        setActivities([]);
      }
    } catch (error: any) {
      console.error('Error fetching engagement data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate user cohorts
  const cohorts = useMemo((): UserCohort[] => {
    if (trialUsers.length === 0) return [];

    const now = new Date();
    const daysAgo = parseInt(timeRange);
    const cutoffDate = subDays(now, daysAgo);

    // Categorize users
    const powerUsers: TrialUser[] = [];
    const growingUsers: TrialUser[] = [];
    const dormantUsers: TrialUser[] = [];
    const newUsers: TrialUser[] = [];

    trialUsers.forEach(user => {
      const createdAt = parseISO(user.created_at);
      const daysSinceCreation = differenceInDays(now, createdAt);
      const isNew = daysSinceCreation <= 7;

      // Count activities for this user in the time range
      const userActivities = activities.filter(a => a.user_id === user.user_id);
      const activityCount = userActivities.length;

      // Calculate activity in first half vs second half of period
      const midpointDate = subDays(now, daysAgo / 2);
      const recentActivities = userActivities.filter(a =>
        parseISO(a.activity_timestamp) >= midpointDate
      );
      const olderActivities = userActivities.filter(a =>
        parseISO(a.activity_timestamp) < midpointDate
      );

      const isGrowing = recentActivities.length > olderActivities.length && activityCount > 5;

      if (isNew) {
        newUsers.push(user);
      } else if (user.login_count >= 20 || user.queries_executed >= 50 || user.is_champion) {
        powerUsers.push(user);
      } else if (isGrowing) {
        growingUsers.push(user);
      } else if (user.user_status === 'inactive' || (user.last_login_date && differenceInDays(now, parseISO(user.last_login_date)) > 7)) {
        dormantUsers.push(user);
      } else {
        growingUsers.push(user); // Default to growing if not categorized
      }
    });

    return [
      {
        type: 'power',
        count: powerUsers.length,
        users: powerUsers,
        description: 'Top 20% users by activity. 20+ logins or 50+ queries or marked as champions.'
      },
      {
        type: 'growing',
        count: growingUsers.length,
        users: growingUsers,
        description: 'Users with increasing activity trend. More active in recent period.'
      },
      {
        type: 'dormant',
        count: dormantUsers.length,
        users: dormantUsers,
        description: 'Users with no recent activity. Inactive status or no login in 7+ days.'
      },
      {
        type: 'new',
        count: newUsers.length,
        users: newUsers,
        description: 'Recently added users. Created within last 7 days.'
      }
    ];
  }, [trialUsers, activities, timeRange]);

  // Calculate activity heatmap data
  const heatmapData = useMemo((): HeatmapData[] => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const data: HeatmapData[] = days.map(day => ({
      day,
      hours: new Array(24).fill(0)
    }));

    activities.forEach(activity => {
      const date = parseISO(activity.activity_timestamp);
      const dayOfWeek = date.getDay();
      const hour = date.getHours();
      data[dayOfWeek].hours[hour]++;
    });

    return data;
  }, [activities]);

  // Get max activity for color scaling
  const maxActivity = useMemo(() => {
    let max = 0;
    heatmapData.forEach(day => {
      day.hours.forEach(count => {
        if (count > max) max = count;
      });
    });
    return max;
  }, [heatmapData]);

  // Get color based on activity count
  const getHeatmapColor = (count: number) => {
    if (count === 0) return '#f3f4f6'; // gray-100
    const intensity = count / maxActivity;
    if (intensity < 0.25) return '#dbeafe'; // blue-100
    if (intensity < 0.5) return '#93c5fd'; // blue-300
    if (intensity < 0.75) return '#3b82f6'; // blue-500
    return '#1e40af'; // blue-800
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-sm text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!user || (role?.toLowerCase() !== 'team' && role?.toLowerCase() !== 'admin' && role?.toLowerCase() !== 'account_manager')) {
    return null;
  }

  return (
    <main className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-50 via-blue-50/20 to-purple-50/10 min-h-screen">
      {/* Header */}
      <header className="bg-white/70 backdrop-blur-2xl border-b border-white/20 shadow-lg sticky top-0 z-20">
        <div className="px-8 py-6">
          <Breadcrumbs items={[
            { label: 'Dashboard', href: '/support/dashboard' },
            { label: 'Reports', href: '/support/reports' },
            { label: 'Engagement Waves' }
          ]} />
          <div className="flex items-center justify-between mt-3">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Link
                  href="/support/reports"
                  className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-slate-600" />
                </Link>
                <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Engagement Waves</h2>
              </div>
              <p className="text-sm text-slate-600 ml-14">
                How users interact with your product - patterns, cohorts, and behaviors
              </p>
            </div>

            {/* Access Control Toggle */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-1">
                <button
                  onClick={() => setViewMode('all')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                    viewMode === 'all'
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All Trials
                </button>
                <button
                  onClick={() => setViewMode('my_portfolio')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                    viewMode === 'my_portfolio'
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  My Portfolio
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Page Content */}
      <div className="p-8 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="relative">
              <div className="w-20 h-20">
                <div className="absolute inset-0 border-4 border-blue-200 rounded-full animate-ping opacity-20"></div>
                <div className="absolute inset-0 border-4 border-t-blue-600 border-r-purple-600 border-b-pink-600 border-l-blue-600 rounded-full animate-spin"></div>
              </div>
              <p className="mt-6 text-sm font-medium text-slate-600 text-center">Loading analytics...</p>
            </div>
          </div>
        ) : trialUsers.length === 0 ? (
          <div className="flex items-center justify-center py-32">
            <div className="text-center">
              <p className="text-lg font-medium text-slate-700">No trial users found</p>
              <p className="text-sm text-slate-500 mt-2">
                {viewMode === 'my_portfolio'
                  ? 'No users assigned to your portfolio yet.'
                  : 'No trial users in the system yet.'}
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Time Range Filter */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Activity Overview</h3>
                <p className="text-sm text-slate-500">
                  Showing {trialUsers.length} users with {activities.length} activities
                </p>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-slate-600">Time Range:</label>
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value as any)}
                  className="px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm"
                >
                  <option value="7">Last 7 Days</option>
                  <option value="30">Last 30 Days</option>
                  <option value="90">Last 90 Days</option>
                </select>
              </div>
            </div>

            {/* User Cohorts */}
            <div className="grid grid-cols-4 gap-6">
              {cohorts.map((cohort) => (
                <div
                  key={cohort.type}
                  className={`relative overflow-hidden rounded-2xl backdrop-blur-xl bg-white/90 border border-white/30 p-6 shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${
                    cohort.type === 'power' ? 'border-l-4 border-l-blue-600' :
                    cohort.type === 'growing' ? 'border-l-4 border-l-green-600' :
                    cohort.type === 'dormant' ? 'border-l-4 border-l-gray-400' :
                    'border-l-4 border-l-purple-600'
                  }`}
                >
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      {cohort.type === 'power' ? 'Power Users' :
                       cohort.type === 'growing' ? 'Growing Users' :
                       cohort.type === 'dormant' ? 'Dormant Users' :
                       'New Users'}
                    </p>
                    <p className="text-4xl font-bold text-slate-900 tracking-tight mb-3">
                      {cohort.count}
                    </p>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {cohort.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Activity Heatmap */}
            <div className="bg-white/80 backdrop-blur-sm border border-gray-200/60 rounded-2xl shadow-lg p-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-1">Activity Heatmap</h3>
                <p className="text-sm text-slate-500">When users are most active (Day of Week × Hour)</p>
              </div>

              {activities.length === 0 ? (
                <div className="h-[400px] flex items-center justify-center text-sm text-gray-500">
                  No activity data available for this period
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <div className="min-w-[800px]">
                    {/* Hour labels */}
                    <div className="flex items-center mb-2">
                      <div className="w-24"></div>
                      <div className="flex-1 flex">
                        {Array.from({ length: 24 }, (_, i) => (
                          <div key={i} className="flex-1 text-center text-xs text-slate-500">
                            {i}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Heatmap rows */}
                    {heatmapData.map((dayData, dayIndex) => (
                      <div key={dayData.day} className="flex items-center mb-1">
                        <div className="w-24 text-sm font-medium text-slate-700">
                          {dayData.day.slice(0, 3)}
                        </div>
                        <div className="flex-1 flex gap-1">
                          {dayData.hours.map((count, hour) => (
                            <div
                              key={hour}
                              className="flex-1 h-8 rounded transition-all hover:ring-2 hover:ring-blue-500 cursor-pointer"
                              style={{ backgroundColor: getHeatmapColor(count) }}
                              title={`${dayData.day} ${hour}:00 - ${count} activities`}
                            />
                          ))}
                        </div>
                      </div>
                    ))}

                    {/* Legend */}
                    <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-600">
                      <span>Less</span>
                      <div className="flex gap-1">
                        <div className="w-6 h-6 rounded" style={{ backgroundColor: '#f3f4f6' }}></div>
                        <div className="w-6 h-6 rounded" style={{ backgroundColor: '#dbeafe' }}></div>
                        <div className="w-6 h-6 rounded" style={{ backgroundColor: '#93c5fd' }}></div>
                        <div className="w-6 h-6 rounded" style={{ backgroundColor: '#3b82f6' }}></div>
                        <div className="w-6 h-6 rounded" style={{ backgroundColor: '#1e40af' }}></div>
                      </div>
                      <span>More</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-6">
              <div className="bg-white/80 backdrop-blur-sm border border-gray-200/60 rounded-2xl shadow-lg p-6">
                <p className="text-sm font-semibold text-slate-600 mb-2">Total Activities</p>
                <p className="text-3xl font-bold text-slate-900">{activities.length}</p>
                <p className="text-xs text-slate-500 mt-1">in last {timeRange} days</p>
              </div>

              <div className="bg-white/80 backdrop-blur-sm border border-gray-200/60 rounded-2xl shadow-lg p-6">
                <p className="text-sm font-semibold text-slate-600 mb-2">Avg Activities per User</p>
                <p className="text-3xl font-bold text-slate-900">
                  {trialUsers.length > 0 ? (activities.length / trialUsers.length).toFixed(1) : '0'}
                </p>
                <p className="text-xs text-slate-500 mt-1">across {trialUsers.length} users</p>
              </div>

              <div className="bg-white/80 backdrop-blur-sm border border-gray-200/60 rounded-2xl shadow-lg p-6">
                <p className="text-sm font-semibold text-slate-600 mb-2">Active Organizations</p>
                <p className="text-3xl font-bold text-slate-900">
                  {new Set(trialUsers.map(u => u.org_id)).size}
                </p>
                <p className="text-xs text-slate-500 mt-1">trial organizations</p>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
