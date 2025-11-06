'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/lib/supabase/types';
import { formatDistanceToNow, format, differenceInDays } from 'date-fns';
import {
  FileText, AlertTriangle, TrendingUp, Building2, Zap,
  Target, ArrowRight, Activity, Sparkles, ChevronRight, Calendar
} from 'lucide-react';
import AtRiskCustomers from '@/components/support/AtRiskCustomers';
import QuickInsights from '@/components/support/QuickInsights';
import SmartRecommendations from '@/components/support/SmartRecommendations';

type Ticket = Database['public']['Tables']['tickets']['Row'];

export default function EnterpriseCommandCenter() {
  const { user, loading: authLoading, role } = useAuth();
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [upcomingDemos, setUpcomingDemos] = useState<any[]>([]);

  const supabase = createClient();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/support/login');
      return;
    }

    if (user && !authLoading) {
      fetchAllData();
    }
  }, [user, authLoading, role, router]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchTickets(),
        fetchOrganizations(),
        fetchUpcomingDemos(),
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTickets = async () => {
    try {
      if (role?.toLowerCase() === 'account_manager') {
        const { data: userOrgs } = await supabase
          .from('trial_organizations')
          .select('org_id')
          .eq('account_manager_id', user?.id);

        const orgIds = (userOrgs || []).map((org: any) => org.org_id);
        if (orgIds.length === 0) {
          setTickets([]);
          return;
        }

        const { data, error } = await supabase
          .from('tickets')
          .select('*')
          .in('trial_org_id', orgIds)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setTickets(data || []);
      } else {
        const { data, error } = await supabase
          .from('tickets')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setTickets(data || []);
      }
    } catch (error: any) {
      console.error('Error fetching tickets:', error);
    }
  };

  const fetchOrganizations = async () => {
    try {
      let query = supabase.from('trial_organizations').select('*').order('created_at', { ascending: false });

      if (role?.toLowerCase() === 'account_manager') {
        query = query.eq('account_manager_id', user?.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setOrganizations(data || []);
    } catch (error: any) {
      console.error('Error fetching organizations:', error);
    }
  };

  const fetchUpcomingDemos = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('meeting_notes')
        .select(`
          *,
          trial_organizations(org_name)
        `)
        .eq('meeting_type', 'demo')
        .gte('meeting_date', today)
        .order('meeting_date', { ascending: true })
        .limit(5);

      if (error) throw error;
      setUpcomingDemos(data || []);
    } catch (error: any) {
      console.error('Error fetching demos:', error);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-600 tracking-tight">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Calculations
  const activeTrials = organizations.filter(o => o.org_lifecycle_stage === 'trial_active').length;
  const criticalTickets = tickets.filter(t => t.priority === 'critical' && t.status !== 'resolved').length;
  const openTickets = tickets.filter(t => t.status !== 'resolved').length;
  const atRiskTrials = organizations.filter(o => {
    if (!o.trial_end_date) return false;
    const daysLeft = differenceInDays(new Date(o.trial_end_date), new Date());
    return daysLeft <= 7 && daysLeft >= 0 && o.org_lifecycle_stage === 'trial_active';
  }).length;

  const userName = user?.email?.split('@')[0] || 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const recentActivity = tickets
    .filter(t => t.status !== 'resolved')
    .slice(0, 5)
    .map(t => ({
      id: t.ticket_id,
      title: t.title,
      priority: t.priority,
      status: t.status,
      created: t.created_at,
    }));

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-transparent to-emerald-50/50" />

        <div className="relative max-w-7xl mx-auto px-6 py-8">
          {/* Greeting Section */}
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mb-1">
              {greeting}, {userName}
            </h1>
            <p className="text-sm text-slate-600">
              {format(new Date(), 'EEEE, MMMM d, yyyy')} · {format(new Date(), 'h:mm a')}
            </p>
          </div>

          {/* Primary Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Active Trials Card */}
            <button
              onClick={() => router.push('/support/trials')}
              className="group relative bg-white rounded-xl border border-slate-200 p-5 hover:border-blue-300 hover:shadow-lg transition-all duration-200 text-left"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-blue-600" strokeWidth={1.5} />
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all duration-200" strokeWidth={1.5} />
              </div>

              <div>
                <div className="text-xs text-slate-600 mb-1 uppercase font-medium tracking-wide">Active Trials</div>
                <div className="text-3xl font-semibold text-slate-900">{activeTrials}</div>
              </div>
            </button>

            {/* Critical Tickets Card - Only show if > 0 */}
            {criticalTickets > 0 && (
              <button
                onClick={() => router.push('/support/tickets?priority=critical')}
                className="group relative bg-white rounded-xl border border-amber-200 p-5 hover:border-amber-300 hover:shadow-lg transition-all duration-200 text-left"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4 text-amber-600" strokeWidth={1.5} />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all duration-200" strokeWidth={1.5} />
                  </div>
                </div>

                <div>
                  <div className="text-xs text-slate-600 mb-1 uppercase font-medium tracking-wide">Critical</div>
                  <div className="text-3xl font-semibold text-slate-900">{criticalTickets}</div>
                </div>
              </button>
            )}

            {/* Open Tickets Card - Only show if > 0 */}
            {openTickets > 0 && (
              <button
                onClick={() => router.push('/support/tickets')}
                className="group relative bg-white rounded-xl border border-slate-200 p-5 hover:border-blue-300 hover:shadow-lg transition-all duration-200 text-left"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-blue-600" strokeWidth={1.5} />
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all duration-200" strokeWidth={1.5} />
                </div>

                <div>
                  <div className="text-xs text-slate-600 mb-1 uppercase font-medium tracking-wide">Open Tickets</div>
                  <div className="text-3xl font-semibold text-slate-900">{openTickets}</div>
                </div>
              </button>
            )}

            {/* At Risk Trials Card - Only show if > 0 */}
            {atRiskTrials > 0 && (
              <div className="relative bg-white rounded-xl border border-amber-200 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
                    <Target className="w-4 h-4 text-amber-600" strokeWidth={1.5} />
                  </div>
                  <div className="px-2 py-0.5 bg-amber-50 border border-amber-200 rounded">
                    <span className="text-xs text-amber-700 font-medium">7D</span>
                  </div>
                </div>

                <div>
                  <div className="text-xs text-slate-600 mb-1 uppercase font-medium tracking-wide">Ending Soon</div>
                  <div className="text-3xl font-semibold text-slate-900">{atRiskTrials}</div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Insights - Fills whitespace with valuable metrics for account managers */}
          <div className="mb-8">
            <QuickInsights userId={user?.id} role={role} />
          </div>

          {/* Two-Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Activity Feed */}
            <div className="lg:col-span-2 space-y-6">
              {/* At-Risk Customers - Customer Health Integration */}
              <AtRiskCustomers />

              {/* Recent Activity */}
              <div className="relative bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                      <Activity className="w-4 h-4 text-blue-600" strokeWidth={1.5} />
                    </div>
                    <h2 className="text-sm font-semibold text-slate-900">Recent Activity</h2>
                  </div>
                  <button
                    onClick={() => router.push('/support/tickets')}
                    className="text-xs text-slate-600 hover:text-blue-600 font-medium transition-colors duration-200 flex items-center gap-1"
                  >
                    View all
                    <ArrowRight className="w-3 h-3" strokeWidth={1.5} />
                  </button>
                </div>

                {recentActivity.length === 0 ? (
                  <div className="py-12 text-center">
                    <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center mx-auto mb-3">
                      <Sparkles className="w-6 h-6 text-slate-400" strokeWidth={1.5} />
                    </div>
                    <p className="text-sm text-slate-600">All clear. No active tickets.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recentActivity.map((activity, idx) => (
                      <button
                        key={activity.id}
                        onClick={() => router.push(`/support/tickets/${activity.id}`)}
                        className="group w-full text-left px-4 py-3 rounded-lg bg-slate-50 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all duration-200"
                        style={{ animationDelay: `${idx * 50}ms` }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              {activity.priority === 'critical' && (
                                <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                              )}
                              <p className="text-sm text-slate-900 font-medium truncate group-hover:text-blue-600 transition-colors duration-200">
                                {activity.title}
                              </p>
                            </div>
                            <p className="text-xs text-slate-500">
                              {formatDistanceToNow(new Date(activity.created), { addSuffix: true })}
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all duration-200 flex-shrink-0" strokeWidth={1.5} />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="relative bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-center gap-2.5 mb-5">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-blue-600" strokeWidth={1.5} />
                  </div>
                  <h2 className="text-sm font-semibold text-slate-900">Quick Actions</h2>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => router.push('/support/trials')}
                    className="group relative bg-slate-50 hover:bg-slate-100 rounded-lg p-4 border border-transparent hover:border-slate-200 transition-all duration-200 text-left"
                  >
                    <Building2 className="w-5 h-5 text-blue-600 mb-2" strokeWidth={1.5} />
                    <p className="text-sm text-slate-900 font-medium mb-0.5">Trial Organizations</p>
                    <p className="text-xs text-slate-600">Manage active trials</p>
                  </button>

                  <button
                    onClick={() => router.push('/support/tickets')}
                    className="group relative bg-slate-50 hover:bg-slate-100 rounded-lg p-4 border border-transparent hover:border-slate-200 transition-all duration-200 text-left"
                  >
                    <FileText className="w-5 h-5 text-blue-600 mb-2" strokeWidth={1.5} />
                    <p className="text-sm text-slate-900 font-medium mb-0.5">Support Tickets</p>
                    <p className="text-xs text-slate-600">View all tickets</p>
                  </button>

                  <button
                    onClick={() => router.push('/support/reports')}
                    className="group relative bg-slate-50 hover:bg-slate-100 rounded-lg p-4 border border-transparent hover:border-slate-200 transition-all duration-200 text-left"
                  >
                    <TrendingUp className="w-5 h-5 text-blue-600 mb-2" strokeWidth={1.5} />
                    <p className="text-sm text-slate-900 font-medium mb-0.5">Analytics</p>
                    <p className="text-xs text-slate-600">Performance insights</p>
                  </button>

                  {role?.toLowerCase() === 'admin' && (
                    <button
                      onClick={() => router.push('/support/admin/roadmap')}
                      className="group relative bg-slate-50 hover:bg-slate-100 rounded-lg p-4 border border-transparent hover:border-slate-200 transition-all duration-200 text-left"
                    >
                      <Target className="w-5 h-5 text-blue-600 mb-2" strokeWidth={1.5} />
                      <p className="text-sm text-slate-900 font-medium mb-0.5">Roadmap</p>
                      <p className="text-xs text-slate-600">Product planning</p>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Upcoming Demos & Insights */}
            <div className="lg:col-span-1 space-y-6">
              {/* Upcoming Demos */}
              {role?.toLowerCase() === 'admin' && upcomingDemos.length > 0 && (
                <div className="relative bg-white rounded-xl border border-slate-200 p-6">
                  <div className="flex items-center gap-2.5 mb-5">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-blue-600" strokeWidth={1.5} />
                    </div>
                    <h2 className="text-sm font-semibold text-slate-900">Upcoming Demos</h2>
                  </div>

                  <div className="space-y-2.5">
                    {upcomingDemos.slice(0, 4).map((demo, idx) => {
                      const demoDate = new Date(demo.meeting_date);
                      const isToday = format(demoDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                      const isTomorrow = differenceInDays(demoDate, new Date()) === 1;

                      return (
                        <button
                          key={demo.meeting_id}
                          onClick={() => router.push(`/support/trials/${demo.org_id}`)}
                          className="group w-full text-left p-3 rounded-lg bg-slate-50 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all duration-200"
                        >
                          <div className="flex items-start justify-between mb-1.5">
                            <p className="text-sm text-slate-900 font-medium group-hover:text-blue-600 transition-colors duration-200">
                              {(demo.trial_organizations as any)?.org_name || 'Unknown Org'}
                            </p>
                            {isToday && (
                              <span className="px-2 py-0.5 bg-blue-100 border border-blue-200 rounded text-xs text-blue-700 font-medium">
                                TODAY
                              </span>
                            )}
                            {isTomorrow && (
                              <span className="px-2 py-0.5 bg-amber-100 border border-amber-200 rounded text-xs text-amber-700 font-medium">
                                TMR
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500">
                            {format(demoDate, 'MMM d, yyyy')} · {demo.conducted_by}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Smart Recommendations - AI-powered contextual insights */}
              <SmartRecommendations userId={user?.id} role={role} />

              {/* Insights */}
              <div className="relative bg-gradient-to-br from-purple-50 via-white to-pink-50 rounded-xl border border-slate-200 p-6">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-purple-600" strokeWidth={1.5} />
                  </div>
                  <h2 className="text-sm font-semibold text-slate-900">Insights</h2>
                </div>

                <div className="space-y-2.5">
                  {criticalTickets > 0 && (
                    <button
                      onClick={() => router.push('/support/tickets?priority=critical')}
                      className="w-full text-left p-3 rounded-lg bg-white hover:bg-slate-50 border border-slate-100 hover:border-amber-200 transition-all duration-200 group"
                    >
                      <p className="text-sm text-slate-900 font-medium mb-1 group-hover:text-amber-700 transition-colors duration-200">
                        {criticalTickets} critical {criticalTickets === 1 ? 'issue' : 'issues'} need attention
                      </p>
                      <p className="text-xs text-slate-600">Review critical tickets →</p>
                    </button>
                  )}

                  {atRiskTrials > 0 && (
                    <button
                      onClick={() => router.push('/support/trials')}
                      className="w-full text-left p-3 rounded-lg bg-white hover:bg-slate-50 border border-slate-100 hover:border-amber-200 transition-all duration-200 group"
                    >
                      <p className="text-sm text-slate-900 font-medium mb-1 group-hover:text-amber-700 transition-colors duration-200">
                        {atRiskTrials} {atRiskTrials === 1 ? 'trial ends' : 'trials end'} within 7 days
                      </p>
                      <p className="text-xs text-slate-600">Check trial status →</p>
                    </button>
                  )}

                  {activeTrials > 0 && criticalTickets === 0 && atRiskTrials === 0 && (
                    <button
                      onClick={() => router.push('/support/trials')}
                      className="w-full text-left p-3 rounded-lg bg-white hover:bg-slate-50 border border-slate-100 hover:border-emerald-200 transition-all duration-200 group"
                    >
                      <p className="text-sm text-slate-900 font-medium mb-1 group-hover:text-emerald-700 transition-colors duration-200">
                        {activeTrials} active {activeTrials === 1 ? 'trial' : 'trials'} in progress
                      </p>
                      <p className="text-xs text-slate-600">View all trials →</p>
                    </button>
                  )}

                  {criticalTickets === 0 && atRiskTrials === 0 && activeTrials === 0 && (
                    <div className="text-center py-4">
                      <p className="text-sm text-slate-600">All systems nominal</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
