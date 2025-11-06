// -nocheck
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/lib/supabase/types';
import { formatDistanceToNow, format, differenceInDays } from 'date-fns';
import toast, { Toaster } from 'react-hot-toast';
import {
  FileText, Clock, CheckCircle2, AlertTriangle, Search, Plus, TrendingUp,
  TrendingDown, Building2, Users, Rocket, Target, Zap, Star, Award,
  ArrowRight, Activity, Bot, Sparkles, Brain, ChevronRight, Calendar
} from 'lucide-react';

type Ticket = Database['public']['Tables']['tickets']['Row'];

export default function DashboardPage() {
  const { user, loading: authLoading, signOut, role } = useAuth();
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
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
        fetchRecentActivity(),
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

  const fetchRecentActivity = async () => {
    try {
      const { data, error } = await supabase
        .from('ticket_activities')
        .select('*, tickets(ticket_number, organization)')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setRecentActivity(data || []);
    } catch (error: any) {
      console.error('Error fetching recent activity:', error);
    }
  };

  const fetchUpcomingDemos = async () => {
    try {
      const today = new Date().toISOString();

      const { data, error} = await supabase
        .from('meeting_notes')
        .select(`
          *,
          trial_organizations (
            org_id,
            org_name,
            org_domain,
            account_manager_id
          )
        `)
        .eq('meeting_type', 'demo')
        .gte('meeting_date', today)
        .order('meeting_date', { ascending: true })
        .limit(10);

      if (error) throw error;
      setUpcomingDemos(data || []);
    } catch (error: any) {
      console.error('Error fetching upcoming demos:', error);
    }
  };

  if (authLoading || !user) {
    return null;
  }

  // Calculate smart metrics
  const totalTickets = tickets.length;
  const openTickets = tickets.filter((t) => !['Resolved', 'Closed'].includes(t.status)).length;
  const criticalTickets = tickets.filter((t) => t.priority === 'Critical' && !['Resolved', 'Closed'].includes(t.status)).length;
  const myTickets = tickets.filter((t) => t.assigned_to === user?.id).length;

  const activeTrials = organizations.filter((org) =>
    org.org_lifecycle_stage === 'trial_active'
  ).length;

  const hotLeads = organizations.filter((org) =>
    org.engagement_score > 75 && org.org_lifecycle_stage === 'trial_active'
  ).length;

  const atRiskTrials = organizations.filter((org) =>
    org.engagement_score < 30 && org.org_lifecycle_stage === 'trial_active'
  ).length;

  // Ending soon trials (within 7 days)
  const endingSoonTrials = organizations.filter((org) => {
    if (!org.trial_end_date || org.org_lifecycle_stage !== 'trial_active') return false;
    const daysLeft = differenceInDays(new Date(org.trial_end_date), new Date());
    return daysLeft > 0 && daysLeft <= 7;
  }).length;

  // Get greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  // Get personalized message based on role and data
  const getPersonalizedMessage = () => {
    if (criticalTickets > 0) {
      return `You have ${criticalTickets} critical ${criticalTickets === 1 ? 'ticket' : 'tickets'} that need attention 🔥`;
    }
    if (endingSoonTrials > 0) {
      return `${endingSoonTrials} trials ending soon - time to close deals! ⏰`;
    }
    if (hotLeads > 0) {
      return `${hotLeads} hot ${hotLeads === 1 ? 'lead' : 'leads'} ready to convert 🚀`;
    }
    if (openTickets === 0 && activeTrials === 0) {
      return "Everything's under control. Time to build something new! 🎯";
    }
    if (openTickets === 0) {
      return "Inbox zero achieved. You're a legend! 🏆";
    }
    return `${openTickets} tickets in progress. Keep compounding! 💪`;
  };

  // Naval-style wisdom for empty states
  const getEmptyStateWisdom = () => {
    const wisdom = [
      "Specific knowledge is found by pursuing your curiosity. Start with a ticket.",
      "Leverage comes from code, capital, and people. Create your first org.",
      "Play long-term games with long-term people. Build your pipeline.",
      "Reading is faster than listening. Writing is faster than speaking. Watch less, do more.",
    ];
    return wisdom[Math.floor(Math.random() * wisdom.length)];
  };

  return (
    <main className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Gradient background with glassmorphism */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-purple-600/5 to-pink-600/10" />
        <div className="absolute inset-0 backdrop-blur-3xl" style={{ maskImage: 'linear-gradient(to bottom, transparent, black)' }} />

        <div className="relative px-8 pt-12 pb-16">
          <div className="max-w-7xl mx-auto">
            {/* Greeting & Smart Insight */}
            <div className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-purple-900 bg-clip-text text-transparent mb-2">
                {getGreeting()}, {user?.email?.split('@')[0] || 'there'}
              </h1>
              <p className="text-lg text-slate-600 flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-500" />
                {getPersonalizedMessage()}
              </p>
            </div>

            {/* Key Metrics - Glassmorphism Cards */}
            <div className="grid grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
              {/* Active Trials */}
              <div className="group relative bg-white/60 backdrop-blur-xl border border-white/60 rounded-2xl p-6 hover:bg-white/80 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-pointer"
                   onClick={() => router.push('/support/trials')}>
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg shadow-purple-500/30">
                    <Rocket className="w-6 h-6" strokeWidth={2} />
                  </div>
                  {activeTrials > 0 && (
                    <div className="flex items-center gap-1 px-2.5 py-1 bg-purple-50 rounded-full">
                      <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                      <span className="text-xs font-bold text-purple-600">Live</span>
                    </div>
                  )}
                </div>
                <p className="text-3xl font-bold text-slate-900 mb-1">{activeTrials}</p>
                <p className="text-sm font-medium text-slate-600 mb-2">Active Trials</p>
                {hotLeads > 0 && (
                  <p className="text-xs text-purple-600 font-medium flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    {hotLeads} hot leads
                  </p>
                )}
              </div>

              {/* Critical Tickets */}
              <div className="group relative bg-white/60 backdrop-blur-xl border border-white/60 rounded-2xl p-6 hover:bg-white/80 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-pointer"
                   onClick={() => router.push('/support/tickets?priority=Critical')}>
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-lg shadow-rose-500/30">
                    <AlertTriangle className="w-6 h-6" strokeWidth={2} />
                  </div>
                  {criticalTickets > 0 && (
                    <div className="flex items-center gap-1 px-2.5 py-1 bg-rose-50 rounded-full animate-pulse">
                      <Zap className="w-3.5 h-3.5 text-rose-600" />
                      <span className="text-xs font-bold text-rose-600">Urgent</span>
                    </div>
                  )}
                </div>
                <p className="text-3xl font-bold text-slate-900 mb-1">{criticalTickets}</p>
                <p className="text-sm font-medium text-slate-600">Critical Tickets</p>
                {criticalTickets === 0 && (
                  <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    All clear!
                  </p>
                )}
              </div>

              {/* Open Tickets */}
              <div className="group relative bg-white/60 backdrop-blur-xl border border-white/60 rounded-2xl p-6 hover:bg-white/80 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-pointer"
                   onClick={() => router.push('/support/tickets')}>
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/30">
                    <Clock className="w-6 h-6" strokeWidth={2} />
                  </div>
                </div>
                <p className="text-3xl font-bold text-slate-900 mb-1">{openTickets}</p>
                <p className="text-sm font-medium text-slate-600 mb-2">Open Tickets</p>
                {myTickets > 0 && (
                  <p className="text-xs text-amber-600 font-medium">
                    {myTickets} assigned to you
                  </p>
                )}
              </div>

              {/* At Risk Trials */}
              <div className="group relative bg-white/60 backdrop-blur-xl border border-white/60 rounded-2xl p-6 hover:bg-white/80 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-pointer"
                   onClick={() => router.push('/support/trials')}>
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/30">
                    <Target className="w-6 h-6" strokeWidth={2} />
                  </div>
                </div>
                <p className="text-3xl font-bold text-slate-900 mb-1">{atRiskTrials}</p>
                <p className="text-sm font-medium text-slate-600 mb-2">At Risk</p>
                {endingSoonTrials > 0 && (
                  <p className="text-xs text-orange-600 font-medium flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {endingSoonTrials} ending soon
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="px-8 py-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-3 gap-6">
          {/* Left Column - Recent Activity Feed */}
          <div className="col-span-2 space-y-6">
            {/* Recent Tickets */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 shadow-lg overflow-hidden animate-in fade-in slide-in-from-left duration-700 delay-200">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-600" />
                  <h2 className="text-base font-bold text-slate-900">Recent Activity</h2>
                </div>
                <button
                  onClick={() => router.push('/support/tickets')}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 group"
                >
                  View All
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>

              {tickets.length === 0 ? (
                <div className="px-6 py-16 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                    <Bot className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">No tickets yet</h3>
                  <p className="text-sm text-slate-600 mb-1">{getEmptyStateWisdom()}</p>
                  <button
                    onClick={() => router.push('/support/submit')}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Create First Ticket
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {tickets.slice(0, 6).map((ticket, index) => (
                    <div
                      key={ticket.id}
                      className="px-6 py-4 hover:bg-slate-50/50 transition-colors cursor-pointer group"
                      onClick={() => router.push(`/support/tickets/${ticket.id}`)}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="flex items-start gap-4">
                        {/* Priority indicator */}
                        <div className={`w-1.5 h-1.5 rounded-full mt-2 ${
                          ticket.priority === 'Critical' ? 'bg-rose-500 animate-pulse' :
                          ticket.priority === 'High' ? 'bg-orange-500' :
                          ticket.priority === 'Medium' ? 'bg-amber-500' :
                          'bg-slate-300'
                        }`} />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                              {ticket.ticket_number}
                            </span>
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                              ticket.status === 'Open' ? 'bg-blue-100 text-blue-700' :
                              ticket.status === 'In Progress' ? 'bg-amber-100 text-amber-700' :
                              ticket.status === 'Resolved' ? 'bg-emerald-100 text-emerald-700' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {ticket.status}
                            </span>
                          </div>
                          <p className="text-sm text-slate-700 line-clamp-1 mb-1">
                            {ticket.description}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-slate-500">
                            <span>{ticket.organization}</span>
                            <span>•</span>
                            <span>{formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}</span>
                          </div>
                        </div>

                        <ArrowRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Organizations */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 shadow-lg overflow-hidden animate-in fade-in slide-in-from-left duration-700 delay-300">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-purple-600" />
                  <h2 className="text-base font-bold text-slate-900">Trial Organizations</h2>
                </div>
                <button
                  onClick={() => router.push('/support/trials')}
                  className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1 group"
                >
                  View All
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>

              {organizations.length === 0 ? (
                <div className="px-6 py-16 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center">
                    <Building2 className="w-8 h-8 text-purple-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">No organizations yet</h3>
                  <p className="text-sm text-slate-600 mb-1">Build your portfolio. Start compounding relationships.</p>
                  <button
                    onClick={() => router.push('/support/trials/new')}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Create First Organization
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {organizations.slice(0, 5).map((org, index) => (
                    <div
                      key={org.org_id}
                      className="px-6 py-4 hover:bg-slate-50/50 transition-colors cursor-pointer group"
                      onClick={() => router.push(`/support/trials/${org.org_id}`)}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="flex items-center gap-4">
                        {/* Organization logo/avatar */}
                        <div className="w-12 h-12 rounded-xl border-2 border-slate-200 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 flex-shrink-0">
                          <span className="text-sm font-bold text-slate-700">
                            {org.org_name.split(' ').map((word: string) => word[0]).join('').toUpperCase().substring(0, 2)}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 group-hover:text-purple-600 transition-colors truncate">
                            {org.org_name}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                              org.org_lifecycle_stage === 'trial_active' ? 'bg-emerald-100 text-emerald-700' :
                              org.org_lifecycle_stage === 'prospect' ? 'bg-blue-100 text-blue-700' :
                              org.org_lifecycle_stage === 'converted' ? 'bg-purple-100 text-purple-700' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {org.org_lifecycle_stage?.replace('_', ' ')}
                            </span>
                            {org.engagement_score && (
                              <span className={`text-xs font-medium ${
                                org.engagement_score >= 75 ? 'text-emerald-600' :
                                org.engagement_score >= 50 ? 'text-amber-600' :
                                'text-rose-600'
                              }`}>
                                {org.engagement_score}% engaged
                              </span>
                            )}
                          </div>
                        </div>

                        <ArrowRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Quick Actions & Insights */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 shadow-lg overflow-hidden animate-in fade-in slide-in-from-right duration-700 delay-200">
              <div className="px-6 py-4 border-b border-slate-200">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-500" />
                  Quick Actions
                </h2>
              </div>
              <div className="p-4 space-y-2">
                <button
                  onClick={() => router.push('/support/submit')}
                  className="w-full flex items-center gap-3 p-3 text-left bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 rounded-xl transition-all group"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white shadow-md">
                    <Plus className="w-5 h-5" strokeWidth={2} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900">New Ticket</p>
                    <p className="text-xs text-slate-600">Report an issue</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </button>

                <button
                  onClick={() => router.push('/support/trials/new')}
                  className="w-full flex items-center gap-3 p-3 text-left bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 rounded-xl transition-all group"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center text-white shadow-md">
                    <Building2 className="w-5 h-5" strokeWidth={2} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900">New Organization</p>
                    <p className="text-xs text-slate-600">Add trial org</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </button>

                <button
                  onClick={() => router.push('/support/reports')}
                  className="w-full flex items-center gap-3 p-3 text-left bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 rounded-xl transition-all group"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center text-white shadow-md">
                    <Activity className="w-5 h-5" strokeWidth={2} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900">View Reports</p>
                    <p className="text-xs text-slate-600">Analytics & insights</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </button>

                {/* Bulk Activity - Admin Only */}
                {role?.toLowerCase() === 'admin' && (
                  <button
                    onClick={() => router.push('/support/admin/bulk-activity')}
                    className="w-full flex items-center gap-3 p-3 text-left bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 rounded-xl transition-all group"
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg flex items-center justify-center text-white shadow-md">
                      <Calendar className="w-5 h-5" strokeWidth={2} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900">Bulk Activity Entry</p>
                      <p className="text-xs text-slate-600">Add historical notes</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                )}
              </div>
            </div>

            {/* Upcoming Demos Card - Admin Only */}
            {role?.toLowerCase() === 'admin' && (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 shadow-lg overflow-hidden animate-in fade-in slide-in-from-right duration-700 delay-250">
                <div className="px-6 py-4 border-b border-slate-200">
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Target className="w-5 h-5 text-blue-600" />
                    Upcoming Demos
                  </h2>
                </div>
                <div className="p-4">
                  {upcomingDemos.length === 0 ? (
                    <div className="text-center py-8">
                      <Target className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-sm text-slate-500">No upcoming demos scheduled</p>
                      <p className="text-xs text-slate-400 mt-1">Schedule demos from trial org pages</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                      {upcomingDemos.map((demo: any) => {
                        const demoDate = new Date(demo.meeting_date);
                        const daysUntil = differenceInDays(demoDate, new Date());
                        const isToday = daysUntil === 0;
                        const isTomorrow = daysUntil === 1;

                        return (
                          <div
                            key={demo.id}
                            className="p-3 bg-white border border-slate-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                            onClick={() => router.push(`/support/trials/${demo.org_id}`)}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="text-sm font-semibold text-slate-900 truncate">
                                    {demo.trial_organizations?.org_name || 'Unknown Org'}
                                  </h4>
                                  {isToday && (
                                    <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full animate-pulse">
                                      TODAY
                                    </span>
                                  )}
                                  {isTomorrow && (
                                    <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-bold rounded-full">
                                      TOMORROW
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-600">
                                  <Clock className="w-3 h-3" />
                                  <span>{format(demoDate, 'MMM d, yyyy • h:mm a')}</span>
                                </div>
                                {demo.conducted_by && (
                                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                                    <Users className="w-3 h-3" />
                                    <span>By: {demo.conducted_by}</span>
                                  </div>
                                )}
                                {demo.attendees && (
                                  <p className="text-xs text-slate-500 mt-1 truncate">
                                    Attendees: {demo.attendees}
                                  </p>
                                )}
                              </div>
                              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Smart Insights Card */}
            <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-right duration-700 delay-300">
              <div className="p-6 text-white">
                <div className="flex items-start gap-3 mb-4">
                  <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                    <Brain className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold mb-1">AI Insights</h3>
                    <p className="text-xs text-indigo-100">Based on your data</p>
                  </div>
                </div>

                {criticalTickets > 0 ? (
                  <div className="space-y-3">
                    <p className="text-sm">
                      You have <span className="font-bold">{criticalTickets} critical tickets</span> that need immediate attention.
                    </p>
                    <button
                      onClick={() => router.push('/support/tickets?priority=Critical')}
                      className="w-full px-4 py-2.5 bg-white hover:bg-indigo-50 text-indigo-600 text-sm font-semibold rounded-lg transition-colors shadow-lg"
                    >
                      View Critical Tickets
                    </button>
                  </div>
                ) : hotLeads > 0 ? (
                  <div className="space-y-3">
                    <p className="text-sm">
                      <span className="font-bold">{hotLeads} organizations</span> are highly engaged and ready to convert. Strike while the iron is hot!
                    </p>
                    <button
                      onClick={() => router.push('/support/trials')}
                      className="w-full px-4 py-2.5 bg-white hover:bg-indigo-50 text-indigo-600 text-sm font-semibold rounded-lg transition-colors shadow-lg"
                    >
                      View Hot Leads
                    </button>
                  </div>
                ) : endingSoonTrials > 0 ? (
                  <div className="space-y-3">
                    <p className="text-sm">
                      <span className="font-bold">{endingSoonTrials} trials</span> are ending within 7 days. Perfect time to follow up!
                    </p>
                    <button
                      onClick={() => router.push('/support/trials')}
                      className="w-full px-4 py-2.5 bg-white hover:bg-indigo-50 text-indigo-600 text-sm font-semibold rounded-lg transition-colors shadow-lg"
                    >
                      View Ending Trials
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm">
                      Everything looks good! Your team is {openTickets === 0 ? 'at inbox zero' : 'making solid progress'}. Keep compounding those wins.
                    </p>
                    <div className="flex items-center gap-2 text-xs text-indigo-100">
                      <Star className="w-4 h-4 fill-current" />
                      <span>You're doing great work!</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Fun Naval Quote Card */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 shadow-lg p-6 animate-in fade-in slide-in-from-right duration-700 delay-400">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-slate-100 rounded-lg">
                  <Sparkles className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-700 italic mb-2">
                    "{getEmptyStateWisdom()}"
                  </p>
                  <p className="text-xs text-slate-500 font-medium">— Naval Ravikant</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
