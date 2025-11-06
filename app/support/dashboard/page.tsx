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
      <div className="min-h-screen bg-[#1a1d23] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-[#3b82f6] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[#6b7280] tracking-tight">Loading command center...</p>
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
    <div className="min-h-screen bg-[#1a1d23]">
      {/* Hero Section with Glass Morphism */}
      <div className="relative overflow-hidden">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#3b82f6]/5 via-transparent to-[#10b981]/5" />

        <div className="relative max-w-[1400px] mx-auto px-8 py-12">
          {/* Greeting Section */}
          <div className="mb-12">
            <h1 className="text-[32px] leading-[40px] font-medium text-[#fafbfc] tracking-[-0.025em] mb-2">
              {greeting}, {userName}
            </h1>
            <p className="text-[14px] leading-[20px] text-[#6b7280] tracking-[-0.01em]">
              Command center · {format(new Date(), 'EEEE, MMMM d, yyyy')} · {format(new Date(), 'h:mm a')}
            </p>
          </div>

          {/* Primary Metrics Grid - Floating Glass Cards */}
          <div className="grid grid-cols-4 gap-6 mb-12">
            {/* Active Trials Card */}
            <button
              onClick={() => router.push('/support/trials')}
              className="group relative bg-white/[0.08] backdrop-blur-xl rounded-2xl border border-white/[0.12] p-6 hover:bg-white/[0.12] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_8px_32px_rgba(59,130,246,0.16)] text-left"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#3b82f6]/10 via-transparent to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <div className="relative flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#3b82f6]/10 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-[#3b82f6]" strokeWidth={1.5} />
                </div>
                <ChevronRight className="w-4 h-4 text-[#6b7280] group-hover:text-[#3b82f6] group-hover:translate-x-1 transition-all duration-300" strokeWidth={1.5} />
              </div>

              <div className="relative">
                <div className="text-[11px] leading-[16px] text-[#6b7280] tracking-[-0.01em] mb-1 uppercase font-medium">Active Trials</div>
                <div className="text-[32px] leading-[40px] font-medium text-[#fafbfc] tracking-[-0.025em]">{activeTrials}</div>
              </div>
            </button>

            {/* Critical Tickets Card */}
            <button
              onClick={() => router.push('/support/tickets?priority=critical')}
              className="group relative bg-white/[0.08] backdrop-blur-xl rounded-2xl border border-white/[0.12] p-6 hover:bg-white/[0.12] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_8px_32px_rgba(245,158,11,0.16)] text-left"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#f59e0b]/10 via-transparent to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <div className="relative flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#f59e0b]/10 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-[#f59e0b]" strokeWidth={1.5} />
                </div>
                {criticalTickets > 0 && (
                  <div className="w-2 h-2 bg-[#f59e0b] rounded-full animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
                )}
              </div>

              <div className="relative">
                <div className="text-[11px] leading-[16px] text-[#6b7280] tracking-[-0.01em] mb-1 uppercase font-medium">Critical</div>
                <div className="text-[32px] leading-[40px] font-medium text-[#fafbfc] tracking-[-0.025em]">{criticalTickets}</div>
              </div>
            </button>

            {/* Open Tickets Card */}
            <button
              onClick={() => router.push('/support/tickets')}
              className="group relative bg-white/[0.08] backdrop-blur-xl rounded-2xl border border-white/[0.12] p-6 hover:bg-white/[0.12] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_8px_32px_rgba(59,130,246,0.16)] text-left"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#3b82f6]/10 via-transparent to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <div className="relative flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#3b82f6]/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-[#3b82f6]" strokeWidth={1.5} />
                </div>
                <ChevronRight className="w-4 h-4 text-[#6b7280] group-hover:text-[#3b82f6] group-hover:translate-x-1 transition-all duration-300" strokeWidth={1.5} />
              </div>

              <div className="relative">
                <div className="text-[11px] leading-[16px] text-[#6b7280] tracking-[-0.01em] mb-1 uppercase font-medium">Open Tickets</div>
                <div className="text-[32px] leading-[40px] font-medium text-[#fafbfc] tracking-[-0.025em]">{openTickets}</div>
              </div>
            </button>

            {/* At Risk Trials Card */}
            <div className="relative bg-white/[0.08] backdrop-blur-xl rounded-2xl border border-white/[0.12] p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#f59e0b]/10 flex items-center justify-center">
                  <Target className="w-5 h-5 text-[#f59e0b]" strokeWidth={1.5} />
                </div>
                {atRiskTrials > 0 && (
                  <div className="px-2 py-0.5 bg-[#f59e0b]/10 border border-[#f59e0b]/20 rounded-md">
                    <span className="text-[10px] leading-[14px] text-[#f59e0b] font-medium tracking-[-0.01em]">7D</span>
                  </div>
                )}
              </div>

              <div>
                <div className="text-[11px] leading-[16px] text-[#6b7280] tracking-[-0.01em] mb-1 uppercase font-medium">Ending Soon</div>
                <div className="text-[32px] leading-[40px] font-medium text-[#fafbfc] tracking-[-0.025em]">{atRiskTrials}</div>
              </div>
            </div>
          </div>

          {/* Two-Column Layout */}
          <div className="grid grid-cols-12 gap-6">
            {/* Left Column - Activity Feed */}
            <div className="col-span-8 space-y-6">
              {/* Recent Activity */}
              <div className="relative bg-white/[0.08] backdrop-blur-xl rounded-2xl border border-white/[0.12] p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#3b82f6]/10 flex items-center justify-center">
                      <Activity className="w-4 h-4 text-[#3b82f6]" strokeWidth={1.5} />
                    </div>
                    <h2 className="text-[14px] leading-[20px] font-medium text-[#fafbfc] tracking-[-0.01em]">Recent Activity</h2>
                  </div>
                  <button
                    onClick={() => router.push('/support/tickets')}
                    className="text-[12px] leading-[16px] text-[#6b7280] hover:text-[#3b82f6] font-medium transition-colors duration-200 flex items-center gap-1"
                  >
                    View all
                    <ArrowRight className="w-3 h-3" strokeWidth={1.5} />
                  </button>
                </div>

                {recentActivity.length === 0 ? (
                  <div className="py-12 text-center">
                    <div className="w-12 h-12 rounded-xl bg-white/[0.04] flex items-center justify-center mx-auto mb-3">
                      <Sparkles className="w-6 h-6 text-[#6b7280]" strokeWidth={1.5} />
                    </div>
                    <p className="text-[13px] leading-[18px] text-[#6b7280]">All clear. No active tickets.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recentActivity.map((activity, idx) => (
                      <button
                        key={activity.id}
                        onClick={() => router.push(`/support/tickets/${activity.id}`)}
                        className="group w-full text-left px-4 py-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.04] hover:border-white/[0.08] transition-all duration-200"
                        style={{ animationDelay: `${idx * 50}ms` }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {activity.priority === 'critical' && (
                                <div className="w-1.5 h-1.5 bg-[#f59e0b] rounded-full animate-pulse" />
                              )}
                              <p className="text-[13px] leading-[18px] text-[#fafbfc] font-medium truncate group-hover:text-[#3b82f6] transition-colors duration-200">
                                {activity.title}
                              </p>
                            </div>
                            <p className="text-[11px] leading-[16px] text-[#6b7280]">
                              {formatDistanceToNow(new Date(activity.created), { addSuffix: true })}
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-[#6b7280] group-hover:text-[#3b82f6] group-hover:translate-x-1 transition-all duration-200 flex-shrink-0" strokeWidth={1.5} />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="relative bg-white/[0.08] backdrop-blur-xl rounded-2xl border border-white/[0.12] p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 rounded-lg bg-[#3b82f6]/10 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-[#3b82f6]" strokeWidth={1.5} />
                  </div>
                  <h2 className="text-[14px] leading-[20px] font-medium text-[#fafbfc] tracking-[-0.01em]">Quick Actions</h2>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => router.push('/support/trials')}
                    className="group relative bg-white/[0.04] hover:bg-white/[0.08] rounded-xl p-4 border border-white/[0.04] hover:border-white/[0.08] transition-all duration-200 text-left"
                  >
                    <Building2 className="w-5 h-5 text-[#3b82f6] mb-2" strokeWidth={1.5} />
                    <p className="text-[13px] leading-[18px] text-[#fafbfc] font-medium mb-0.5">Trial Organizations</p>
                    <p className="text-[11px] leading-[16px] text-[#6b7280]">Manage active trials</p>
                  </button>

                  <button
                    onClick={() => router.push('/support/tickets')}
                    className="group relative bg-white/[0.04] hover:bg-white/[0.08] rounded-xl p-4 border border-white/[0.04] hover:border-white/[0.08] transition-all duration-200 text-left"
                  >
                    <FileText className="w-5 h-5 text-[#3b82f6] mb-2" strokeWidth={1.5} />
                    <p className="text-[13px] leading-[18px] text-[#fafbfc] font-medium mb-0.5">Support Tickets</p>
                    <p className="text-[11px] leading-[16px] text-[#6b7280]">View all tickets</p>
                  </button>

                  <button
                    onClick={() => router.push('/support/reports')}
                    className="group relative bg-white/[0.04] hover:bg-white/[0.08] rounded-xl p-4 border border-white/[0.04] hover:border-white/[0.08] transition-all duration-200 text-left"
                  >
                    <TrendingUp className="w-5 h-5 text-[#3b82f6] mb-2" strokeWidth={1.5} />
                    <p className="text-[13px] leading-[18px] text-[#fafbfc] font-medium mb-0.5">Analytics</p>
                    <p className="text-[11px] leading-[16px] text-[#6b7280]">Performance insights</p>
                  </button>

                  {role?.toLowerCase() === 'admin' && (
                    <button
                      onClick={() => router.push('/support/admin/roadmap')}
                      className="group relative bg-white/[0.04] hover:bg-white/[0.08] rounded-xl p-4 border border-white/[0.04] hover:border-white/[0.08] transition-all duration-200 text-left"
                    >
                      <Target className="w-5 h-5 text-[#3b82f6] mb-2" strokeWidth={1.5} />
                      <p className="text-[13px] leading-[18px] text-[#fafbfc] font-medium mb-0.5">Roadmap</p>
                      <p className="text-[11px] leading-[16px] text-[#6b7280]">Product planning</p>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Upcoming Demos & Insights */}
            <div className="col-span-4 space-y-6">
              {/* Upcoming Demos */}
              {role?.toLowerCase() === 'admin' && upcomingDemos.length > 0 && (
                <div className="relative bg-white/[0.08] backdrop-blur-xl rounded-2xl border border-white/[0.12] p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 rounded-lg bg-[#3b82f6]/10 flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-[#3b82f6]" strokeWidth={1.5} />
                    </div>
                    <h2 className="text-[14px] leading-[20px] font-medium text-[#fafbfc] tracking-[-0.01em]">Upcoming Demos</h2>
                  </div>

                  <div className="space-y-3">
                    {upcomingDemos.slice(0, 4).map((demo, idx) => {
                      const demoDate = new Date(demo.meeting_date);
                      const isToday = format(demoDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                      const isTomorrow = differenceInDays(demoDate, new Date()) === 1;

                      return (
                        <button
                          key={demo.meeting_id}
                          onClick={() => router.push(`/support/trials/${demo.org_id}`)}
                          className="group w-full text-left p-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.04] hover:border-white/[0.08] transition-all duration-200"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <p className="text-[13px] leading-[18px] text-[#fafbfc] font-medium group-hover:text-[#3b82f6] transition-colors duration-200">
                              {(demo.trial_organizations as any)?.org_name || 'Unknown Org'}
                            </p>
                            {isToday && (
                              <span className="px-2 py-0.5 bg-[#3b82f6]/10 border border-[#3b82f6]/20 rounded text-[10px] leading-[14px] text-[#3b82f6] font-medium">
                                TODAY
                              </span>
                            )}
                            {isTomorrow && (
                              <span className="px-2 py-0.5 bg-[#f59e0b]/10 border border-[#f59e0b]/20 rounded text-[10px] leading-[14px] text-[#f59e0b] font-medium">
                                TMR
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] leading-[16px] text-[#6b7280]">
                            {format(demoDate, 'MMM d, yyyy')} · {demo.conducted_by}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* AI Insights */}
              <div className="relative bg-gradient-to-br from-[#7c3aed]/10 via-white/[0.08] to-[#ec4899]/10 backdrop-blur-xl rounded-2xl border border-white/[0.12] p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-[#7c3aed]/10 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-[#7c3aed]" strokeWidth={1.5} />
                  </div>
                  <h2 className="text-[14px] leading-[20px] font-medium text-[#fafbfc] tracking-[-0.01em]">Insights</h2>
                </div>

                <div className="space-y-3">
                  {criticalTickets > 0 && (
                    <button
                      onClick={() => router.push('/support/tickets?priority=critical')}
                      className="w-full text-left p-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.04] hover:border-white/[0.08] transition-all duration-200 group"
                    >
                      <p className="text-[13px] leading-[18px] text-[#fafbfc] font-medium mb-1 group-hover:text-[#f59e0b] transition-colors duration-200">
                        {criticalTickets} critical {criticalTickets === 1 ? 'issue' : 'issues'} need attention
                      </p>
                      <p className="text-[11px] leading-[16px] text-[#6b7280]">Review critical tickets →</p>
                    </button>
                  )}

                  {atRiskTrials > 0 && (
                    <button
                      onClick={() => router.push('/support/trials')}
                      className="w-full text-left p-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.04] hover:border-white/[0.08] transition-all duration-200 group"
                    >
                      <p className="text-[13px] leading-[18px] text-[#fafbfc] font-medium mb-1 group-hover:text-[#f59e0b] transition-colors duration-200">
                        {atRiskTrials} {atRiskTrials === 1 ? 'trial ends' : 'trials end'} within 7 days
                      </p>
                      <p className="text-[11px] leading-[16px] text-[#6b7280]">Check trial status →</p>
                    </button>
                  )}

                  {activeTrials > 0 && (
                    <button
                      onClick={() => router.push('/support/trials')}
                      className="w-full text-left p-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.04] hover:border-white/[0.08] transition-all duration-200 group"
                    >
                      <p className="text-[13px] leading-[18px] text-[#fafbfc] font-medium mb-1 group-hover:text-[#10b981] transition-colors duration-200">
                        {activeTrials} active {activeTrials === 1 ? 'trial' : 'trials'} in progress
                      </p>
                      <p className="text-[11px] leading-[16px] text-[#6b7280]">View all trials →</p>
                    </button>
                  )}

                  {criticalTickets === 0 && atRiskTrials === 0 && activeTrials === 0 && (
                    <div className="text-center py-4">
                      <p className="text-[13px] leading-[18px] text-[#6b7280]">All systems nominal</p>
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
